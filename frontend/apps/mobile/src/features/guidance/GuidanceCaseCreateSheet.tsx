import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { GuidanceCasePriority, GuidanceStudent } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";

type Props = {
  open: boolean;
  students: GuidanceStudent[];
  loading?: boolean;
  error?: string | null;
  initialStudentId?: string;
  onClose: () => void;
  onSubmit: (payload: {
    studentId: string;
    title: string;
    summary?: string;
    priority?: GuidanceCasePriority;
  }) => void;
};

const PRIORITIES: Array<{ value: GuidanceCasePriority; label: string }> = [
  { value: "low", label: "Düşük" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksek" },
  { value: "critical", label: "Kritik" }
];

export function GuidanceCaseCreateSheet({
  open,
  students,
  loading,
  error,
  initialStudentId,
  onClose,
  onSubmit
}: Props) {
  const [studentId, setStudentId] = useState(initialStudentId ?? "");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState<GuidanceCasePriority>("medium");

  useEffect(() => {
    if (open && initialStudentId) {
      setStudentId(initialStudentId);
    }
  }, [open, initialStudentId]);

  if (!open) return null;

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Yeni vaka dosyası</Text>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>Öğrenci</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {students.map((student) => {
                const active = student.id === studentId;
                return (
                  <Pressable
                    key={student.id}
                    onPress={() => setStudentId(student.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {student.fullName} · {student.className}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Başlık</Text>
            <TextInput onChangeText={setTitle} placeholder="Vaka başlığı" style={styles.input} value={title} />

            <Text style={styles.label}>Özet</Text>
            <TextInput
              multiline
              onChangeText={setSummary}
              placeholder="Kısa vaka özeti"
              style={[styles.input, styles.textArea]}
              value={summary}
            />

            <Text style={styles.label}>Öncelik</Text>
            <View style={styles.chips}>
              {PRIORITIES.map((item) => {
                const active = priority === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setPriority(item.value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>İptal</Text>
            </Pressable>
            <Pressable
              disabled={loading || !studentId || !title.trim()}
              onPress={() =>
                onSubmit({
                  studentId,
                  title: title.trim(),
                  summary: summary.trim(),
                  priority
                })
              }
              style={[styles.primaryBtn, (loading || !studentId || !title.trim()) && styles.disabled]}
            >
              <Text style={styles.primaryText}>{loading ? "Kaydediliyor…" : "Vaka aç"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "82%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    gap: 12
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  content: { gap: 10, paddingBottom: 8 },
  label: { fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#f8fafc"
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc"
  },
  chipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.text },
  chipTextActive: { color: "#fff" },
  error: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  actions: { flexDirection: "row", gap: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#f8fafc"
  },
  secondaryText: { color: colors.text, fontWeight: "700" },
  disabled: { opacity: 0.55 }
});
