import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/shared/api/client";
import { colors } from "@/shared/theme/colors";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const token = useMemo(() => {
    const raw = params.token;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
  }, [params.token]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.passwordReset({ token, newPassword: password });
      setSuccess(response.message);
      setTimeout(() => router.replace("/(auth)/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şifre sıfırlanamadı.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <View style={[styles.invalidRoot, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.error}>Geçersiz sıfırlama bağlantısı.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/(auth)/forgot-password")}>
          <Text style={styles.backText}>Yeni bağlantı iste</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Yeni şifre belirle</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Text style={styles.label}>Yeni şifre</Text>
          <TextInput onChangeText={setPassword} secureTextEntry style={styles.input} value={password} />

          <Text style={styles.label}>Yeni şifre (tekrar)</Text>
          <TextInput onChangeText={setConfirm} secureTextEntry style={styles.input} value={confirm} />

          <Pressable disabled={loading} onPress={() => void submit()} style={[styles.btn, loading && styles.btnDisabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Şifreyi güncelle</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  invalidRoot: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, gap: 12 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: "700", color: "#64748b", letterSpacing: 0.4, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background
  },
  btn: { marginTop: 4, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  btnDisabled: { opacity: 0.75 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  success: {
    color: "#047857",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" }
});
