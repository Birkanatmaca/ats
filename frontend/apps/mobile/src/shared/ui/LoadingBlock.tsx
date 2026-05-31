import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "@/shared/theme/colors";

export function LoadingBlock() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 40, alignItems: "center" }
});
