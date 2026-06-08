import { useRouter } from "expo-router";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Megaphone,
  ShieldAlert,
  UserRound,
  Users
} from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useAuth } from "@/shared/auth/AuthContext";
import { resolveMobileShell } from "@/shared/auth/roleRoutes";
import {
  getMoreMenuItems,
  isTabbedRoleShell,
  moreSectionLabels,
  moreSectionOrder,
  type MoreMenuItem
} from "@/shared/navigation/roleTabs";
import { colors } from "@/shared/theme/colors";
import { Screen } from "@/shared/ui/Screen";

const MENU_ICONS: Record<string, LucideIcon> = {
  attendance: ClipboardCheck,
  risks: ShieldAlert,
  teachers: Users,
  schedule: CalendarDays,
  notes: FileText,
  announcements: Megaphone,
  notifications: Bell,
  support: HelpCircle,
  profile: UserRound,
  "student-imports": FileText
};

const MENU_ICON_TONES: Record<string, { bg: string; color: string }> = {
  attendance: { bg: "#ecfdf5", color: "#059669" },
  risks: { bg: "#fef2f2", color: "#dc2626" },
  teachers: { bg: colors.accentLight, color: colors.accent },
  schedule: { bg: "#eff6ff", color: "#2563eb" },
  notes: { bg: "#faf5ff", color: "#7c3aed" },
  announcements: { bg: "#fff7ed", color: "#d97706" },
  notifications: { bg: "#fdf2f8", color: "#db2777" },
  support: { bg: "#f0fdfa", color: "#0d9488" },
  profile: { bg: "#f8fafc", color: colors.primaryLight },
  "student-imports": { bg: "#eff6ff", color: "#2563eb" }
};

export function MoreScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const role = session?.principal.role;
  const shell = role ? resolveMobileShell(role) : null;

  const groupedMenu = useMemo(() => {
    if (!isTabbedRoleShell(shell)) return [];

    const menu = getMoreMenuItems(shell);
    const groups: Array<{ section: MoreMenuItem["section"]; items: MoreMenuItem[] }> = [];

    for (const section of moreSectionOrder) {
      const items = menu.filter((item) => item.section === section);
      if (items.length > 0) groups.push({ section, items });
    }

    return groups;
  }, [shell]);

  if (!isTabbedRoleShell(shell)) {
    return (
      <Screen>
        <Text style={styles.emptyText}>Erişim yok.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {groupedMenu.map((group) => (
        <View key={group.section} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            {group.section === "school" ? (
              <LayoutGrid color={colors.accent} size={14} strokeWidth={2.2} />
            ) : group.section === "operations" ? (
              <ClipboardCheck color={colors.accent} size={14} strokeWidth={2.2} />
            ) : group.section === "communication" ? (
              <Bell color={colors.accent} size={14} strokeWidth={2.2} />
            ) : (
              <UserRound color={colors.accent} size={14} strokeWidth={2.2} />
            )}
            <Text style={styles.sectionTitle}>{moreSectionLabels[group.section]}</Text>
          </View>

          <View style={styles.menuRows}>
            {group.items.map((item) => (
              <MenuRow key={item.key} item={item} onPress={() => router.push(item.route as never)} />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.logoutCard}>
        <Pressable
          onPress={() => {
            void signOut().then(() => router.replace("/(auth)/login"));
          }}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        >
          <View style={styles.logoutIconWrap}>
            <LogOut color={colors.danger} size={18} strokeWidth={2.2} />
          </View>
          <View style={styles.logoutCopy}>
            <Text style={styles.logoutTitle}>Çıkış yap</Text>
            <Text style={styles.logoutHint}>Hesabınızdan güvenli çıkış</Text>
          </View>
          <ChevronRight color={colors.danger} size={16} strokeWidth={2.4} />
        </Pressable>
      </View>
    </Screen>
  );
}

function MenuRow({ item, onPress }: { item: MoreMenuItem; onPress: () => void }) {
  const Icon = MENU_ICONS[item.key] ?? GraduationCap;
  const tone = MENU_ICON_TONES[item.key] ?? { bg: colors.accentLight, color: colors.accent };

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
      <View style={[styles.menuIconWrap, { backgroundColor: tone.bg }]}>
        <Icon color={tone.color} size={18} strokeWidth={2.2} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{item.label}</Text>
        {item.description ? (
          <Text numberOfLines={1} style={styles.menuDescription}>
            {item.description}
          </Text>
        ) : null}
      </View>
      <ChevronRight color={colors.textMuted} size={18} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryLight,
    letterSpacing: 0.3,
    textTransform: "uppercase"
  },
  menuRows: { padding: 8, gap: 4 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  menuRowPressed: { backgroundColor: colors.accentLight },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  menuCopy: { flex: 1, gap: 2, minWidth: 0 },
  menuLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  menuDescription: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  logoutCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginTop: 4
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  logoutBtnPressed: { backgroundColor: "#fff5f5" },
  logoutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#fdecec",
    alignItems: "center",
    justifyContent: "center"
  },
  logoutCopy: { flex: 1, gap: 2 },
  logoutTitle: { fontSize: 15, fontWeight: "800", color: colors.danger },
  logoutHint: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  emptyText: { color: colors.textMuted, fontSize: 14 }
});
