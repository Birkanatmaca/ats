import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { AttendanceRecord, AttendanceSession, Lesson } from "@/shared/api/types";
import { SearchBar } from "@/shared/ui/SearchBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { attendanceLabel } from "@/shared/utils/labels";
import {
  attendanceWindowLabel,
  currentWeekday,
  formatLessonRange,
  isLessonInAttendanceWindow,
  lessonsForDay,
  sortLessons
} from "@/shared/utils/lessonSchedule";
import { colors } from "@/shared/theme/colors";

type Status = AttendanceRecord["status"];

const statuses: Status[] = ["present", "absent", "late", "excused"];

const statusColors: Record<Status, string> = {
  present: "#16a34a",
  absent: "#dc2626",
  late: "#d97706",
  excused: "#2563eb",
  unknown: "#94a3b8"
};

async function openSession(lesson: Lesson): Promise<AttendanceSession> {
  try {
    return await api.getAttendanceSessionByLesson(lesson.id);
  } catch {
    return await api.createAttendanceSession(lesson.id);
  }
}

export function TeacherAttendanceScreen() {
  const queryClient = useQueryClient();
  const today = currentWeekday();
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calendarQ = useQuery({ queryKey: queryKeys.teacherCalendar, queryFn: () => api.teacherCalendar() });
  const currentQ = useQuery({ queryKey: queryKeys.teacherCurrentLesson, queryFn: () => api.currentLesson() });

  const lessons = sortLessons(calendarQ.data ?? []);
  const todayLessons = lessonsForDay(lessons, today);
  const activeLesson = currentQ.data?.found ? currentQ.data.lesson : undefined;

  const defaultLesson =
    activeLesson && todayLessons.some((l) => l.id === activeLesson.id)
      ? activeLesson
      : todayLessons.find((l) => isLessonInAttendanceWindow(l)) ?? todayLessons[0];

  useEffect(() => {
    if (defaultLesson && !selectedLessonId) {
      setSelectedLessonId(defaultLesson.id);
    }
  }, [defaultLesson, selectedLessonId]);

  const selectedLesson = todayLessons.find((l) => l.id === selectedLessonId) ?? defaultLesson;

  const openMutation = useMutation({
    mutationFn: (lesson: Lesson) => openSession(lesson),
    onSuccess: (loaded) => {
      setSession(loaded);
      setMessage(`${loaded.className} · ${loaded.subjectName} listesi hazır.`);
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Oturum açılamadı.")
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Oturum yok");
      const saved = await api.updateAttendanceRecords(session.id, session.records);
      return api.finalizeAttendanceSession(saved.id);
    },
    onSuccess: (finalized) => {
      setSession(finalized);
      setMessage("Yoklama kaydedildi.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacherCalendar });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Kayıt başarısız.")
  });

  const filteredRecords = useMemo(() => {
    if (!session) return [];
    const q = search.trim().toLowerCase();
    if (!q) return session.records;
    return session.records.filter(
      (r) => r.studentName.toLowerCase().includes(q) || r.number.toLowerCase().includes(q)
    );
  }, [session, search]);

  const updateStatus = useCallback((studentId: string, status: Status) => {
    setSession((current) =>
      current
        ? {
            ...current,
            records: current.records.map((r) => (r.studentId === studentId ? { ...r, status } : r))
          }
        : current
    );
  }, []);

  const markAllPresent = () => {
    setSession((current) =>
      current ? { ...current, records: current.records.map((r) => ({ ...r, status: "present" as const })) } : current
    );
  };

  function handleOpenLesson(lesson: Lesson) {
    if (!isLessonInAttendanceWindow(lesson)) {
      setError("Yoklama penceresi kapalı (ders başlangıcından 10 dk önce – bitişinden 10 dk sonra).");
      return;
    }
    setSelectedLessonId(lesson.id);
    openMutation.mutate(lesson);
  }

  const refreshing = calendarQ.isRefetching;
  const onRefresh = () => void calendarQ.refetch();

  if (calendarQ.isLoading) {
    return (
      <Screen title="Yoklama">
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen title="Yoklama" refreshing={refreshing} onRefresh={onRefresh}>
      {calendarQ.isError ? <ErrorState message={calendarQ.error.message} onRetry={onRefresh} /> : null}

      <Text style={styles.hint}>Bugünkü dersler — yoklama penceresi içindekileri seçin</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lessonRow}>
        {todayLessons.map((l) => {
          const active = l.id === selectedLessonId;
          const open = isLessonInAttendanceWindow(l);
          return (
            <Pressable
              key={l.id}
              onPress={() => handleOpenLesson(l)}
              style={[styles.lessonChip, active && styles.lessonChipActive, !open && styles.lessonChipDisabled]}
            >
              <Text style={[styles.lessonChipTitle, active && styles.lessonChipTextActive]}>{l.className}</Text>
              <Text style={[styles.lessonChipSub, active && styles.lessonChipTextActive]}>{l.subjectName}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedLesson ? (
        <Text style={styles.window}>
          Pencere: {attendanceWindowLabel(selectedLesson)} · {formatLessonRange(selectedLesson)}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}

      {openMutation.isPending ? <LoadingBlock /> : null}

      {session ? (
        <>
          <SearchBar onChangeText={setSearch} placeholder="Öğrenci ara..." value={search} />
          {!session.finalizedAt ? (
            <View style={styles.actions}>
              <Pressable onPress={markAllPresent} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Hepsi geldi</Text>
              </Pressable>
              <Pressable
                disabled={saveMutation.isPending || Boolean(session.finalizedAt)}
                onPress={() => saveMutation.mutate()}
                style={styles.primaryBtn}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Kaydet ve tamamla</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Text style={styles.finalized}>Bu yoklama kesinleştirildi.</Text>
          )}

          {filteredRecords.map((record) => (
            <View key={record.studentId} style={styles.studentRow}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{record.studentName}</Text>
                <Text style={styles.studentNo}>No {record.number}</Text>
              </View>
              <View style={styles.statusRow}>
                {statuses.map((s) => (
                  <Pressable
                    key={s}
                    disabled={Boolean(session.finalizedAt)}
                    onPress={() => updateStatus(record.studentId, s)}
                    style={[
                      styles.statusBtn,
                      record.status === s && { backgroundColor: statusColors[s], borderColor: statusColors[s] }
                    ]}
                  >
                    <Text style={[styles.statusBtnText, record.status === s && styles.statusBtnTextActive]}>
                      {attendanceLabel(s).slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.empty}>Yoklama almak için yukarıdan bir ders seçin.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.textMuted },
  lessonRow: { gap: 8, paddingVertical: 4 },
  lessonChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minWidth: 100
  },
  lessonChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  lessonChipDisabled: { opacity: 0.55 },
  lessonChipTitle: { fontWeight: "700", fontSize: 13, color: colors.text },
  lessonChipSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  lessonChipTextActive: { color: "#fff" },
  window: { fontSize: 12, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 13 },
  ok: { color: colors.success, fontSize: 13 },
  actions: { flexDirection: "row", gap: 8, marginVertical: 4 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface
  },
  secondaryBtnText: { fontWeight: "600", color: colors.text },
  primaryBtn: {
    flex: 1.4,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  finalized: { color: colors.success, fontWeight: "600", marginBottom: 8 },
  studentRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  studentInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  studentName: { fontWeight: "600", fontSize: 15, color: colors.text },
  studentNo: { fontSize: 12, color: colors.textMuted },
  statusRow: { flexDirection: "row", gap: 6 },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: "#f8fafc"
  },
  statusBtnText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  statusBtnTextActive: { color: "#fff" },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 24 }
});
