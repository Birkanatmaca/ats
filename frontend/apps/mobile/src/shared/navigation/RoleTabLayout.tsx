import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MobileRoleShell } from "@/shared/auth/roleRoutes";
import { OgtaRoleTabBar } from "@/shared/navigation/OgtaRoleTabBar";
import { RoleTabIcon } from "@/shared/navigation/RoleTabIcon";
import { roleHiddenTabScreens, roleTabConfigs } from "@/shared/navigation/roleTabs";
import { tabBarClearance } from "@/shared/navigation/tabBarMetrics";

export function RoleTabLayout({ shell }: { shell: Exclude<MobileRoleShell, "super_admin_blocked"> }) {
  const insets = useSafeAreaInsets();
  const tabs = roleTabConfigs[shell];
  const hiddenTabs = roleHiddenTabScreens[shell];
  const contentClearance = tabBarClearance(insets.bottom);

  return (
    <View style={styles.root}>
      <Tabs
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: true,
            sceneStyle: { paddingBottom: contentClearance }
          }}
          tabBar={(props) => <OgtaRoleTabBar shell={shell} {...props} />}
        >
          {tabs.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                tabBarIcon: ({ focused }) => <RoleTabIcon focused={focused} icon={tab.icon} />
              }}
            />
          ))}
          {hiddenTabs.map((tab) => (
            <Tabs.Screen key={tab.name} name={tab.name} options={{ href: null, title: tab.title }} />
          ))}
        </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }
});
