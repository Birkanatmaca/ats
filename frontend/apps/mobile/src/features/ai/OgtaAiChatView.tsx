import { LinearGradient } from "expo-linear-gradient";
import { ArrowUpRight, ChevronDown, Sparkles, Wand2 } from "lucide-react-native";
import { useEffect, useRef } from "react";
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
import { OgtaAiCosmicBackground } from "@/features/ai/OgtaAiCosmicBackground";
import type { AiMessage, AiPendingActionSummary } from "@/shared/api/types";

export type ChatItem = AiMessage & {
  candidates?: Array<{ id: string; label: string; meta: string }>;
  pendingAction?: AiPendingActionSummary | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  messages: ChatItem[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSuggestion: (text: string) => void;
  onSelectCandidate: (candidateId: string) => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  suggestions: string[];
  pendingAction: AiPendingActionSummary | null;
  bootstrapping: boolean;
  sending: boolean;
  error: string | null;
};

export function OgtaAiChatView({
  visible,
  onClose,
  messages,
  input,
  onInputChange,
  onSend,
  onSuggestion,
  onSelectCandidate,
  onConfirmAction,
  onCancelAction,
  suggestions,
  pendingAction,
  bootstrapping,
  sending,
  error
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const topInset = insets.top + (Platform.OS === "web" ? 14 : 18);
  const bottomInset = Math.max(insets.bottom, Platform.OS === "web" ? 12 : 0) + 18;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [visible, messages.length, pendingAction, bootstrapping]);

  if (!visible) return null;

  return (
    <View style={styles.root}>
      <OgtaAiCosmicBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? topInset : 0}
        style={styles.flex}
      >
        <View style={[styles.header, { paddingTop: topInset }]}>
          <Pressable
            accessibilityLabel="Kapat"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
          >
            <ChevronDown color="#e9d5ff" size={22} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.headerCenter}>
            <LinearGradient
              colors={["rgba(167,139,250,0.35)", "rgba(96,165,250,0.22)"]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.sparkWrap}
            >
              <Sparkles color="#e9d5ff" size={16} strokeWidth={2.2} />
            </LinearGradient>
            <View style={styles.headerCopy}>
              <Text style={styles.brand}>ogta.ai</Text>
              <Text style={styles.subtitle}>Eğitim asistanın</Text>
            </View>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.chatScroll}
        >
          {bootstrapping ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#c4b5fd" size="large" />
              <Text style={styles.loadingText}>Asistan hazırlanıyor…</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Wand2 color="#e9d5ff" size={24} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyTitle}>Merhaba, nasıl yardımcı olabilirim?</Text>
              <Text style={styles.emptyHint}>Doğal dille sorun. Yazma işlemleri onay ile tamamlanır.</Text>
              <View style={styles.suggestionGrid}>
                {suggestions.map((s) => (
                  <Pressable key={s} onPress={() => onSuggestion(s)} style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={[styles.messageRow, m.role === "user" && styles.messageRowUser]}>
                {m.role !== "user" ? (
                  <View style={styles.assistantAvatar}>
                    <Sparkles color="#e9d5ff" size={14} strokeWidth={2.2} />
                  </View>
                ) : null}
                <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant]}>
                  {m.role === "user" ? (
                    <Text style={styles.bubbleTextUser}>{m.content}</Text>
                  ) : (
                    <Text style={styles.bubbleTextAssistant}>{m.content}</Text>
                  )}
                  {m.candidates?.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => onSelectCandidate(c.id)}
                      style={({ pressed }) => [styles.candidate, pressed && styles.candidatePressed]}
                    >
                      <Text style={styles.candidateTitle}>{c.label}</Text>
                      <Text style={styles.candidateMeta}>{c.meta}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}

          {pendingAction ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionEyebrow}>Onay bekleyen işlem</Text>
              <Text style={styles.actionBody}>{pendingAction.summary}</Text>
              <View style={styles.actionRow}>
                <Pressable onPress={onCancelAction} style={({ pressed }) => [styles.actionBtnGhost, pressed && styles.btnPressed]}>
                  <Text style={styles.actionBtnGhostText}>{pendingAction.cancelLabel}</Text>
                </Pressable>
                <Pressable onPress={onConfirmAction} style={({ pressed }) => [styles.actionBtn, pressed && styles.btnPressed]}>
                  <Text style={styles.actionBtnText}>{pendingAction.confirmLabel}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {sending ? (
            <View style={styles.typingRow}>
              <View style={styles.assistantAvatar}>
                <Sparkles color="#e9d5ff" size={14} strokeWidth={2.2} />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator color="#c4b5fd" size="small" />
                <Text style={styles.typingText}>Yanıt yazılıyor…</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.composerWrap, { paddingBottom: bottomInset }]}>
          <LinearGradient
            colors={["rgba(255,255,255,0.14)", "rgba(147,197,253,0.12)"]}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={styles.composerShell}
          >
            <TextInput
              editable={!sending}
              multiline
              onChangeText={onInputChange}
              placeholder="Sorunu yaz, birlikte çözelim…"
              placeholderTextColor="rgba(219,234,254,0.72)"
              scrollEnabled
              style={[styles.composerInput, Platform.OS === "web" && styles.composerInputWeb]}
              textAlignVertical="center"
              value={input}
            />
            <Pressable
              disabled={sending || !input.trim()}
              onPress={onSend}
              style={({ pressed }) => [styles.sendBtnWrap, (sending || !input.trim()) && styles.sendBtnDisabled, pressed && styles.btnPressed]}
            >
              <LinearGradient
                colors={["rgba(124,58,237,0.92)", "rgba(37,99,235,0.92)"]}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={styles.sendBtn}
              >
                {sending ? (
                  <ActivityIndicator color="#eef2ff" size="small" />
                ) : (
                  <ArrowUpRight color="#eef2ff" size={18} strokeWidth={2.4} />
                )}
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#172554"
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.2)"
  },
  closeBtnPressed: { opacity: 0.85 },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  headerSpacer: { width: 40 },
  sparkWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.28)"
  },
  headerCopy: { gap: 1 },
  brand: { color: "#f5f3ff", fontSize: 18, fontWeight: "800", letterSpacing: 0.3 },
  subtitle: { color: "rgba(199,210,254,0.78)", fontSize: 11, fontWeight: "600" },
  chatScroll: { flex: 1 },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12
  },
  loadingWrap: { alignItems: "center", gap: 12, paddingTop: 48 },
  loadingText: { color: "rgba(219,234,254,0.82)", fontSize: 14, fontWeight: "600" },
  emptyWrap: { alignItems: "center", gap: 12, paddingTop: 24, paddingHorizontal: 8 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.22)"
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.2
  },
  emptyHint: {
    color: "rgba(199,210,254,0.82)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontWeight: "500"
  },
  suggestionGrid: { width: "100%", gap: 8, marginTop: 8 },
  suggestion: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.22)",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  suggestionPressed: { backgroundColor: "rgba(255,255,255,0.14)" },
  suggestionText: { color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "600", lineHeight: 20 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "100%" },
  messageRowUser: { justifyContent: "flex-end" },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.2)"
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8
  },
  bubbleUser: {
    backgroundColor: "rgba(124,58,237,0.88)",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.35)"
  },
  bubbleAssistant: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.22)"
  },
  bubbleTextUser: { color: "#fff", fontSize: 15, lineHeight: 21, fontWeight: "500" },
  bubbleTextAssistant: { color: "rgba(255,255,255,0.94)", fontSize: 15, lineHeight: 21, fontWeight: "500" },
  candidate: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.18)"
  },
  candidatePressed: { opacity: 0.9 },
  candidateTitle: { fontWeight: "700", fontSize: 13, color: "#f5f3ff" },
  candidateMeta: { fontSize: 11, color: "rgba(199,210,254,0.78)", marginTop: 2 },
  actionCard: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.28)",
    padding: 14,
    gap: 10
  },
  actionEyebrow: { fontSize: 11, fontWeight: "800", color: "#fde68a", textTransform: "uppercase", letterSpacing: 0.4 },
  actionBody: { fontSize: 14, lineHeight: 20, color: "#fff", fontWeight: "500" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtnGhost: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  actionBtnGhostText: { color: "rgba(255,255,255,0.88)", fontWeight: "700", fontSize: 13 },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "rgba(124,58,237,0.9)"
  },
  actionBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  errorCard: {
    backgroundColor: "rgba(239,68,68,0.14)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(252,165,165,0.35)",
    padding: 12
  },
  errorText: { color: "#fecaca", fontSize: 13, fontWeight: "600" },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  typingText: { color: "rgba(199,210,254,0.82)", fontSize: 12, fontWeight: "600" },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(165,180,252,0.14)",
    backgroundColor: "rgba(15,23,42,0.42)"
  },
  composerShell: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 56,
    borderWidth: 1,
    borderColor: "rgba(165,180,252,0.28)"
  },
  composerInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: "#fff",
    maxHeight: 132,
    minHeight: 40,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    fontWeight: "500"
  },
  composerInputWeb: {
    outlineStyle: "none"
  } as object,
  sendBtnWrap: { marginBottom: 4 },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.3)"
  },
  btnPressed: { opacity: 0.88 }
});
