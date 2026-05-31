import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { resolveMobileShell, shellHref } from "@/shared/auth/roleRoutes";
import { colors } from "@/shared/theme/colors";

export default function FirstLoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await api.changePassword({ newPassword: password });
      await signIn(session);
      const shell = resolveMobileShell(session.principal.role);
      router.replace(shellHref(shell));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şifre güncellenemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Yeni şifre belirleyin</Text>
      <Text style={styles.subtitle}>İlk girişte güvenlik için şifrenizi değiştirmeniz gerekir.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Yeni şifre</Text>
      <TextInput onChangeText={setPassword} secureTextEntry style={styles.input} value={password} />

      <Text style={styles.label}>Şifre tekrar</Text>
      <TextInput onChangeText={setConfirm} secureTextEntry style={styles.input} value={confirm} />

      <Pressable disabled={loading} onPress={() => void submit()} style={[styles.btn, loading && styles.btnDisabled]}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Kaydet ve devam et</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, gap: 10, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.surface
  },
  btn: { marginTop: 12, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: "#fff", fontWeight: "700" },
  error: { color: colors.danger, fontSize: 13 }
});
