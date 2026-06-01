import { useRouter } from "expo-router";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Megaphone,
  type LucideIcon
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

type QuickAction = {
  key: string;
  label: string;
  route:
    | "/(app)/teacher/(tabs)/attendance"
    | "/(app)/teacher/(tabs)/lessons"
    | "/(app)/teacher/(tabs)/observations"
    | "/(app)/teacher/announcements"
    | "/(app)/teacher/notifications";
  icon: LucideIcon;
  accent: string;
};

const actions: QuickAction[] = [
  { key: "attendance", label: "Yoklama", route: "/(app)/teacher/(tabs)/attendance", icon: ClipboardCheck, accent: "#059669" },
  { key: "lessons", label: "Derslerim", route: "/(app)/teacher/(tabs)/lessons", icon: CalendarDays, accent: "#2563eb" },
  { key: "observations", label: "Gözlemler", route: "/(app)/teacher/(tabs)/observations", icon: BookOpen, accent: "#7c3aed" },
  { key: "announcements", label: "Duyurular", route: "/(app)/teacher/announcements", icon: Megaphone, accent: "#d97706" },
  { key: "notifications", label: "Bildirimler", route: "/(app)/teacher/notifications", icon: Bell, accent: "#db2777" }
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
      <Text numberOfLines={2} style={styles.tileLabel}>
        {item.label}
      </Text>
      <ChevronRight color={colors.textMuted} size={14} strokeWidth={2} />
    </Pressable>
  );
}

export function TeacherQuickActions() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Hızlı işlemler</Text>
      <Text style={styles.subtitle}>Günlük öğretmen akışlarına hızlı erişim</Text>
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
  title: { fontSize: 14, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
  subtitle: { fontSize: 12, color: colors.textMuted, fontWeight: "500", marginTop: -4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
    minWidth: "47%",
    minHeight: 56
  },
  tilePressed: { opacity: 0.88, backgroundColor: "#ecfdf5" },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  tileLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.text, lineHeight: 16 }
});
