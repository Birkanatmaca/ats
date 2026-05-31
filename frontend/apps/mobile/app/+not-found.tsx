import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Sayfa bulunamadı" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Bu ekran mevcut değil.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Ana sayfaya dön</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.background
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: { fontSize: 14, color: colors.accent, fontWeight: "600" }
});
