import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { formatLessonRange, lessonsForDay, sortLessons, weekdayLabel } from "@/shared/utils/lessonSchedule";
import { colors } from "@/shared/theme/colors";

export function PrincipalScheduleScreen() {
  const queryClient = useQueryClient();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({ queryKey: queryKeys.schedule, queryFn: () => api.schedule() });

  const generateMut = useMutation({
    mutationFn: () => api.generateSchedule(),
    onSuccess: (result) => {
      if (result.schedule?.id) {
        setDraftId(result.schedule.id);
      }
      const warn = result.softWarnings?.[0];
      setMessage(
        result.hardConflicts > 0
          ? `Üretildi; ${result.hardConflicts} sert çakışma.${warn ? ` ${warn}` : ""}`
          : `Program taslağı hazır (${result.schedule?.lessons?.length ?? 0} ders).${warn ? ` ${warn}` : ""}`
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
    },
    onError: (e) => setMessage(e instanceof Error ? e.message : "Üretim başarısız")
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      const id = draftId ?? query.data?.id;
      if (!id) throw new Error("Yayınlanacak program yok. Önce program oluşturun.");
      const validation = await api.validateSchedule(id);
      if (!validation.valid) {
        throw new Error([...validation.hardConflicts, ...validation.softWarnings].join(" · ") || "Doğrulama başarısız");
      }
      if (validation.softWarnings.length > 0) {
        await new Promise<void>((resolve, reject) => {
          Alert.alert("Uyarılar var", validation.softWarnings.join("\n"), [
            { text: "İptal", style: "cancel", onPress: () => reject(new Error("İptal")) },
            { text: "Yine de yayınla", onPress: () => resolve() }
          ]);
        });
      }
      return api.publishSchedule(id);
    },
    onSuccess: () => {
      setDraftId(null);
      setMessage("Program yayınlandı.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
    },
    onError: (e) => setMessage(e instanceof Error ? e.message : "Yayınlama başarısız")
  });

  const schedule = query.data;
  const lessons = sortLessons(schedule?.lessons ?? []);
  const byDay = useMemo(() => {
    const days = [1, 2, 3, 4, 5, 6];
    return days.map((d) => ({ day: d, lessons: lessonsForDay(lessons, d) })).filter((x) => x.lessons.length > 0);
  }, [lessons]);

  return (
    <Screen title="Program" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <Text style={styles.status}>
        Durum: {schedule?.status === "published" ? "Yayında" : "Taslak / yok"} · {lessons.length} ders
      </Text>
      {message ? <Text style={styles.msg}>{message}</Text> : null}

      <Pressable disabled={generateMut.isPending} onPress={() => generateMut.mutate()} style={styles.btn}>
        {generateMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Program oluştur</Text>}
      </Pressable>
      <Pressable disabled={publishMut.isPending} onPress={() => publishMut.mutate()} style={[styles.btn, styles.btnSecondary]}>
        {publishMut.isPending ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.btnTextSecondary}>Doğrula ve yayınla</Text>}
      </Pressable>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}

      {byDay.map(({ day, lessons: dayLessons }) => (
        <View key={day} style={styles.day}>
          <Text style={styles.dayTitle}>{weekdayLabel(day)}</Text>
          {dayLessons.slice(0, 4).map((l) => (
            <ListCard key={l.id} meta={formatLessonRange(l)} subtitle={l.teacherName} title={`${l.className} · ${l.subjectName}`} />
          ))}
          {dayLessons.length > 4 ? <Text style={styles.more}>+{dayLessons.length - 4} ders daha</Text> : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { fontSize: 14, color: colors.textMuted },
  msg: { fontSize: 13, color: colors.accent, marginVertical: 6 },
  btn: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center", marginBottom: 8 },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  btnText: { color: "#fff", fontWeight: "700" },
  btnTextSecondary: { color: colors.primary, fontWeight: "700" },
  day: { marginTop: 12, gap: 8 },
  dayTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  more: { fontSize: 12, color: colors.textMuted, marginLeft: 4 }
});
