import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { OgtaAiFab } from "@/features/ai/OgtaAiFab";
import type { MobileRoleShell } from "@/shared/auth/roleRoutes";
import { roleTabConfigs, type TabConfig } from "@/shared/navigation/roleTabs";
import { colors } from "@/shared/theme/colors";

const iconMap: Record<TabConfig["icon"], keyof typeof Ionicons.glyphMap> = {
  home: "home-outline",
  users: "people-outline",
  school: "school-outline",
  "clipboard-check": "checkbox-outline",
  "ellipsis-horizontal": "ellipsis-horizontal",
  calendar: "calendar-outline",
  "book-open": "book-outline",
  "alert-triangle": "warning-outline",
  "file-text": "document-text-outline",
  "user-round": "person-outline"
};

export function RoleTabLayout({ shell }: { shell: Exclude<MobileRoleShell, "super_admin_blocked"> }) {
  const tabs = roleTabConfigs[shell];

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" }
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={iconMap[tab.icon]} size={size} color={color} />
              )
            }}
          />
        ))}
      </Tabs>
      <OgtaAiFab />
    </View>
  );
}
