import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/shared/theme/colors";

type DetailBackBarProps = {
  label: string;
  onPress?: () => void;
};

export function DetailBackBar({ label, onPress }: DetailBackBarProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel={`${label}, geri dön`}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress ?? (() => router.back())}
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
    >
      <ChevronLeft color={colors.accent} size={20} strokeWidth={2.4} />
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  wrapPressed: {
    opacity: 0.88,
    backgroundColor: colors.accentLight
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
    maxWidth: 220
  }
});
