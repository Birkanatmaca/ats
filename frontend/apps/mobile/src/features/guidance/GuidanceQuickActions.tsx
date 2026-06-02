import { useRouter } from "expo-router";
import { FolderOpen, HeartHandshake, Megaphone, Bell, ChevronRight, Users, AlertTriangle, BookOpen, FileText, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

type QuickAction = {
  key: string;
  label: string;
  route:
    | "/(app)/guidance/(tabs)/students"
    | "/(app)/guidance/(tabs)/risks"
    | "/(app)/guidance/(tabs)/notes"
    | "/(app)/guidance/(tabs)/observations"
    | "/(app)/guidance/(tabs)/plans"
    | "/(app)/guidance/cases"
    | "/(app)/guidance/announcements"
    | "/(app)/guidance/notifications";
  icon: LucideIcon;
  accent: string;
};

const actions: QuickAction[] = [
  { key: "students", label: "Öğrenciler", route: "/(app)/guidance/(tabs)/students", icon: Users, accent: colors.accent },
  { key: "risks", label: "Risk takibi", route: "/(app)/guidance/(tabs)/risks", icon: AlertTriangle, accent: colors.danger },
  { key: "notes", label: "Rehberlik notları", route: "/(app)/guidance/(tabs)/notes", icon: FileText, accent: "#7c3aed" },
  { key: "observations", label: "Gözlemler", route: "/(app)/guidance/(tabs)/observations", icon: BookOpen, accent: "#2563eb" },
  { key: "plans", label: "Takip planları", route: "/(app)/guidance/(tabs)/plans", icon: HeartHandshake, accent: "#0d9488" },
  { key: "cases", label: "Vaka dosyaları", route: "/(app)/guidance/cases", icon: FolderOpen, accent: "#7c3aed" },
  { key: "announcements", label: "Duyurular", route: "/(app)/guidance/announcements", icon: Megaphone, accent: "#d97706" },
  { key: "notifications", label: "Bildirimler", route: "/(app)/guidance/notifications", icon: Bell, accent: "#db2777" }
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

export function GuidanceQuickActions() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Hızlı işlemler</Text>
      <Text style={styles.subtitle}>Rehberlik süreçlerine hızlı erişim</Text>
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
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
    marginTop: -4
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
    minWidth: "47%",
    minHeight: 56
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
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 16
  }
});
