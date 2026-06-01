import { LinearGradient } from "expo-linear-gradient";
import { ArrowUpRight, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OgtaAiCosmicBackground } from "@/features/ai/OgtaAiCosmicBackground";
import { useOgtaAi } from "@/features/ai/OgtaAiContext";
import { platformShadow } from "@/shared/ui/platformShadow";

const PROMPTS = [
  "Bugünkü derslerimi özetler misin?",
  "Yoklama almam gereken ders hangisi?",
  "Sınıfımda dikkat çeken öğrenci var mı?",
  "Gözlem notu yazmama yardım et",
  "Bu hafta hangi öğrenciye not girmeliyim?",
  "Devamsızlık eğilimi olan öğrenciler kim?"
] as const;

const ROTATE_MS = 30 * 60 * 1000;

function promptIndex(): number {
  return Math.floor(Date.now() / ROTATE_MS) % PROMPTS.length;
}

function usePromptRotation(): string {
  const [index, setIndex] = useState(promptIndex);

  useEffect(() => {
    const sync = () => setIndex(promptIndex());
    const msUntilNext = ROTATE_MS - (Date.now() % ROTATE_MS);
    let interval: ReturnType<typeof setInterval> | undefined;

    const timeout = setTimeout(() => {
      sync();
      interval = setInterval(sync, ROTATE_MS);
    }, msUntilNext);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return PROMPTS[index];
}

export function TeacherOgtaAiStrip() {
  const { open } = useOgtaAi();
  const prompt = usePromptRotation();

  return (
    <Pressable
      accessibilityHint="ogta.ai eğitim asistanını açar"
      accessibilityLabel={`ogta.ai eğitim asistanın. ${prompt}`}
      accessibilityRole="button"
      onPress={() => open(prompt)}
      style={({ pressed }) => [styles.shell, pressed && styles.shellPressed]}
    >
      <View
        style={[
          styles.card,
          platformShadow("0 20px 44px rgba(49,46,129,0.34)", {
            shadowColor: "#312e81",
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.28,
            shadowRadius: 26,
            elevation: 8
          })
        ]}
      >
        <OgtaAiCosmicBackground />

        <View style={styles.header}>
          <View style={styles.brandRow}>
            <LinearGradient
              colors={["rgba(167,139,250,0.35)", "rgba(96,165,250,0.22)"]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.sparkWrap}
            >
              <Sparkles color="#e9d5ff" size={15} strokeWidth={2.2} />
            </LinearGradient>
            <Text style={styles.brand}>ogta.ai</Text>
          </View>
          <Text style={styles.subtitle}>Sınıf asistanın</Text>
        </View>

        <Text style={styles.prompt}>{prompt}</Text>

        <LinearGradient
          colors={["rgba(255,255,255,0.14)", "rgba(147,197,253,0.12)"]}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={styles.inputShell}
        >
          <Text numberOfLines={1} style={styles.inputPlaceholder}>
            Sorunu yaz, birlikte çözelim…
          </Text>
          <LinearGradient
            colors={["rgba(124,58,237,0.72)", "rgba(37,99,235,0.72)"]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.sendBtn}
          >
            <ArrowUpRight color="#eef2ff" size={16} strokeWidth={2.4} />
          </LinearGradient>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 24, marginBottom: 12 },
  shellPressed: { opacity: 0.96, transform: [{ scale: 0.996 }] },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.18)",
    backgroundColor: "#172554"
  },
  header: { alignItems: "center", gap: 4 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sparkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  brand: { color: "#eef2ff", fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { color: "rgba(199,210,254,0.82)", fontSize: 12, fontWeight: "600" },
  prompt: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  inputPlaceholder: { flex: 1, color: "rgba(226,232,240,0.72)", fontSize: 13, fontWeight: "500" },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  }
});
