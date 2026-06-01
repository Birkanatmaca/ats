import { HeartHandshake } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { GuidanceStudent } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { supportStatusLabel } from "@/features/guidance/utils";

const STATUS_OPTIONS = [
  { value: "open", label: "Açık" },
  { value: "monitoring", label: "İzleniyor" },
  { value: "closed", label: "Kapalı" }
] as const;

type Props = {
  visible: boolean;
  saving: boolean;
  error: string | null;
  students: GuidanceStudent[];
  onClose: () => void;
  onSubmit: (payload: {
    studentId: string;
    title: string;
    description?: string;
    status?: string;
    dueDate?: string;
  }) => Promise<void>;
};

export function GuidancePlanCreateSheet({ visible, saving, error, students, onClose, onSubmit }: Props) {
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [dueDate, setDueDate] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStudentId("");
    setStudentSearch("");
    setTitle("");
    setDescription("");
    setStatus("open");
    setDueDate("");
    setLocalError(null);
  }, [visible]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const list = [...students].sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
    if (!q) return list;
    return list.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.className.toLowerCase().includes(q) ||
        item.schoolNumber.includes(q)
    );
  }, [students, studentSearch]);

  async function handleSubmit() {
    if (!studentId) {
      setLocalError("Öğrenci seçin.");
      return;
    }
    if (!title.trim()) {
      setLocalError("Plan başlığı zorunludur.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({
        studentId,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        dueDate: dueDate.trim() || undefined
      });
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Plan kaydedilemedi.");
    }
  }

  const displayError = localError ?? error;
  const canSubmit = Boolean(studentId && title.trim());

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
          <HeartHandshake color="#2563eb" size={22} strokeWidth={2.2} />
        </View>
      }
      onClose={onClose}
      subtitle="Öğrenci için destek takip planı oluşturun"
      title="Yeni takip planı"
      visible={visible}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {displayError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Durum</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setStatus(item.value)}
                style={[styles.chip, status === item.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, status === item.value && styles.chipTextActive]}>
                  {supportStatusLabel(item.value)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Öğrenci</Text>
          <TextInput
            onChangeText={setStudentSearch}
            placeholder="Ad, sınıf veya numara ara..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={studentSearch}
          />
          <View style={styles.studentList}>
            {filteredStudents.slice(0, 10).map((student) => {
              const active = studentId === student.id;
              return (
                <Pressable
                  key={student.id}
                  onPress={() => setStudentId(student.id)}
                  style={[styles.studentRow, active && styles.studentRowActive]}
                >
                  <Text style={[styles.studentName, active && styles.studentNameActive]}>{student.fullName}</Text>
                  <Text style={styles.studentMeta}>
                    {student.className} · No {student.schoolNumber}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Başlık</Text>
          <TextInput onChangeText={setTitle} placeholder="Veli görüşmesi takibi" style={styles.input} value={title} />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Açıklama</Text>
          <TextInput
            multiline
            onChangeText={setDescription}
            placeholder="Plan detayları ve hedefler..."
            style={[styles.input, styles.textArea]}
            value={description}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Hedef tarih (YYYY-AA-GG)</Text>
          <TextInput onChangeText={setDueDate} placeholder="2026-06-15" style={styles.input} value={dueDate} />
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
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe"
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
  chipActive: { backgroundColor: "#eff6ff", borderColor: "#2563eb" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#1d4ed8" },
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
  textArea: { minHeight: 90, textAlignVertical: "top" },
  studentList: { gap: 6 },
  studentRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 10,
    gap: 2
  },
  studentRowActive: { backgroundColor: "#eff6ff", borderColor: "#2563eb" },
  studentName: { fontSize: 14, fontWeight: "700", color: colors.text },
  studentNameActive: { color: "#1d4ed8" },
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
    backgroundColor: "#2563eb"
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  btnPressed: { opacity: 0.88 }
});
