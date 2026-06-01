import { BookOpen } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { SchoolStudentRecord } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { observationCategories } from "@/shared/utils/labels";

type Props = {
  visible: boolean;
  saving: boolean;
  error: string | null;
  students: SchoolStudentRecord[];
  onClose: () => void;
  onSubmit: (payload: { studentId: string; category: string; note: string }) => Promise<void>;
};

export function TeacherObservationCreateSheet({ visible, saving, error, students, onClose, onSubmit }: Props) {
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [category, setCategory] = useState("participation");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStudentId("");
    setStudentSearch("");
    setCategory("participation");
    setNote("");
    setLocalError(null);
  }, [visible]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const list = [...students].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr")
    );
    if (!q) return list;
    return list.filter((item) => {
      const name = `${item.firstName} ${item.lastName}`.toLowerCase();
      return name.includes(q) || item.schoolNumber.includes(q);
    });
  }, [students, studentSearch]);

  async function handleSubmit() {
    if (!studentId) {
      setLocalError("Öğrenci seçin.");
      return;
    }
    if (note.trim().length < 3) {
      setLocalError("En az 3 karakterlik gözlem notu girin.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({ studentId, category, note: note.trim() });
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Gözlem kaydedilemedi.");
    }
  }

  const displayError = localError ?? error;
  const canSubmit = Boolean(studentId && note.trim().length >= 3);

  return (
    <BottomSheet
      footer={
        <View style={styles.footerRow}>
          <Pressable disabled={saving} onPress={onClose} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
            <Text style={styles.secondaryBtnText}>Vazgeç</Text>
          </Pressable>
          <Pressable
            disabled={saving || !canSubmit}
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [styles.primaryBtn, (!canSubmit || saving) && styles.primaryBtnDisabled, pressed && styles.btnPressed]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Kaydet</Text>}
          </Pressable>
        </View>
      }
      headerAccessory={
        <View style={styles.headerIcon}>
          <BookOpen color="#7c3aed" size={22} strokeWidth={2.2} />
        </View>
      }
      onClose={onClose}
      subtitle="Öğrenci için kısa gözlem notu girin"
      title="Yeni gözlem"
      visible={visible}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {displayError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Kategori</Text>
          <View style={styles.chipRow}>
            {observationCategories.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setCategory(item.value)}
                style={[styles.chip, category === item.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, category === item.value && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Öğrenci</Text>
          <TextInput
            onChangeText={setStudentSearch}
            placeholder="Ad veya okul numarası ara..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={studentSearch}
          />
          <View style={styles.studentList}>
            {filteredStudents.length === 0 ? (
              <Text style={styles.emptyStudents}>Öğrenci bulunamadı.</Text>
            ) : (
              filteredStudents.slice(0, 12).map((student) => {
                const active = studentId === student.id;
                const name = `${student.firstName} ${student.lastName}`.trim();
                return (
                  <Pressable
                    key={student.id}
                    onPress={() => setStudentId(student.id)}
                    style={[styles.studentRow, active && styles.studentRowActive]}
                  >
                    <View style={[styles.studentAvatar, active && styles.studentAvatarActive]}>
                      <Text style={[styles.studentAvatarText, active && styles.studentAvatarTextActive]}>
                        {name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.studentCopy}>
                      <Text numberOfLines={1} style={[styles.studentName, active && styles.studentNameActive]}>
                        {name}
                      </Text>
                      <Text numberOfLines={1} style={styles.studentMeta}>
                        No {student.schoolNumber}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Gözlem notu</Text>
          <TextInput
            multiline
            onChangeText={setNote}
            placeholder="Derse katılım, dikkat, davranış veya kısa öğretmen notu..."
            style={[styles.input, styles.textArea]}
            value={note}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 16 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#faf5ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd6fe"
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  formSection: { gap: 8 },
  formLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
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
  textArea: { minHeight: 110, textAlignVertical: "top" },
  studentList: { gap: 6 },
  emptyStudents: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 10
  },
  studentRowActive: { backgroundColor: "#faf5ff", borderColor: "#7c3aed" },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  studentAvatarActive: { backgroundColor: "#7c3aed" },
  studentAvatarText: { fontSize: 12, fontWeight: "800", color: colors.textMuted },
  studentAvatarTextActive: { color: "#fff" },
  studentCopy: { flex: 1, gap: 2 },
  studentName: { fontSize: 14, fontWeight: "700", color: colors.text },
  studentNameActive: { color: "#6d28d9" },
  studentMeta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  footerRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: colors.background
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: colors.text },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#7c3aed"
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  btnPressed: { opacity: 0.88 }
});
