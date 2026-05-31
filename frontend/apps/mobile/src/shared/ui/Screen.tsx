import { RefreshControl, ScrollView, StyleSheet, Text, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/shared/theme/colors";

type ScreenProps = ViewProps & {
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
};

export function Screen({ title, subtitle, refreshing, onRefresh, children, style, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
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
