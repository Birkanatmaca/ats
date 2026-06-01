import { Pressable, StyleSheet, Text } from "react-native";
import { useOgtaAi } from "@/features/ai/OgtaAiContext";
import { colors } from "@/shared/theme/colors";
import { platformShadow } from "@/shared/ui/platformShadow";

export function OgtaAiFab({ tabBarClearance = 88 }: { tabBarClearance?: number }) {
  const { open } = useOgtaAi();

  return (
    <Pressable
      onPress={() => open()}
      style={[
        styles.fab,
        { bottom: tabBarClearance - 8 },
        platformShadow("0 2px 6px rgba(0,0,0,0.2)", {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 4
        })
      ]}
    >
      <Text style={styles.fabText}>✦ ogta.ai</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 100
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 13 }
});
