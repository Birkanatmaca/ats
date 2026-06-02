import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { useAuth } from "@/shared/auth/AuthContext";
import { resolveMobileShell, shellHref } from "@/shared/auth/roleRoutes";
import { colors } from "@/shared/theme/colors";
import { platformShadow } from "@/shared/ui/platformShadow";

const LOGO = require("../../assets/images/ogta-wordmark.png");

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
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={[styles.backdrop, styles.backdropEvents]}>
        <View style={styles.glowTopRight} />
        <View style={styles.glowBottomLeft} />
        <View style={styles.ring} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              platformShadow("0 20px 32px rgba(0,0,0,0.22)", {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.22,
                shadowRadius: 32,
                elevation: 12
              })
            ]}
          >
            <View style={styles.logoWrap}>
              <Image accessibilityLabel="OGTA" resizeMode="contain" source={LOGO} style={styles.logo} />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.field}>
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
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/forgot-password")} style={styles.forgotLink}>
              <Text style={styles.forgotText}>Şifremi unuttum</Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={() => void submit()}
              style={[
                styles.btn,
                loading && styles.btnDisabled,
                platformShadow("0 8px 16px rgba(90,143,201,0.32)", {
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  elevation: 6
                })
              ]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Giriş yap</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden"
  },
  backdropEvents: {
    pointerEvents: "none"
  },
  glowTopRight: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: colors.accentWarm,
    opacity: 0.42
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: -100,
    left: -70,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    opacity: 0.24
  },
  ring: {
    position: "absolute",
    top: "18%",
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  root: {
    flex: 1
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    gap: 20
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    gap: 16
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 4
  },
  logo: {
    width: 172,
    height: 54
  },
  field: {
    gap: 6
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
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
  btn: {
    marginTop: 4,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center"
  },
  btnDisabled: { opacity: 0.75 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.2 },
  forgotLink: { alignSelf: "center", paddingVertical: 2 },
  forgotText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    overflow: "hidden"
  }
});
