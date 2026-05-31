import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { AiMessage, AiPendingActionSummary } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";

type ChatItem = AiMessage & {
  candidates?: Array<{ id: string; label: string; meta: string }>;
  pendingAction?: AiPendingActionSummary | null;
};

export function OgtaAiFab({ onActionCompleted }: { onActionCompleted?: () => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const capsQ = useQuery({
    queryKey: queryKeys.aiCapabilities,
    queryFn: () => api.aiCapabilities(),
    enabled: open
  });

  const suggestions = capsQ.data?.suggestions?.length
    ? capsQ.data.suggestions
    : ["Bugünkü derslerimi özetle", "Öğrenci gözlem ekle"];

  const bootstrapMut = useMutation({
    mutationFn: async () => {
      const [conversation, capabilities] = await Promise.all([
        api.createAiConversation({ title: "ogta.ai" }),
        api.aiCapabilities()
      ]);
      setConversationId(conversation.id);
      return capabilities.suggestions ?? [];
    }
  });

  const sendMut = useMutation({
    mutationFn: async ({ content, candidateId }: { content: string; candidateId?: string }) => {
      let id = conversationId;
      if (!id) {
        const conv = await api.createAiConversation({ title: "ogta.ai" });
        id = conv.id;
        setConversationId(id);
      }
      if (content.trim()) {
        setMessages((m) => [...m, { id: `u-${Date.now()}`, conversationId: id!, role: "user", content: content.trim() }]);
      }
      return api.sendAiMessage(id!, { content: content.trim(), selectedCandidateId: candidateId });
    },
    onSuccess: (result) => {
      setMessages((m) => [
        ...m,
        { ...result.message, candidates: result.candidates, pendingAction: result.pendingAction }
      ]);
      setInput("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Mesaj gönderilemedi.")
  });

  const pendingAction = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].pendingAction) return messages[i].pendingAction;
    }
    return null;
  }, [messages]);

  const openSheet = useCallback(() => {
    setOpen(true);
    setError(null);
    if (!conversationId) {
      void bootstrapMut.mutateAsync().catch((e) => setError(e instanceof Error ? e.message : "Başlatılamadı"));
    }
  }, [conversationId, bootstrapMut]);

  return (
    <>
      <Pressable onPress={openSheet} style={[styles.fab, { bottom: insets.bottom + 72 }]}>
        <Text style={styles.fabText}>✦ ogta.ai</Text>
      </Pressable>

      <Modal animationType="slide" visible={open}>
        <View style={[styles.sheet, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>ogta.ai</Text>
              <Text style={styles.sub}>Operasyon asistanı</Text>
            </View>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.close}>Kapat</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
            {bootstrapMut.isPending ? (
              <ActivityIndicator color={colors.accent} />
            ) : messages.length === 0 ? (
              <>
                <Text style={styles.hint}>Doğal dille komut verin. Yazma işlemleri onay ile tamamlanır.</Text>
                {suggestions.map((s) => (
                  <Pressable key={s} onPress={() => sendMut.mutate({ content: s })} style={styles.suggestion}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </>
            ) : (
              messages.map((m) => (
                <View key={m.id} style={[styles.bubble, m.role === "user" && styles.bubbleUser]}>
                  <Text style={m.role === "user" ? styles.bubbleTextUser : styles.bubbleText}>{m.content}</Text>
                  {m.candidates?.map((c) => (
                    <Pressable key={c.id} onPress={() => sendMut.mutate({ content: "", candidateId: c.id })} style={styles.candidate}>
                      <Text style={styles.candidateTitle}>{c.label}</Text>
                      <Text style={styles.candidateMeta}>{c.meta}</Text>
                    </Pressable>
                  ))}
                </View>
              ))
            )}

            {pendingAction ? (
              <View style={styles.actionCard}>
                <Text style={styles.actionTitle}>Onay bekleyen işlem</Text>
                <Text style={styles.actionBody}>{pendingAction.summary}</Text>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => {
                      void api.cancelAiAction(pendingAction.id).then(() => {
                        setMessages((m) => m.map((item) => ({ ...item, pendingAction: null })));
                      });
                    }}
                    style={styles.actionBtnGhost}
                  >
                    <Text>{pendingAction.cancelLabel}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void api.confirmAiAction(pendingAction.id).then((r) => {
                        setMessages((m) => [
                          ...m.map((item) => ({ ...item, pendingAction: null })),
                          r.message
                        ]);
                        onActionCompleted?.();
                      });
                    }}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>{pendingAction.confirmLabel}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              editable={!sendMut.isPending}
              multiline
              onChangeText={setInput}
              placeholder="Örn: Bugünkü yoklamayı özetle"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={input}
            />
            <Pressable
              disabled={sendMut.isPending || !input.trim()}
              onPress={() => sendMut.mutate({ content: input })}
              style={styles.send}
            >
              {sendMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>→</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 100
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  sheet: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
  close: { color: colors.accent, fontWeight: "600" },
  body: { flex: 1, paddingHorizontal: 16 },
  hint: { fontSize: 13, color: colors.textMuted },
  suggestion: { backgroundColor: colors.surface, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  suggestionText: { color: colors.text, fontSize: 14 },
  bubble: { backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 8 },
  bubbleUser: { backgroundColor: colors.primary, borderColor: colors.primary, alignSelf: "flex-end", maxWidth: "90%" },
  bubbleText: { color: colors.text, fontSize: 14 },
  bubbleTextUser: { color: "#fff", fontSize: 14 },
  candidate: { backgroundColor: "#f8fafc", padding: 8, borderRadius: 8 },
  candidateTitle: { fontWeight: "600", fontSize: 13, color: colors.text },
  candidateMeta: { fontSize: 11, color: colors.textMuted },
  actionCard: { backgroundColor: "#fffbeb", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fde68a", gap: 8 },
  actionTitle: { fontWeight: "700", color: colors.text },
  actionBody: { fontSize: 13, color: colors.text },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtnGhost: { flex: 1, padding: 10, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  actionBtn: { flex: 1, padding: 10, alignItems: "center", borderRadius: 8, backgroundColor: colors.accent },
  actionBtnText: { color: "#fff", fontWeight: "700" },
  error: { color: colors.danger },
  composer: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 8, alignItems: "flex-end" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    maxHeight: 100,
    backgroundColor: colors.surface,
    color: colors.text
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  sendText: { color: "#fff", fontSize: 20, fontWeight: "700" }
});
