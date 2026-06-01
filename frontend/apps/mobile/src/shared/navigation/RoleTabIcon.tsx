import {
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LayoutGrid,
  NotebookPen,
  PenLine,
  School,
  ShieldAlert,
  UserRound,
  Users,
  type LucideIcon
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import type { TabConfig } from "@/shared/navigation/roleTabs";
import { colors } from "@/shared/theme/colors";

const ICONS: Record<TabConfig["icon"], LucideIcon> = {
  home: LayoutDashboard,
  users: Users,
  school: School,
  "clipboard-check": ClipboardCheck,
  "ellipsis-horizontal": LayoutGrid,
  calendar: CalendarDays,
  "book-open": PenLine,
  "alert-triangle": ShieldAlert,
  "file-text": NotebookPen,
  "user-round": UserRound
};

export function RoleTabIcon({ icon, focused }: { icon: TabConfig["icon"]; focused: boolean }) {
  const Icon = ICONS[icon];
  const tone = focused ? colors.accent : "#94a3b8";

  return (
    <View style={[styles.wrap, focused && styles.wrapActive]}>
      <Icon color={tone} size={focused ? 22 : 20} strokeWidth={focused ? 2.35 : 1.85} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 32,
    borderRadius: 16
  },
  wrapActive: {
    backgroundColor: colors.accentLight
  }
});
