import { RefreshControl, ScrollView, StyleSheet, Text, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tabBarClearance } from "@/shared/navigation/tabBarMetrics";
import { colors } from "@/shared/theme/colors";

type ScreenProps = ViewProps & {
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Tab bar olan ekranlar vs stack detay ekranlari */
  layout?: "tab" | "stack";
  /** Safe area ustune ek bosluk (hero kartlar icin) */
  topInsetExtra?: number;
  children: React.ReactNode;
};

export function Screen({
  title,
  subtitle,
  refreshing,
  onRefresh,
  layout = "tab",
  topInsetExtra = 0,
  children,
  style,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = layout === "stack" ? insets.bottom + 20 : tabBarClearance(insets.bottom) + 8;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: insets.top + 12 + topInsetExtra,
          paddingBottom: bottomPadding
        }
      ]}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined
      }
      style={[styles.root, style]}
      {...rest}
    >
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 16, gap: 12 },
  header: { marginBottom: 4, gap: 4 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted }
});
