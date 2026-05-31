import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/shared/auth/AuthContext";
import { colors } from "@/shared/theme/colors";

export default function SuperAdminBlockedScreen() {
  const { signOut, session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function logout() {
    await signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>Mobil panel kullanılamaz</Text>
      <Text style={styles.body}>
        Süper admin işlemleri yalnızca web panel üzerinden yapılır. Lütfen{" "}
        <Text style={styles.link}>panel.ogtasis.com</Text> adresini kullanın.
      </Text>
      {session ? (
        <Text style={styles.meta}>
          {session.principal.name} · {session.principal.email ?? "—"}
        </Text>
      ) : null}
      <Pressable onPress={() => void logout()} style={styles.btn}>
        <Text style={styles.btnText}>Çıkış yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 16, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  link: { color: colors.accent, fontWeight: "600" },
  meta: { fontSize: 13, color: colors.text },
  btn: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" }
});
