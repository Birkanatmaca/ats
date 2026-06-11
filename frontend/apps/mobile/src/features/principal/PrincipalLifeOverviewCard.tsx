import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, Soup, UsersRound } from "lucide-react-native";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";

export function PrincipalLifeOverviewCard() {
  const mealsQ = useQuery({ queryKey: queryKeys.lifeMeals, queryFn: () => api.lifeMeals() });
  const sessionsQ = useQuery({ queryKey: queryKeys.studySessions, queryFn: () => api.studySessions() });
  const clubsQ = useQuery({ queryKey: queryKeys.clubs, queryFn: () => api.clubs() });

  if (mealsQ.isError && sessionsQ.isError && clubsQ.isError) return null;

  const meals = mealsQ.data ?? [];
  const sessions = sessionsQ.data ?? [];
  const clubs = clubsQ.data ?? [];
  const attendanceCount = sessions.reduce((total, item) => total + item.attendance.length, 0);
  const waitlisted = clubs.reduce((total, club) => total + club.memberships.filter((item) => item.status === "waitlisted").length, 0);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Soup color={colors.warning} size={18} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Okul yaşamı</Text>
          <Text style={styles.subtitle}>
            {mealsQ.isLoading || sessionsQ.isLoading || clubsQ.isLoading
              ? "Yükleniyor"
              : `${meals.length} menü · ${sessions.length} etüt · ${clubs.length} kulüp`}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat icon={<Soup color={colors.warning} size={15} strokeWidth={2.3} />} label="Menü" value={meals.length} />
        <Stat icon={<BookOpenCheck color={colors.success} size={15} strokeWidth={2.3} />} label="Katılım" value={attendanceCount} />
        <Stat icon={<UsersRound color={colors.accent} size={15} strokeWidth={2.3} />} label="Bekleme" value={waitlisted} />
      </View>

      {sessions.slice(0, 2).map((session) => (
        <View key={session.id} style={styles.row}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {session.title}
          </Text>
          <Text style={styles.rowMeta}>
            {session.className || "Genel"} · {session.teacherName || "Öğretmen yok"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
    gap: 12
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff7ed"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  stats: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 8,
    gap: 2
  },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "800" },
  statValue: { fontSize: 17, color: colors.text, fontWeight: "900" },
  row: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 2 },
  rowTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMuted }
});
