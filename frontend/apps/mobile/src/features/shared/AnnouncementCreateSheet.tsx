import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { AnnouncementAudienceTarget } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { announcementAudienceOptions } from "@/shared/utils/labels";

type AudienceMode = "all" | "teachers" | "guardians" | "class" | "student";

type Props = {
  visible: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    body: string;
    audiences: AnnouncementAudienceTarget[];
    publish: boolean;
  }) => Promise<void>;
};

function buildAudiences(mode: AudienceMode, classId: string, studentId: string): AnnouncementAudienceTarget[] {
  switch (mode) {
    case "teachers":
      return [{ type: "role", role: "teacher" }];
    case "guardians":
      return [{ type: "role", role: "guardian" }];
    case "class":
      return classId ? [{ type: "class", id: classId }] : [];
    case "student":
      return studentId ? [{ type: "student", id: studentId }] : [];
    default:
      return [{ type: "all" }];
  }
}

export function AnnouncementCreateSheet({ visible, saving, error, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<AudienceMode>("all");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const rosterQ = useQuery({
    queryKey: queryKeys.principalRoster,
    queryFn: () => api.principalRoster(),
    enabled: visible
  });

  const classes = rosterQ.data?.classes ?? [];
  const students = rosterQ.data?.students ?? [];

  useEffect(() => {
    if (!visible) return;
    setTitle("");
    setBody("");
    setMode("all");
    setClassId("");
    setStudentId("");
    setLocalError(null);
  }, [visible]);

  const studentLabel = (studentId: string) => {
    const selected = students.find((item) => item.id === studentId);
    if (!selected) return "Öğrenci seçin";
    const classLabel = classes.find((item) => item.id === selected.classId)?.name ?? selected.classId;
    return `${selected.firstName} ${selected.lastName} · ${classLabel}`;
  };

  const previewAudience = useMemo(() => {
    const audiences = buildAudiences(mode, classId, studentId);
    if (audiences.length === 0) return "Hedef seçin";
    if (mode === "class") {
      const selected = classes.find((item) => item.id === classId);
      return selected ? `${selected.name} velileri` : "Sınıf seçin";
    }
    if (mode === "student") {
      return studentId ? `${studentLabel(studentId).split(" · ")[0]} velileri` : "Öğrenci seçin";
    }
    return announcementAudienceOptions.find((item) => item.value === mode)?.label ?? mode;
  }, [mode, classId, studentId, classes, students]);

  async function handleSubmit(publish: boolean) {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const audiences = buildAudiences(mode, classId, studentId);
    if (!trimmedTitle || !trimmedBody) {
      setLocalError("Başlık ve içerik zorunludur.");
      return;
    }
    if (audiences.length === 0) {
      setLocalError("Geçerli bir hedef kitle seçin.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({ title: trimmedTitle, body: trimmedBody, audiences, publish });
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Duyuru kaydedilemedi.");
    }
  }

  const displayError = localError ?? error;

  return (
    <BottomSheet
      footer={
        <View style={styles.footerRow}>
          <Pressable disabled={saving} onPress={onClose} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
            <Text style={styles.secondaryBtnText}>Vazgeç</Text>
          </Pressable>
          <Pressable
            disabled={saving || !title.trim() || !body.trim()}
            onPress={() => void handleSubmit(false)}
            style={({ pressed }) => [styles.secondaryBtn, styles.draftBtn, (saving || !title.trim() || !body.trim()) && styles.btnDisabled, pressed && styles.btnPressed]}
          >
            {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.secondaryBtnText}>Taslak</Text>}
          </Pressable>
          <Pressable
            disabled={saving || !title.trim() || !body.trim()}
            onPress={() => void handleSubmit(true)}
            style={({ pressed }) => [styles.primaryBtn, (saving || !title.trim() || !body.trim()) && styles.primaryBtnDisabled, pressed && styles.btnPressed]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Yayınla</Text>}
          </Pressable>
        </View>
      }
      headerAccessory={
        <View style={styles.headerIcon}>
          <Megaphone color="#d97706" size={22} strokeWidth={2.2} />
        </View>
      }
      onClose={onClose}
      subtitle="Hedef kitleyi seçin, taslak kaydedin veya yayınlayın"
      title="Yeni duyuru"
      visible={visible}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {displayError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Ön izleme</Text>
          <Text style={styles.noteText}>Hedef: {previewAudience}</Text>
          <Text style={styles.noteHint}>Taslak duyurular hedef kullanıcılara görünmez. Yayınlandığında push bildirimi gönderilir.</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Hedef kitle</Text>
          <View style={styles.audienceGrid}>
            {(["all", "teachers", "guardians", "class", "student"] as AudienceMode[]).map((option) => {
              const active = mode === option;
              const label =
                option === "all"
                  ? "Tüm kurum"
                  : option === "teachers"
                    ? "Öğretmenler"
                    : option === "guardians"
                      ? "Veliler"
                      : option === "class"
                        ? "Sınıf"
                        : "Öğrenci velileri";
              return (
                <Pressable
                  key={option}
                  onPress={() => setMode(option)}
                  style={({ pressed }) => [styles.audienceChip, active && styles.audienceChipActive, pressed && styles.btnPressed]}
                >
                  <Text style={[styles.audienceChipText, active && styles.audienceChipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {mode === "class" ? (
            <View style={styles.pickerList}>
              {classes.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setClassId(item.id)}
                  style={[styles.pickerItem, classId === item.id && styles.pickerItemActive]}
                >
                  <Text style={[styles.pickerItemText, classId === item.id && styles.pickerItemTextActive]}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {mode === "student" ? (
            <View style={styles.pickerList}>
              {students.slice(0, 40).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setStudentId(item.id)}
                  style={[styles.pickerItem, studentId === item.id && styles.pickerItemActive]}
                >
                  <Text style={[styles.pickerItemText, studentId === item.id && styles.pickerItemTextActive]}>
                    {item.firstName} {item.lastName} · {classes.find((c) => c.id === item.classId)?.name ?? item.classId}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Duyuru içeriği</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Başlık</Text>
            <TextInput
              onChangeText={setTitle}
              placeholder="Örn. Veli toplantısı duyurusu"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={title}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj</Text>
            <TextInput
              multiline
              onChangeText={setBody}
              placeholder="Duyuru metnini yazın…"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textArea]}
              textAlignVertical="top"
              value={body}
            />
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center"
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12
  },
  errorText: { fontSize: 13, color: colors.danger, fontWeight: "700" },
  noteCard: {
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 14,
    gap: 6
  },
  noteTitle: { fontSize: 13, fontWeight: "800", color: "#9a3412" },
  noteText: { fontSize: 14, fontWeight: "700", color: "#c2410c" },
  noteHint: { fontSize: 12, lineHeight: 18, color: "#9a3412", fontWeight: "500" },
  formSection: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryLight,
    letterSpacing: 0.2
  },
  audienceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  audienceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border
  },
  audienceChipActive: { backgroundColor: "#fff7ed", borderColor: "#d97706" },
  audienceChipText: { fontSize: 13, fontWeight: "700", color: colors.text },
  audienceChipTextActive: { color: "#c2410c" },
  pickerList: { gap: 6 },
  pickerItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface
  },
  pickerItemActive: { borderColor: "#d97706", backgroundColor: "#fff7ed" },
  pickerItemText: { fontSize: 13, fontWeight: "600", color: colors.text },
  pickerItemTextActive: { color: "#c2410c", fontWeight: "800" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface
  },
  textArea: { minHeight: 120 },
  footerRow: { flexDirection: "row", gap: 8 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  draftBtn: { flex: 1.1 },
  secondaryBtnText: { fontSize: 14, fontWeight: "800", color: colors.text },
  primaryBtn: {
    flex: 1.2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#d97706"
  },
  primaryBtnDisabled: { opacity: 0.55 },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  btnPressed: { opacity: 0.9 }
});
