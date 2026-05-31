import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { resolveMobileShell, shellHref } from "@/shared/auth/roleRoutes";
import { colors } from "@/shared/theme/colors";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const session = await api.login({ email: email.trim(), password });
      await signIn(session);
      if (session.principal.mustChangePassword) {
        router.replace("/(auth)/first-login");
        return;
      }
      const shell = resolveMobileShell(session.principal.role);
      router.replace(shellHref(shell));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.brand}>
        <Text style={styles.logo}>OGTAŞIS</Text>
        <Text style={styles.tagline}>Okul yönetim mobil paneli</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Giriş yap</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>E-posta</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="ornek@kurum.com"
          style={styles.input}
          value={email}
        />

        <Text style={styles.label}>Şifre</Text>
        <TextInput
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        <Pressable disabled={loading} onPress={() => void submit()} style={[styles.btn, loading && styles.btnDisabled]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Giriş yap</Text>}
        </Pressable>
      </View>

      <Text style={styles.hint}>Süper admin hesapları için web paneli kullanın.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, justifyContent: "center", gap: 20 },
  brand: { alignItems: "center", gap: 6 },
  logo: { fontSize: 28, fontWeight: "800", color: colors.primary, letterSpacing: 1 },
  tagline: { fontSize: 14, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#f8fafc"
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: colors.danger, fontSize: 13 },
  hint: { textAlign: "center", fontSize: 12, color: colors.textMuted }
});
