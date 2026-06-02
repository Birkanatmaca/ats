import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  BookOpen,
  FileText,
  GraduationCap,
  ShieldAlert,
  ShieldCheck
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { GuidanceStudentOgtaAiStrip } from "@/features/guidance/GuidanceStudentOgtaAiStrip";
import { GuidanceStudentCaseTab } from "@/features/guidance/GuidanceStudentCaseTab";
import {
  buildGuidanceRiskSignals,
  buildGuidanceStudentSupports,
  supportStatusLabel
} from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { GuidanceNote, Observation } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { categoryLabel, formatDate } from "@/shared/utils/labels";

const NOTE_TYPES = [
  { value: "meeting", label: "Görüşme" },
  { value: "follow_up", label: "Takip" },
  { value: "observation", label: "Gözlem" }
] as const;

type NotesFilter = "all" | "guidance" | "teacher";

type UnifiedNote = {
  id: string;
  kind: "guidance" | "teacher";
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  meta: string;
};

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function guidanceNoteTypeLabel(value: string) {
  return NOTE_TYPES.find((item) => item.value === value)?.label ?? value;
}

function toGuidanceEntry(note: GuidanceNote): UnifiedNote {
  return {
    id: `g-${note.id}`,
    kind: "guidance",
    title: note.title,
    body: note.body,
    authorName: note.authorName,
    createdAt: note.createdAt,
    meta: guidanceNoteTypeLabel(note.noteType)
  };
}

function toTeacherEntry(observation: Observation): UnifiedNote {
  return {
    id: `t-${observation.id}`,
    kind: "teacher",
    title: categoryLabel(observation.category),
    body: observation.note?.trim() || "Not girilmemiş.",
    authorName: observation.authorName,
    createdAt: observation.createdAt,
    meta: "Öğretmen gözlemi"
  };
}

export function GuidanceStudentScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const queryClient = useQueryClient();
  const [notesFilter, setNotesFilter] = useState<NotesFilter>("all");
  const [noteType, setNoteType] = useState("meeting");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(true);
  const [studentTab, setStudentTab] = useState<"overview" | "case">("overview");

  const studentsQ = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });
  const notesQ = useQuery({
    queryKey: [...queryKeys.guidanceNotes, studentId],
    queryFn: () => api.guidanceNotes(studentId!),
    enabled: Boolean(studentId)
  });
  const obsQ = useQuery({ queryKey: queryKeys.guidanceObservations, queryFn: () => api.observationsFiltered() });
  const trackingQ = useQuery({
    queryKey: [...queryKeys.guidanceRiskTrackings, studentId],
    queryFn: () => api.guidanceRiskTrackings(studentId!),
    enabled: Boolean(studentId)
  });

  const tracking = trackingQ.data?.[0] ?? null;

  const student = useMemo(
    () => (studentsQ.data ?? []).find((item) => item.id === studentId) ?? null,
    [studentsQ.data, studentId]
  );

  const observations = useMemo(
    () => (obsQ.data ?? []).filter((item) => item.studentId === studentId),
    [obsQ.data, studentId]
  );

  const risks = useMemo(
    () => buildGuidanceRiskSignals(observations).filter((item) => item.studentId === studentId),
    [observations, studentId]
  );

  const support = useMemo(
    () => buildGuidanceStudentSupports(observations).find((item) => item.studentId === studentId),
    [observations, studentId]
  );

  const guidanceNotes = notesQ.data ?? [];

  const unifiedNotes = useMemo(() => {
    const entries = [...guidanceNotes.map(toGuidanceEntry), ...observations.map(toTeacherEntry)];
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [guidanceNotes, observations]);

  const filteredNotes = useMemo(() => {
    if (notesFilter === "all") return unifiedNotes;
    if (notesFilter === "guidance") return unifiedNotes.filter((item) => item.kind === "guidance");
    return unifiedNotes.filter((item) => item.kind === "teacher");
  }, [unifiedNotes, notesFilter]);

  const stats = useMemo(
    () => ({
      total: unifiedNotes.length,
      guidance: guidanceNotes.length,
      teacher: observations.length,
      signals: risks.length,
      tracked: tracking ? 1 : 0
    }),
    [unifiedNotes.length, guidanceNotes.length, observations.length, risks.length, tracking]
  );

  const addTrackingMut = useMutation({
    mutationFn: () => api.createGuidanceRiskTracking({ studentId: studentId!, reason: "" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceRiskTrackings })
  });

  const removeTrackingMut = useMutation({
    mutationFn: () => api.deleteGuidanceRiskTracking(tracking!.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceRiskTrackings })
  });

  const createNoteMut = useMutation({
    mutationFn: () =>
      api.createGuidanceNote({
        studentId: studentId!,
        noteType,
        title: noteTitle.trim(),
        body: noteBody.trim()
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceNotes });
      setNoteTitle("");
      setNoteBody("");
      setFormError(null);
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Not kaydedilemedi.")
  });

  const refreshing = studentsQ.isRefetching || notesQ.isRefetching || obsQ.isRefetching || trackingQ.isRefetching;
  const onRefresh = () => {
    void studentsQ.refetch();
    void notesQ.refetch();
    void obsQ.refetch();
    void trackingQ.refetch();
  };

  if (studentsQ.isLoading || notesQ.isLoading) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Öğrenciler" />
        <LoadingBlock />
      </Screen>
    );
  }

  if (!student) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Öğrenciler" />
        <EmptyState message="Öğrenci kaydı bulunamadı veya erişim yetkiniz yok." title="Öğrenci bulunamadı" />
      </Screen>
    );
  }

  const supportStatus = support?.status ?? "untracked";

  return (
    <Screen layout="stack" refreshing={refreshing} onRefresh={onRefresh}>
      <DetailBackBar label="Öğrenciler" />

      <View style={styles.heroShell}>
        <View
          style={[
            styles.hero,
            platformShadow("0 14px 32px rgba(124,58,237,0.22)", {
              shadowColor: "#7c3aed",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              elevation: 8
            })
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{studentInitials(student.fullName)}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{student.fullName}</Text>
              <Text style={styles.heroSubtitle}>
                {student.className} · No {student.schoolNumber}
              </Text>
              <Text style={styles.heroMeta}>{supportStatusLabel(supportStatus)}</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.total}</Text>
              <Text style={styles.heroMetaLabel}>toplam not</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.guidance}</Text>
              <Text style={styles.heroMetaLabel}>rehberlik</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.teacher}</Text>
              <Text style={styles.heroMetaLabel}>öğretmen</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={[styles.heroMetaValue, stats.signals > 0 && styles.heroMetaDanger]}>{stats.signals}</Text>
              <Text style={styles.heroMetaLabel}>uyarı</Text>
            </View>
          </View>

          <Pressable
            disabled={addTrackingMut.isPending || removeTrackingMut.isPending}
            onPress={() => (tracking ? removeTrackingMut.mutate() : addTrackingMut.mutate())}
            style={[styles.trackingBtn, tracking && styles.trackingBtnActive]}
          >
            {tracking ? (
              <>
                <ShieldCheck color="#fff" size={16} strokeWidth={2.2} />
                <Text style={styles.trackingBtnTextActive}>Risk takibinden çıkar</Text>
              </>
            ) : (
              <>
                <ShieldAlert color="#fff" size={16} strokeWidth={2.2} />
                <Text style={styles.trackingBtnTextActive}>Risk takibine al</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <GuidanceStudentOgtaAiStrip
        guidanceNotes={stats.guidance}
        riskCount={stats.signals}
        studentName={student.fullName}
        teacherNotes={stats.teacher}
        totalNotes={stats.total}
      />

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setStudentTab("overview")}
          style={[styles.tabBtn, studentTab === "overview" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabBtnText, studentTab === "overview" && styles.tabBtnTextActive]}>Genel</Text>
        </Pressable>
        <Pressable
          onPress={() => setStudentTab("case")}
          style={[styles.tabBtn, studentTab === "case" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabBtnText, studentTab === "case" && styles.tabBtnTextActive]}>Vaka dosyası</Text>
        </Pressable>
      </View>

      {studentTab === "case" && studentId ? <GuidanceStudentCaseTab studentId={studentId} /> : null}

      {studentTab === "overview" ? (
        <>
      {notesQ.isError ? <ErrorState message={notesQ.error.message} onRetry={() => void notesQ.refetch()} /> : null}
      {obsQ.isError ? <ErrorState message={obsQ.error.message} onRetry={() => void obsQ.refetch()} /> : null}

      {tracking ? (
        <View style={styles.trackedBanner}>
          <ShieldCheck color="#047857" size={16} strokeWidth={2.2} />
          <Text style={styles.trackedBannerText}>Bu öğrenci rehberlik risk takibinde.</Text>
        </View>
      ) : risks.length > 0 ? (
        <View style={styles.riskBanner}>
          <AlertTriangle color="#b91c1c" size={16} strokeWidth={2.2} />
          <Text style={styles.riskBannerText}>
            {risks.length} öğretmen sinyali var — inceleyip risk takibine alabilirsiniz.
          </Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Pressable onPress={() => setFormOpen((current) => !current)} style={styles.formHead}>
          <FileText color="#7c3aed" size={18} strokeWidth={2.2} />
          <Text style={styles.formHeadTitle}>Rehberlik notu ekle</Text>
          <Text style={styles.formHeadAction}>{formOpen ? "Gizle" : "Göster"}</Text>
        </Pressable>

        {formOpen ? (
          <View style={styles.formBody}>
            <Text style={styles.formLabel}>Not türü</Text>
            <View style={styles.chipRow}>
              {NOTE_TYPES.map((type) => (
                <Pressable
                  key={type.value}
                  onPress={() => setNoteType(type.value)}
                  style={[styles.chip, noteType === type.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, noteType === type.value && styles.chipTextActive]}>{type.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput onChangeText={setNoteTitle} placeholder="Başlık" style={styles.input} value={noteTitle} />
            <TextInput
              multiline
              onChangeText={setNoteBody}
              placeholder="Rehberlik notu içeriği"
              style={[styles.input, styles.textArea]}
              value={noteBody}
            />
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <Pressable
              disabled={!noteTitle.trim() || noteBody.trim().length < 3 || createNoteMut.isPending}
              onPress={() => createNoteMut.mutate()}
              style={[styles.submitBtn, (!noteTitle.trim() || noteBody.trim().length < 3) && styles.submitBtnDisabled]}
            >
              {createNoteMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Notu kaydet</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.listHead}>
        <Text style={styles.listTitle}>Tüm notlar</Text>
        <Text style={styles.listCount}>{filteredNotes.length} kayıt</Text>
      </View>

      <View style={styles.filterRow}>
        <FilterChip active={notesFilter === "all"} label={`Tümü (${stats.total})`} onPress={() => setNotesFilter("all")} />
        <FilterChip
          active={notesFilter === "guidance"}
          label={`Rehberlik (${stats.guidance})`}
          onPress={() => setNotesFilter("guidance")}
        />
        <FilterChip
          active={notesFilter === "teacher"}
          label={`Öğretmen (${stats.teacher})`}
          onPress={() => setNotesFilter("teacher")}
        />
      </View>

      {filteredNotes.length === 0 ? (
        <EmptyState
          message={
            stats.total === 0
              ? "Bu öğrenci için henüz rehberlik veya öğretmen notu yok. Yukarıdan not ekleyebilirsiniz."
              : "Seçili filtreye uyan not bulunamadı."
          }
          title={stats.total === 0 ? "Not yok" : "Sonuç bulunamadı"}
        />
      ) : (
        filteredNotes.map((entry) => <NoteCard key={entry.id} entry={entry} />)
      )}
        </>
      ) : null}
    </Screen>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function NoteCard({ entry }: { entry: UnifiedNote }) {
  const isGuidance = entry.kind === "guidance";
  const Icon = isGuidance ? FileText : GraduationCap;
  const accent = isGuidance ? "#7c3aed" : "#2563eb";
  const surface = isGuidance ? "#faf5ff" : "#eff6ff";
  const border = isGuidance ? "#ddd6fe" : "#bfdbfe";

  return (
    <View style={[styles.noteCard, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.noteTop}>
        <View style={[styles.noteIcon, { backgroundColor: `${accent}18` }]}>
          <Icon color={accent} size={15} strokeWidth={2.2} />
        </View>
        <View style={styles.noteCopy}>
          <View style={styles.noteTitleRow}>
            <Text style={styles.noteTitle}>{entry.title}</Text>
            <View style={[styles.kindBadge, { backgroundColor: `${accent}20` }]}>
              <Text style={[styles.kindBadgeText, { color: accent }]}>
                {isGuidance ? "Rehberlik" : "Öğretmen"}
              </Text>
            </View>
          </View>
          <Text style={styles.noteMeta}>
            {entry.authorName} · {entry.meta} · {formatDate(entry.createdAt)}
          </Text>
        </View>
      </View>
      <Text style={styles.noteBody}>{entry.body}</Text>
      {!isGuidance ? (
        <View style={styles.teacherHint}>
          <BookOpen color="#2563eb" size={12} strokeWidth={2.2} />
          <Text style={styles.teacherHintText}>Öğretmen gözlem kaydı</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginHorizontal: -4, marginBottom: 12 },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  tabBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f8fafc"
  },
  tabBtnActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  tabBtnText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  tabBtnTextActive: { color: "#fff" },
  hero: {
    backgroundColor: "#7c3aed",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)"
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  heroCopy: { flex: 1, gap: 3 },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  heroSubtitle: { color: "rgba(255,255,255,0.86)", fontSize: 13, fontWeight: "600" },
  heroMeta: { color: "rgba(237,233,254,0.9)", fontSize: 12, fontWeight: "700" },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6
  },
  heroMetaPill: { flex: 1, alignItems: "center", gap: 2 },
  heroMetaValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  heroMetaDanger: { color: "#fecaca" },
  heroMetaLabel: { color: "rgba(255,255,255,0.72)", fontSize: 9, fontWeight: "600", textAlign: "center" },
  heroMetaDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.18)" },
  riskBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  riskBannerText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#b91c1c" },
  trackedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  trackedBannerText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#047857" },
  trackingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#b91c1c",
    borderRadius: 14,
    paddingVertical: 12
  },
  trackingBtnActive: { backgroundColor: "#047857" },
  trackingBtnTextActive: { color: "#fff", fontSize: 14, fontWeight: "800" },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    overflow: "hidden"
  },
  formHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.background
  },
  formHeadTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.text },
  formHeadAction: { fontSize: 12, fontWeight: "700", color: "#7c3aed" },
  formBody: { padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  formLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background
  },
  chipActive: { backgroundColor: "#faf5ff", borderColor: "#7c3aed" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#6d28d9" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background
  },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  errorText: { fontSize: 12, fontWeight: "600", color: colors.danger },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#7c3aed"
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  listTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  listCount: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background
  },
  filterChipActive: { backgroundColor: "#faf5ff", borderColor: "#7c3aed" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  filterChipTextActive: { color: "#6d28d9" },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 10
  },
  noteTop: { flexDirection: "row", gap: 10 },
  noteIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  noteCopy: { flex: 1, gap: 4 },
  noteTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.text },
  kindBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  kindBadgeText: { fontSize: 10, fontWeight: "800" },
  noteMeta: { fontSize: 11, fontWeight: "600", color: colors.textMuted, lineHeight: 16 },
  noteBody: { fontSize: 14, color: colors.text, lineHeight: 20, fontWeight: "500" },
  teacherHint: { flexDirection: "row", alignItems: "center", gap: 6 },
  teacherHintText: { fontSize: 11, fontWeight: "700", color: "#2563eb" }
});
