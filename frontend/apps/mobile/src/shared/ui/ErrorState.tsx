import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Bir hata oluştu</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.btn}>
          <Text style={styles.btnText}>Tekrar dene</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    gap: 8
  },
  title: { fontSize: 15, fontWeight: "700", color: colors.danger },
  message: { fontSize: 13, color: colors.text },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 13 }
});
