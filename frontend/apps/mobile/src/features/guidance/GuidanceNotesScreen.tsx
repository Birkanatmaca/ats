import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { colors } from "@/shared/theme/colors";

const noteTypes = [
  { value: "meeting", label: "Görüşme" },
  { value: "follow_up", label: "Takip" },
  { value: "observation", label: "Gözlem" }
] as const;

export function GuidanceNotesScreen() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [noteType, setNoteType] = useState("meeting");

  const notesQ = useQuery({ queryKey: queryKeys.guidanceNotes, queryFn: () => api.guidanceNotes() });
  const studentsQ = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });

  const createMut = useMutation({
    mutationFn: () => api.createGuidanceNote({ studentId, noteType, title: title.trim(), body: body.trim() }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceNotes });
    }
  });

  return (
    <Screen title="Notlar" refreshing={notesQ.isRefetching} onRefresh={() => void notesQ.refetch()}>
      <Pressable onPress={() => setFormOpen((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>{formOpen ? "Kapat" : "+ Not ekle"}</Text>
      </Pressable>

      {formOpen ? (
        <View style={styles.form}>
          <Text style={styles.label}>Öğrenci</Text>
          <View style={styles.chips}>
            {(studentsQ.data ?? []).slice(0, 8).map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setStudentId(s.id)}
                style={[styles.chip, studentId === s.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, studentId === s.id && styles.chipTextActive]}>{s.fullName.split(" ")[0]}</Text>
              </Pressable>
            ))}
          </View>
          {noteTypes.map((t) => (
            <Pressable key={t.value} onPress={() => setNoteType(t.value)} style={[styles.chip, noteType === t.value && styles.chipActive]}>
              <Text style={[styles.chipText, noteType === t.value && styles.chipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
          <TextInput onChangeText={setTitle} placeholder="Başlık" style={styles.input} value={title} />
          <TextInput multiline onChangeText={setBody} placeholder="Not içeriği" style={[styles.input, styles.area]} value={body} />
          <Pressable
            disabled={!studentId || !title.trim() || body.trim().length < 3 || createMut.isPending}
            onPress={() => createMut.mutate()}
            style={styles.submit}
          >
            {createMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Kaydet</Text>}
          </Pressable>
        </View>
      ) : null}

      {notesQ.isLoading ? <LoadingBlock /> : null}
      {notesQ.isError ? <ErrorState message={notesQ.error.message} onRetry={() => void notesQ.refetch()} /> : null}
      {(notesQ.data ?? []).map((n) => (
        <ListCard
          key={n.id}
          meta={new Date(n.createdAt).toLocaleDateString("tr-TR")}
          subtitle={n.body.length > 100 ? `${n.body.slice(0, 100)}…` : n.body}
          title={`${n.studentName} · ${n.title}`}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  toggleText: { color: "#fff", fontWeight: "700" },
  form: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text },
  area: { minHeight: 72, textAlignVertical: "top" },
  submit: { backgroundColor: colors.accent, borderRadius: 10, padding: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700" }
});
