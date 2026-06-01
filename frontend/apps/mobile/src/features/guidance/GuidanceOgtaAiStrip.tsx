import { LinearGradient } from "expo-linear-gradient";
import { ArrowUpRight, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OgtaAiCosmicBackground } from "@/features/ai/OgtaAiCosmicBackground";
import { useOgtaAi } from "@/features/ai/OgtaAiContext";
import { platformShadow } from "@/shared/ui/platformShadow";

const PROMPTS = [
  "Yüksek riskli öğrenci var mı?",
  "Son gözlemleri özetler misin?",
  "Devamsızlık eğilimi olan öğrenciler kim?",
  "Rehberlik notu eklemek istiyorum",
  "Hangi öğrenciye öncelik vermeliyim?",
  "Davranış sinyali olan öğrencileri listele"
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

export function GuidanceOgtaAiStrip() {
  const { open } = useOgtaAi();
  const prompt = usePromptRotation();

  return (
    <Pressable
      accessibilityHint="ogta.ai rehberlik asistanını açar"
      accessibilityLabel={`ogta.ai rehberlik asistanın. ${prompt}`}
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
          <Text style={styles.subtitle}>Rehberlik asistanın</Text>
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
  shell: {
    borderRadius: 24
  },
  shellPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.996 }]
  },
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
  header: {
    alignItems: "center",
    gap: 4
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  sparkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.28)"
  },
  brand: {
    color: "#f5f3ff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.4
  },
  subtitle: {
    color: "rgba(199,210,254,0.78)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center"
  },
  prompt: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    letterSpacing: -0.1,
    textAlign: "center",
    paddingHorizontal: 6
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 5,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.22)"
  },
  inputPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: "rgba(219,234,254,0.78)",
    fontWeight: "500"
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.3)"
  }
});
