import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { useAuth } from "@/shared/auth/AuthContext";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { categoryLabel, observationCategories } from "@/shared/utils/labels";
import { colors } from "@/shared/theme/colors";

export function TeacherObservationsScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState("participation");
  const [note, setNote] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const obsQ = useQuery({ queryKey: queryKeys.teacherObservations, queryFn: () => api.observations() });
  const studentsQ = useQuery({ queryKey: queryKeys.teacherStudents, queryFn: () => api.teacherStudents() });

  const myObs = useMemo(
    () =>
      (obsQ.data ?? []).filter(
        (o) => o.authorId === session?.principal.userId || o.authorName === session?.principal.name
      ),
    [obsQ.data, session]
  );

  const students = useMemo(
    () =>
      (studentsQ.data ?? []).map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`.trim()
      })),
    [studentsQ.data]
  );

  useEffect(() => {
    if (!studentId && students[0]?.id) {
      setStudentId(students[0].id);
    }
  }, [students, studentId]);

  const createMut = useMutation({
    mutationFn: () => api.createObservation({ studentId, category, note: note.trim() }),
    onSuccess: () => {
      setNote("");
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacherObservations });
    }
  });

  if (obsQ.isLoading) {
    return (
      <Screen title="Gözlemler">
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen title="Gözlemler" refreshing={obsQ.isRefetching} onRefresh={() => void obsQ.refetch()}>
      {obsQ.isError ? <ErrorState message={obsQ.error.message} onRetry={() => void obsQ.refetch()} /> : null}

      <Pressable onPress={() => setFormOpen((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>{formOpen ? "Formu kapat" : "+ Yeni gözlem"}</Text>
      </Pressable>

      {formOpen ? (
        <View style={styles.form}>
          <Text style={styles.label}>Öğrenci</Text>
          <View style={styles.chips}>
            {students.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setStudentId(s.id)}
                style={[styles.chip, studentId === s.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, studentId === s.id && styles.chipTextActive]}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.chips}>
            {observationCategories.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setCategory(c.value)}
                style={[styles.chip, category === c.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            multiline
            onChangeText={setNote}
            placeholder="Gözlem notu..."
            placeholderTextColor={colors.textMuted}
            style={styles.noteInput}
            value={note}
          />
          <Pressable
            disabled={!studentId || note.trim().length < 3 || createMut.isPending}
            onPress={() => createMut.mutate()}
            style={styles.submit}
          >
            {createMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Kaydet</Text>
            )}
          </Pressable>
          {createMut.isError ? (
            <Text style={styles.error}>{createMut.error instanceof Error ? createMut.error.message : "Hata"}</Text>
          ) : null}
        </View>
      ) : null}

      {myObs.length === 0 ? (
        <Text style={styles.empty}>Henüz gözlem kaydınız yok.</Text>
      ) : (
        myObs.map((o) => (
          <ListCard
            key={o.id}
            meta={new Date(o.createdAt).toLocaleDateString("tr-TR")}
            subtitle={o.note.length > 80 ? `${o.note.slice(0, 80)}…` : o.note}
            title={`${o.studentName} · ${categoryLabel(o.category)}`}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: "center"
  },
  toggleText: { color: "#fff", fontWeight: "700" },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  label: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f8fafc"
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: "#fff" },
  noteInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: "top",
    color: colors.text
  },
  submit: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: "center"
  },
  submitText: { color: "#fff", fontWeight: "700" },
  error: { color: colors.danger, fontSize: 12 },
  empty: { fontSize: 13, color: colors.textMuted, textAlign: "center" }
});
