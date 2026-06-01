import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronUp,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GuidanceNoteCreateSheet } from "@/features/guidance/GuidanceNoteCreateSheet";
import { GuidanceNoteEditSheet } from "@/features/guidance/GuidanceNoteEditSheet";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { GuidanceNote } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { formatDate, sensitivityLabel } from "@/shared/utils/labels";

const NOTE_TYPES = [
  { value: "meeting", label: "Görüşme", accent: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
  { value: "follow_up", label: "Takip", accent: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  { value: "observation", label: "Gözlem", accent: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" }
] as const;

type TypeFilter = "" | (typeof NOTE_TYPES)[number]["value"];

function noteTypeMeta(value: string) {
  return NOTE_TYPES.find((item) => item.value === value) ?? NOTE_TYPES[0];
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return `${diffDays} gün önce`;
  return formatDate(value);
}

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function computeStats(notes: GuidanceNote[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = notes.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length;
  const students = new Set(notes.map((item) => item.studentId)).size;
  const meeting = notes.filter((item) => item.noteType === "meeting").length;
  return { total: notes.length, recent, students, meeting };
}

export function GuidanceNotesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<GuidanceNote | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState("");

  const notesQ = useQuery({ queryKey: queryKeys.guidanceNotes, queryFn: () => api.guidanceNotes() });
  const studentsQ = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });

  const notes = notesQ.data ?? [];
  const stats = useMemo(() => computeStats(notes), [notes]);

  const studentOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const note of notes) {
      names.set(note.studentId, note.studentName);
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...notes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((item) => {
        if (typeFilter && item.noteType !== typeFilter) return false;
        if (studentFilter && item.studentId !== studentFilter) return false;
        if (!q) return true;
        const blob = `${item.studentName} ${item.className} ${item.title} ${item.body} ${item.authorName}`.toLowerCase();
        return blob.includes(q);
      });
  }, [notes, search, typeFilter, studentFilter]);

  const activeFilterCount = Number(Boolean(typeFilter)) + Number(Boolean(studentFilter));
  const hasActiveFilters = Boolean(search.trim() || typeFilter || studentFilter);

  const createMut = useMutation({
    mutationFn: (payload: { studentId: string; noteType: string; title: string; body: string }) =>
      api.createGuidanceNote(payload),
    onSuccess: () => {
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceNotes });
    },
    onError: (err) => {
      setCreateError(err instanceof Error ? err.message : "Not kaydedilemedi.");
    }
  });

  const updateMut = useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: { noteType: string; title: string; body: string } }) =>
      api.updateGuidanceNote(noteId, payload),
    onSuccess: () => {
      setEditError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceNotes });
    },
    onError: (err) => setEditError(err instanceof Error ? err.message : "Not güncellenemedi.")
  });

  const deleteMut = useMutation({
    mutationFn: api.deleteGuidanceNote,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceNotes })
  });

  async function handleCreate(payload: { studentId: string; noteType: string; title: string; body: string }) {
    setCreateError(null);
    await createMut.mutateAsync(payload);
  }

  function confirmDelete(note: GuidanceNote) {
    Alert.alert("Notu sil", `"${note.title}" notunu silmek istediğinize emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteMut.mutate(note.id) }
    ]);
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter("");
    setStudentFilter("");
  }

  if (notesQ.isLoading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <>
      <Screen refreshing={notesQ.isRefetching} topInsetExtra={6} onRefresh={() => void notesQ.refetch()}>
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
              <View style={styles.heroIconWrap}>
                <NotebookPen color="#fff" size={22} strokeWidth={2.2} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Rehberlik notları</Text>
                <Text style={styles.heroSubtitle}>Görüşme, takip ve gözlem kayıtları</Text>
              </View>
            </View>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaPill}>
                <Text style={styles.heroMetaValue}>{stats.total}</Text>
                <Text style={styles.heroMetaLabel}>toplam</Text>
              </View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaPill}>
                <Text style={styles.heroMetaValue}>{stats.recent}</Text>
                <Text style={styles.heroMetaLabel}>son 7 gün</Text>
              </View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaPill}>
                <Text style={styles.heroMetaValue}>{stats.students}</Text>
                <Text style={styles.heroMetaLabel}>öğrenci</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
              style={({ pressed }) => [styles.heroAddBtn, pressed && styles.heroAddBtnPressed]}
            >
              <Plus color="#fff" size={18} strokeWidth={2.4} />
              <Text style={styles.heroAddBtnText}>Yeni not ekle</Text>
            </Pressable>
          </View>
        </View>

        {notesQ.isError ? <ErrorState message={notesQ.error.message} onRetry={() => void notesQ.refetch()} /> : null}

        {!notesQ.isError ? (
          <>
            <View style={styles.filtersCard}>
              <View style={styles.searchFilterRow}>
                <View style={styles.searchWrap}>
                  <Search color={colors.textMuted} size={18} strokeWidth={2} />
                  <TextInput
                    onChangeText={setSearch}
                    placeholder="Öğrenci, başlık veya not ara..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.searchInput}
                    value={search}
                  />
                </View>

                <Pressable
                  onPress={() => setFiltersOpen((current) => !current)}
                  style={({ pressed }) => [
                    styles.filterBtn,
                    (filtersOpen || activeFilterCount > 0) && styles.filterBtnActive,
                    pressed && styles.filterBtnPressed
                  ]}
                >
                  <SlidersHorizontal
                    color={filtersOpen || activeFilterCount > 0 ? "#7c3aed" : colors.textMuted}
                    size={18}
                    strokeWidth={2.2}
                  />
                  {activeFilterCount > 0 ? (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>

              {filtersOpen ? (
                <View style={styles.filtersPanel}>
                  <Text style={styles.filterLabel}>Not türü</Text>
                  <View style={styles.chipRow}>
                    <FilterChip active={!typeFilter} label="Tümü" onPress={() => setTypeFilter("")} />
                    {NOTE_TYPES.map((type) => (
                      <FilterChip
                        key={type.value}
                        active={typeFilter === type.value}
                        label={type.label}
                        onPress={() => setTypeFilter(type.value)}
                      />
                    ))}
                  </View>

                  {studentOptions.length > 0 ? (
                    <>
                      <Text style={styles.filterLabel}>Öğrenci</Text>
                      <View style={styles.chipRow}>
                        <FilterChip active={!studentFilter} label="Tümü" onPress={() => setStudentFilter("")} />
                        {studentOptions.slice(0, 10).map((student) => (
                          <FilterChip
                            key={student.id}
                            active={studentFilter === student.id}
                            label={student.name.split(" ")[0] ?? student.name}
                            onPress={() => setStudentFilter(student.id)}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}

                  {hasActiveFilters ? (
                    <Pressable onPress={clearFilters} style={styles.clearFiltersBtn}>
                      <Text style={styles.clearFiltersText}>Filtreleri temizle</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.listHead}>
              <Text style={styles.listTitle}>Not listesi</Text>
              <Text style={styles.listCount}>{filtered.length} kayıt</Text>
            </View>

            {filtered.length === 0 ? (
              <EmptyState
                message={
                  notes.length === 0
                    ? "Henüz rehberlik notu yok. Yeni not ekleyerek başlayın."
                    : "Arama veya filtreye uyan not bulunamadı."
                }
                title={notes.length === 0 ? "Not yok" : "Sonuç bulunamadı"}
              />
            ) : (
              filtered.map((note) => (
                <NoteCard
                  key={note.id}
                  expanded={expandedId === note.id}
                  note={note}
                  onDelete={() => confirmDelete(note)}
                  onEdit={() => setEditNote(note)}
                  onOpenStudent={() => router.push(`/(app)/guidance/students/${note.studentId}`)}
                  onToggle={() => setExpandedId((current) => (current === note.id ? null : note.id))}
                />
              ))
            )}
          </>
        ) : null}
      </Screen>

      <GuidanceNoteCreateSheet
        error={createError}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        saving={createMut.isPending}
        students={studentsQ.data ?? []}
        visible={createOpen}
      />

      <GuidanceNoteEditSheet
        error={editError}
        note={editNote}
        onClose={() => setEditNote(null)}
        onSubmit={async (payload) => {
          await updateMut.mutateAsync({ noteId: editNote!.id, payload });
        }}
        saving={updateMut.isPending}
        visible={Boolean(editNote)}
      />
    </>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function NoteCard({
  note,
  expanded,
  onToggle,
  onOpenStudent,
  onEdit,
  onDelete
}: {
  note: GuidanceNote;
  expanded: boolean;
  onToggle: () => void;
  onOpenStudent: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const type = noteTypeMeta(note.noteType);
  const isSensitive = note.sensitivity === "sensitive_student" || note.sensitivity === "guidance_confidential";

  return (
    <View style={[styles.noteCard, { backgroundColor: type.bg, borderColor: type.border }]}>
      <Pressable onPress={onToggle} style={styles.noteHead}>
        <View style={[styles.noteAvatar, { backgroundColor: `${type.accent}18` }]}>
          <Text style={[styles.noteAvatarText, { color: type.accent }]}>{studentInitials(note.studentName)}</Text>
        </View>

        <View style={styles.noteMain}>
          <View style={styles.noteTitleRow}>
            <Text numberOfLines={expanded ? undefined : 1} style={styles.noteTitle}>
              {note.title}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: `${type.accent}20` }]}>
              <Text style={[styles.typeBadgeText, { color: type.accent }]}>{type.label}</Text>
            </View>
          </View>

          <Pressable onPress={onOpenStudent} style={styles.studentLink}>
            <UserRound color={type.accent} size={12} strokeWidth={2.2} />
            <Text style={[styles.studentLinkText, { color: type.accent }]}>
              {note.studentName} · {note.className}
            </Text>
          </Pressable>

          <Text numberOfLines={expanded ? undefined : 2} style={styles.notePreview}>
            {note.body}
          </Text>

          <Text style={styles.noteMeta}>
            {note.authorName} · {formatRelativeDate(note.createdAt)}
          </Text>

          {isSensitive ? (
            <View style={styles.sensitiveBadge}>
              <Text style={styles.sensitiveBadgeText}>{sensitivityLabel(note.sensitivity)}</Text>
            </View>
          ) : null}

          {expanded ? (
            <View style={styles.actionRow}>
              <Pressable onPress={onEdit} style={styles.actionBtn}>
                <Pencil color={type.accent} size={14} strokeWidth={2.2} />
                <Text style={[styles.actionBtnText, { color: type.accent }]}>Düzenle</Text>
              </Pressable>
              <Pressable onPress={onDelete} style={styles.actionBtn}>
                <Trash2 color={colors.danger} size={14} strokeWidth={2.2} />
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Sil</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {expanded ? (
          <ChevronUp color={type.accent} size={18} strokeWidth={2.2} />
        ) : (
          <ChevronDown color={colors.textMuted} size={18} strokeWidth={2.2} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginHorizontal: -4, marginBottom: 12 },
  hero: {
    backgroundColor: "#7c3aed",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  heroSubtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "500", lineHeight: 18 },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  heroMetaPill: { flex: 1, alignItems: "center", gap: 2 },
  heroMetaValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroMetaLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "600" },
  heroMetaDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.18)" },
  heroAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)"
  },
  heroAddBtnPressed: { opacity: 0.9 },
  heroAddBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  filtersCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
    marginBottom: 12
  },
  searchFilterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  filterBtnActive: { backgroundColor: "#faf5ff", borderColor: "#ddd6fe" },
  filterBtnPressed: { opacity: 0.88 },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  filtersPanel: { gap: 10, paddingTop: 4 },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipActive: { backgroundColor: "#faf5ff", borderColor: "#7c3aed" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#6d28d9" },
  clearFiltersBtn: { alignSelf: "flex-start", paddingVertical: 4 },
  clearFiltersText: { fontSize: 13, fontWeight: "700", color: "#7c3aed" },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  listTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  listCount: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden"
  },
  noteHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  noteAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  noteAvatarText: { fontSize: 14, fontWeight: "800" },
  noteMain: { flex: 1, gap: 6 },
  noteTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.text },
  typeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  typeBadgeText: { fontSize: 10, fontWeight: "800" },
  studentLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  studentLinkText: { fontSize: 12, fontWeight: "700" },
  notePreview: { fontSize: 13, color: colors.textMuted, lineHeight: 19, fontWeight: "500" },
  noteMeta: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  sensitiveBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fff7ed",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#fed7aa"
  },
  sensitiveBadgeText: { fontSize: 10, fontWeight: "700", color: "#c2410c" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  actionBtnText: { fontSize: 12, fontWeight: "700" }
});
