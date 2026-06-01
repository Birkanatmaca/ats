import { LinearGradient } from "expo-linear-gradient";
import { ArrowUpRight, Sparkles } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OgtaAiCosmicBackground } from "@/features/ai/OgtaAiCosmicBackground";
import { useOgtaAi } from "@/features/ai/OgtaAiContext";
import { platformShadow } from "@/shared/ui/platformShadow";

type Props = {
  studentName: string;
  totalNotes: number;
  guidanceNotes: number;
  teacherNotes: number;
  riskCount: number;
};

export function buildStudentAnalysisPrompt({
  studentName,
  totalNotes,
  guidanceNotes,
  teacherNotes,
  riskCount
}: Props) {
  if (totalNotes === 0) {
    return `${studentName} için kayıtlı rehberlik veya öğretmen notu bulunmuyor. Öğrencinin mevcut durumunu değerlendir, rehberlik açısından dikkat edilmesi gereken noktaları ve önerilerini paylaş.`;
  }

  return `${studentName} öğrencisinin rehberlik ve öğretmen notlarına göre kapsamlı analiz yap. Toplam ${totalNotes} kayıt var (${guidanceNotes} rehberlik notu, ${teacherNotes} öğretmen gözlemi${riskCount > 0 ? `, ${riskCount} risk sinyali` : ""}). Özet, risk değerlendirmesi, dikkat edilmesi gereken noktalar ve somut rehberlik önerileri sun.`;
}

export function GuidanceStudentOgtaAiStrip(props: Props) {
  const { openAndSend } = useOgtaAi();
  const prompt = buildStudentAnalysisPrompt(props);

  return (
    <Pressable
      accessibilityHint="ogta.ai ile öğrenci notlarını analiz ettirir"
      accessibilityLabel={`ogta.ai ile ${props.studentName} notlarını analiz et`}
      accessibilityRole="button"
      onPress={() => openAndSend(prompt)}
      style={({ pressed }) => [styles.shell, pressed && styles.shellPressed]}
    >
      <View
        style={[
          styles.card,
          platformShadow("0 16px 36px rgba(49,46,129,0.28)", {
            shadowColor: "#312e81",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.22,
            shadowRadius: 20,
            elevation: 6
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
          <Text style={styles.subtitle}>Öğrenci not analizi</Text>
        </View>

        <Text style={styles.prompt}>
          {props.totalNotes > 0
            ? `${props.totalNotes} nota göre ${props.studentName} için analiz başlat`
            : `${props.studentName} için rehberlik analizi başlat`}
        </Text>

        <LinearGradient
          colors={["rgba(255,255,255,0.14)", "rgba(147,197,253,0.12)"]}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={styles.actionShell}
        >
          <Text style={styles.actionLabel}>Notlara göre analiz et</Text>
          <LinearGradient
            colors={["rgba(124,58,237,0.85)", "rgba(37,99,235,0.85)"]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.actionBtn}
          >
            <ArrowUpRight color="#eef2ff" size={16} strokeWidth={2.4} />
          </LinearGradient>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 20, marginBottom: 14 },
  shellPressed: { opacity: 0.96, transform: [{ scale: 0.996 }] },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
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
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.28)"
  },
  brand: { color: "#f5f3ff", fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },
  subtitle: { color: "rgba(199,210,254,0.78)", fontSize: 12, fontWeight: "600" },
  prompt: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 4
  },
  actionShell: {
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
  actionLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: "#eef2ff" },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.3)"
  }
});
