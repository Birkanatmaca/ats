import { useRouter } from "expo-router";
import { CalendarDays, ChevronRight, GraduationCap, School, Users, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

type QuickAction = {
  key: string;
  label: string;
  route: "/(app)/principal/(tabs)/students" | "/(app)/principal/teachers" | "/(app)/principal/(tabs)/classes" | "/(app)/principal/schedule";
  icon: LucideIcon;
  accent: string;
};

const actions: QuickAction[] = [
  { key: "students", label: "Öğrenciler", route: "/(app)/principal/(tabs)/students", icon: Users, accent: colors.accent },
  { key: "teachers", label: "Öğretmenler", route: "/(app)/principal/teachers", icon: GraduationCap, accent: colors.success },
  { key: "classes", label: "Sınıflar", route: "/(app)/principal/(tabs)/classes", icon: School, accent: colors.accentSoft },
  { key: "schedule", label: "Program", route: "/(app)/principal/schedule", icon: CalendarDays, accent: colors.primaryLight }
];

function ActionTile({ item }: { item: QuickAction }) {
  const router = useRouter();
  const Icon = item.icon;

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="button"
      onPress={() => router.push(item.route)}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${item.accent}14` }]}>
        <Icon color={item.accent} size={18} strokeWidth={2} />
      </View>
      <Text numberOfLines={1} style={styles.tileLabel}>
        {item.label}
      </Text>
      <ChevronRight color={colors.textMuted} size={14} strokeWidth={2} />
    </Pressable>
  );
}

export function PrincipalQuickActions() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Hızlı işlemler</Text>
      <View style={styles.grid}>
        {actions.map((item) => (
          <ActionTile key={item.key} item={item} />
        ))}
      </View>
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
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  tile: {
    width: "48.5%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 11,
    minWidth: "47%"
  },
  tilePressed: {
    opacity: 0.88,
    backgroundColor: colors.accentLight
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  tileLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text
  }
});
