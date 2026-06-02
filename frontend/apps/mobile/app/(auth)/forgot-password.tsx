import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; resetToken?: string } | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.passwordForgot({ email: email.trim() });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İstek gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Şifremi unuttum</Text>
          <Text style={styles.subtitle}>Kayıtlı e-posta adresinize sıfırlama bağlantısı gönderilir.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {result ? (
            <View style={styles.success}>
              <Text style={styles.successText}>{result.message}</Text>
              {result.resetToken ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/(auth)/reset-password",
                      params: { token: result.resetToken }
                    })
                  }
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkBtnText}>Şifreyi sıfırla</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="ornek@kurum.com"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={email}
          />

          <Pressable disabled={loading} onPress={() => void submit()} style={[styles.btn, loading && styles.btnDisabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sıfırlama bağlantısı gönder</Text>}
          </Pressable>

          <Pressable accessibilityRole="button" onPress={() => router.replace("/(auth)/login")} style={styles.backLink}>
            <Text style={styles.backText}>Giriş sayfasına dön</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
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
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    padding: 12,
    gap: 8
  },
  successText: { color: "#047857", fontSize: 13 },
  linkBtn: { alignSelf: "flex-start" },
  linkBtnText: { color: colors.accent, fontWeight: "700", fontSize: 14 },
  backLink: { alignSelf: "center", marginTop: 4 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" }
});
