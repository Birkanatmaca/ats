import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Save } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { Lesson } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";

type AcademicOption = {
  key: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TeacherAcademicResultsPanel({ lessons }: { lessons: Lesson[] }) {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const studentsQ = useQuery({ queryKey: queryKeys.teacherStudents, queryFn: () => api.teacherStudents() });
  const assessmentsQ = useQuery({ queryKey: queryKeys.academicAssessments, queryFn: () => api.academicAssessments() });

  const options = useMemo(() => {
    const map = new Map<string, AcademicOption>();
    for (const lesson of lessons) {
      const key = `${lesson.classId}:${lesson.subjectId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          classId: lesson.classId,
          className: lesson.className,
          subjectId: lesson.subjectId,
          subjectName: lesson.subjectName
        });
      }
    }
    return [...map.values()].sort((a, b) => `${a.className} ${a.subjectName}`.localeCompare(`${b.className} ${b.subjectName}`, "tr"));
  }, [lessons]);

  useEffect(() => {
    if (!selectedKey && options[0]) setSelectedKey(options[0].key);
  }, [options, selectedKey]);

  const selected = options.find((item) => item.key === selectedKey) ?? options[0];
  const students = useMemo(
    () => (studentsQ.data ?? []).filter((student) => student.classId === selected?.classId).slice(0, 6),
    [studentsQ.data, selected?.classId]
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Ders seçin.");
      const rows = students
        .map((student) => {
          const raw = scores[student.id]?.replace(",", ".").trim();
          const score = raw ? Number(raw) : Number.NaN;
          return {
            studentId: student.id,
            score,
            note: ""
          };
        })
        .filter((row) => Number.isFinite(row.score));
      if (rows.length === 0) throw new Error("En az bir puan girin.");
      const assessment = await api.createAcademicAssessment({
        name: `${selected.subjectName} hızlı ölçme`,
        subjectId: selected.subjectId,
        classId: selected.classId,
        assessmentType: "quiz",
        maxScore: 100,
        assessmentDate: todayISO()
      });
      await api.saveAcademicResults(assessment.id, rows);
      return assessment;
    },
    onSuccess: async (assessment) => {
      setMessage(`${assessment.name} kaydedildi.`);
      setScores({});
      await queryClient.invalidateQueries({ queryKey: queryKeys.academicAssessments });
      await queryClient.invalidateQueries({ queryKey: queryKeys.classAcademicSummary(selected?.classId ?? "") });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Sonuçlar kaydedilemedi.")
  });

  if (options.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <BookOpenCheck color="#047857" size={18} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Akademik sonuç girişi</Text>
          <Text style={styles.subtitle}>Sınav/quiz puanlarını hızlı kaydet</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
        {options.map((option) => {
          const active = option.key === selected?.key;
          return (
            <Pressable key={option.key} onPress={() => setSelectedKey(option.key)} style={[styles.optionChip, active && styles.optionChipActive]}>
              <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                {option.className} · {option.subjectName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {students.map((student) => (
        <View key={student.id} style={styles.scoreRow}>
          <View style={styles.studentCopy}>
            <Text style={styles.studentName} numberOfLines={1}>
              {student.firstName} {student.lastName}
            </Text>
            <Text style={styles.studentMeta}>{student.schoolNumber}</Text>
          </View>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={(value) => setScores((current) => ({ ...current, [student.id]: value }))}
            placeholder="0-100"
            placeholderTextColor={colors.textMuted}
            style={styles.scoreInput}
            value={scores[student.id] ?? ""}
          />
        </View>
      ))}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable disabled={saveMut.isPending} onPress={() => saveMut.mutate()} style={[styles.saveBtn, saveMut.isPending && styles.saveBtnDisabled]}>
        {saveMut.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Save color="#fff" size={16} strokeWidth={2.4} />
            <Text style={styles.saveText}>Ölçme oluştur ve kaydet</Text>
          </>
        )}
      </Pressable>

      {(assessmentsQ.data ?? []).slice(0, 3).map((item) => (
        <View key={item.id} style={styles.assessmentRow}>
          <Text style={styles.assessmentName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.assessmentMeta}>{item.assessmentDate}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  optionRow: { gap: 8, paddingRight: 8 },
  optionChip: {
    maxWidth: 180,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  optionChipActive: { borderColor: "#047857", backgroundColor: "#ecfdf5" },
  optionText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  optionTextActive: { color: "#047857" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  studentCopy: { flex: 1, gap: 2 },
  studentName: { fontSize: 13, fontWeight: "700", color: colors.text },
  studentMeta: { fontSize: 11, color: colors.textMuted },
  scoreInput: {
    width: 76,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center"
  },
  message: { fontSize: 12, fontWeight: "700", color: colors.accent },
  saveBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  assessmentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  assessmentName: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.text },
  assessmentMeta: { fontSize: 11, color: colors.textMuted }
});
