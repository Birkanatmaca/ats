import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, Soup, UsersRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";

function mealTypeLabel(value: string) {
  if (value === "breakfast") return "Kahvaltı";
  if (value === "snack") return "Ara öğün";
  return "Öğle";
}

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

export function GuardianLifeCard({ studentId }: { studentId: string }) {
  const lifeQ = useQuery({
    queryKey: queryKeys.guardianLife(studentId),
    queryFn: () => api.guardianLife(studentId),
    enabled: Boolean(studentId)
  });

  if (lifeQ.isError) return null;
  const summary = lifeQ.data;
  const meals = summary?.meals ?? [];
  const sessions = summary?.studySessions ?? [];
  const memberships = summary?.clubMemberships ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Soup color={colors.warning} size={18} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Okul yaşamı</Text>
          <Text style={styles.subtitle}>
            {lifeQ.isLoading ? "Yükleniyor" : `${meals.length} menü · ${sessions.length} etüt · ${memberships.length} kulüp`}
          </Text>
        </View>
      </View>

      {meals.slice(0, 3).map((meal) => (
        <View key={meal.id} style={styles.item}>
          <View style={styles.itemHead}>
            <Text style={styles.itemTitle}>{meal.title}</Text>
            <Text style={styles.badge}>{mealTypeLabel(meal.mealType)}</Text>
          </View>
          {meal.description ? <Text style={styles.meta}>{meal.description}</Text> : null}
          {meal.allergens.length > 0 ? (
            <View style={styles.chips}>
              {meal.allergens.map((allergen) => (
                <Text key={allergen} style={styles.chip}>
                  {allergen}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {sessions.slice(0, 2).map((session) => {
        const ownAttendance = session.attendance.find((item) => item.studentId === studentId);
        return (
          <View key={session.id} style={styles.infoRow}>
            <BookOpenCheck color={colors.success} size={15} strokeWidth={2.3} />
            <View style={styles.rowCopy}>
              <Text numberOfLines={1} style={styles.rowTitle}>
                {session.title}
              </Text>
              <Text style={styles.meta}>
                {session.className || "Genel"} · {ownAttendance ? attendanceLabel(ownAttendance.status) : "Planlandı"}
              </Text>
            </View>
          </View>
        );
      })}

      {memberships.slice(0, 3).map((membership) => (
        <View key={membership.id} style={styles.infoRow}>
          <UsersRound color={colors.accent} size={15} strokeWidth={2.3} />
          <View style={styles.rowCopy}>
            <Text numberOfLines={1} style={styles.rowTitle}>
              {membership.clubName || "Kulüp"}
            </Text>
            <Text style={styles.meta}>{membershipLabel(membership.status)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
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
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  item: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 6 },
  itemHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemTitle: { flex: 1, fontSize: 13, fontWeight: "800", color: colors.text },
  badge: {
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "900",
    color: colors.warning
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderRadius: 999,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "800",
    color: colors.danger
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  meta: { fontSize: 11, color: colors.textMuted, fontWeight: "700" }
});
