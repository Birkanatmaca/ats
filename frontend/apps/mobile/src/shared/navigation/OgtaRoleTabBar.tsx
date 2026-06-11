import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOgtaAi } from "@/features/ai/OgtaAiContext";
import { RoleTabIcon } from "@/shared/navigation/RoleTabIcon";
import { roleTabConfigs, type TabbedRoleShell, type TabConfig } from "@/shared/navigation/roleTabs";
import {
  TAB_BAR_CENTER_CIRCLE,
  TAB_BAR_CENTER_OVERHANG,
  TAB_BAR_CENTER_SLOT,
  TAB_BAR_FLOAT_GAP,
  TAB_BAR_HEIGHT,
  TAB_BAR_HORIZONTAL_INSET
} from "@/shared/navigation/tabBarMetrics";
import { colors } from "@/shared/theme/colors";
import { platformShadow } from "@/shared/ui/platformShadow";

import { OGTA_GRADIENT, OGTA_GRADIENT_LOCATIONS } from "@/features/ai/ogtaAiTheme";

type Props = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented?: boolean };
    navigate: (name: string, params?: object) => void;
  };
  shell: TabbedRoleShell;
};

export function OgtaRoleTabBar(props: Props) {
  const { state, descriptors, navigation, shell } = props;
  const insets = useSafeAreaInsets();
  const { open } = useOgtaAi();
  const tabs = roleTabConfigs[shell];
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2, 4);

  function renderTab(tab: TabConfig) {
    const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
    if (routeIndex === -1) return null;

    const route = state.routes[routeIndex];
    const focused = state.index === routeIndex;
    const { options } = descriptors[route.key];
    const label = options.title ?? tab.title;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true
      });

      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <Pressable
        key={tab.name}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        onPress={onPress}
        style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
      >
        <RoleTabIcon focused={focused} icon={tab.icon} />
        <Text numberOfLines={1} style={[styles.label, focused && styles.labelActive]}>
          {label}
        </Text>
        {focused ? <View style={styles.activeDot} /> : <View style={styles.dotSpacer} />}
      </Pressable>
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom: insets.bottom + TAB_BAR_FLOAT_GAP }]}>
      <View
        style={[
          styles.bar,
          platformShadow("0 12px 28px rgba(28,53,87,0.12)", {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10
          })
        ]}
      >
        <View style={styles.side}>{leftTabs.map(renderTab)}</View>
        <View style={styles.centerSlot} />
        <View style={styles.side}>{rightTabs.map(renderTab)}</View>
      </View>

      <Pressable
        accessibilityHint="ogta.ai eğitim asistanını açar"
        accessibilityLabel="ogta.ai"
        accessibilityRole="button"
        onPress={() => open()}
        style={({ pressed }) => [styles.centerWrap, pressed && styles.centerWrapPressed]}
      >
        <LinearGradient
          colors={[...OGTA_GRADIENT]}
          end={{ x: 1, y: 1 }}
          locations={[...OGTA_GRADIENT_LOCATIONS]}
          start={{ x: 0, y: 0 }}
          style={[
            styles.centerCircle,
            platformShadow("0 10px 22px rgba(49,46,129,0.34)", {
              shadowColor: "#312e81",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.28,
              shadowRadius: 14,
              elevation: 12
            })
          ]}
        >
          <Sparkles color="#e9d5ff" size={28} strokeWidth={2.2} />
        </LinearGradient>
        <Text pointerEvents="none" style={styles.centerLabel}>
          ogta.ai
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: TAB_BAR_HORIZONTAL_INSET,
    right: TAB_BAR_HORIZONTAL_INSET,
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible"
  },
  bar: {
    width: "100%",
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6
  },
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly"
  },
  centerSlot: {
    width: TAB_BAR_CENTER_SLOT
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 46,
    paddingTop: 2
  },
  tabPressed: {
    opacity: 0.72
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.1
  },
  labelActive: {
    color: colors.accent,
    fontWeight: "800"
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 1
  },
  dotSpacer: {
    width: 4,
    height: 4,
    marginTop: 1
  },
  centerWrap: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: TAB_BAR_CENTER_SLOT,
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    zIndex: 10
  },
  centerWrapPressed: {
    opacity: 0.92
  },
  centerCircle: {
    position: "absolute",
    top: -TAB_BAR_CENTER_OVERHANG,
    width: TAB_BAR_CENTER_CIRCLE,
    height: TAB_BAR_CENTER_CIRCLE,
    borderRadius: TAB_BAR_CENTER_CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.surface,
    overflow: "hidden"
  },
  centerLabel: {
    position: "absolute",
    bottom: 7,
    color: "#4338ca",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3
  }
});
