import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Check, UsersRound } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";

function attendanceLabel(value: string) {
  if (value === "absent") return "Devamsız";
  if (value === "excused") return "Mazeretli";
  return "Katıldı";
}

function membershipLabel(value: string) {
  if (value === "waitlisted") return "Bekleme";
  if (value === "left") return "Ayrıldı";
  return "Aktif";
}

export function TeacherLifeScreen() {
  const queryClient = useQueryClient();
  const sessionsQ = useQuery({ queryKey: queryKeys.studySessions, queryFn: () => api.studySessions() });
  const clubsQ = useQuery({ queryKey: queryKeys.clubs, queryFn: () => api.clubs() });
  const studentsQ = useQuery({ queryKey: queryKeys.teacherStudents, queryFn: () => api.teacherStudents() });
  const [error, setError] = useState<string | null>(null);

  const markAttendanceMut = useMutation({
    mutationFn: () => {
      const session = sessionsQ.data?.[0];
      const student = studentsQ.data?.find((item) => item.classId === session?.classId) ?? studentsQ.data?.[0];
      if (!session || !student) throw new Error("Katılım için etüt ve öğrenci gerekir.");
      return api.recordStudyAttendance(session.id, [{ studentId: student.id, status: "attended" }]);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.studySessions })
  });

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem tamamlanamadı.");
    }
  }

  const sessions = sessionsQ.data ?? [];
  const clubs = clubsQ.data ?? [];
  const attendanceCount = sessions.reduce((sum, item) => sum + item.attendance.length, 0);

  return (
    <Screen
      title="Etüt & kulüp"
      subtitle="Kendi oturumlarım"
      refreshing={sessionsQ.isRefetching || clubsQ.isRefetching}
      onRefresh={() => {
        void sessionsQ.refetch();
        void clubsQ.refetch();
        void studentsQ.refetch();
      }}
    >
      <View style={styles.stats}>
        <Stat label="Etüt" value={sessions.length} />
        <Stat label="Katılım" value={attendanceCount} />
        <Stat label="Kulüp" value={clubs.length} />
      </View>

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {sessionsQ.isLoading || clubsQ.isLoading ? <LoadingBlock /> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Etütlerim</Text>
        {sessions.map((session) => (
          <View key={session.id} style={styles.card}>
            <View style={styles.row}>
              <BookOpenCheck color={colors.success} size={17} strokeWidth={2.4} />
              <View style={styles.copy}>
                <Text style={styles.title}>{session.title}</Text>
                <Text style={styles.meta}>
                  {session.className || "Genel"} · {session.attendance.length}/{session.capacity}
                </Text>
              </View>
            </View>
            {session.attendance.slice(0, 4).map((item) => (
              <Text key={item.id} style={styles.smallLine}>
                {item.studentName} · {attendanceLabel(item.status)}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <ActionButton
        loading={markAttendanceMut.isPending}
        onPress={() => run(() => markAttendanceMut.mutateAsync())}
        title="İlk etüde katılım işle"
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danışman kulüplerim</Text>
        {clubs.map((club) => (
          <View key={club.id} style={styles.card}>
            <View style={styles.row}>
              <UsersRound color={colors.accent} size={17} strokeWidth={2.4} />
              <View style={styles.copy}>
                <Text style={styles.title}>{club.name}</Text>
                <Text style={styles.meta}>
                  {club.memberships.length}/{club.capacity} · {club.capacityWarning || "Kontenjan uygun"}
                </Text>
              </View>
            </View>
            {club.memberships.slice(0, 4).map((item) => (
              <Text key={item.id} style={styles.smallLine}>
                {item.studentName} · {membershipLabel(item.status)}
              </Text>
            ))}
          </View>
        ))}
      </View>

    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ActionButton({ title, loading, onPress }: { title: string; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={[styles.actionBtn, loading && styles.actionBtnDisabled]}>
      {loading ? <ActivityIndicator color="#fff" /> : <Check color="#fff" size={16} strokeWidth={2.4} />}
      {!loading ? <Text style={styles.actionBtnText}>{title}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 2
  },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
  statValue: { fontSize: 18, color: colors.text, fontWeight: "900" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: "800", color: colors.text },
  meta: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
  smallLine: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
  actionBtn: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  actionBtnDisabled: { opacity: 0.72 },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "900" }
});
