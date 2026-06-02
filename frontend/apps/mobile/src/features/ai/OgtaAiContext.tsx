import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { Modal, StyleSheet, View } from "react-native";
import { OgtaAiChatView, type ChatItem } from "@/features/ai/OgtaAiChatView";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";

type OgtaAiContextValue = {
  open: (seedPrompt?: string) => void;
  openAndSend: (prompt: string) => void;
  close: () => void;
  isOpen: boolean;
};

const OgtaAiContext = createContext<OgtaAiContextValue | null>(null);

export function OgtaAiProvider({
  children,
  onActionCompleted
}: {
  children: ReactNode;
  onActionCompleted?: () => void;
}) {
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
    : ["Bugünkü derslerimi özetle", "Öğrenci gözlem ekle", "Yoklama durumunu kontrol et"];

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
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Mesaj gönderilemedi.")
  });

  const pendingAction = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const action = messages[i].pendingAction;
      if (action) return action;
    }
    return null;
  }, [messages]);

  const openSheet = useCallback(
    (seedPrompt?: string) => {
      setOpen(true);
      setError(null);
      if (seedPrompt?.trim()) {
        setInput(seedPrompt.trim());
      }
      if (!conversationId) {
        void bootstrapMut.mutateAsync().catch((e) => setError(e instanceof Error ? e.message : "Başlatılamadı"));
      }
    },
    [conversationId, bootstrapMut]
  );

  const openAndSend = useCallback(
    (prompt: string) => {
      const content = prompt.trim();
      if (!content) return;
      setConversationId(null);
      setMessages([]);
      setOpen(true);
      setError(null);
      setInput("");
      sendMut.mutate({ content });
    },
    [sendMut]
  );

  const closeSheet = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open: openSheet, openAndSend, close: closeSheet, isOpen: open }),
    [openSheet, openAndSend, closeSheet, open]
  );

  return (
    <OgtaAiContext.Provider value={value}>
      {children}
      <Modal animationType="slide" presentationStyle="fullScreen" statusBarTranslucent visible={open}>
        <View style={styles.modalRoot}>
          <OgtaAiChatView
            bootstrapping={bootstrapMut.isPending && messages.length === 0}
            error={error}
            input={input}
            messages={messages}
            onCancelAction={() => {
              if (!pendingAction) return;
              void api.cancelAiAction(pendingAction.id).then(() => {
                setMessages((m) => m.map((item) => ({ ...item, pendingAction: null })));
              });
            }}
            onClose={closeSheet}
            onConfirmAction={() => {
              if (!pendingAction) return;
              void api.confirmAiAction(pendingAction.id).then((r) => {
                setMessages((m) => [...m.map((item) => ({ ...item, pendingAction: null })), r.message]);
                onActionCompleted?.();
              });
            }}
            onInputChange={setInput}
            onSelectCandidate={(candidateId) => sendMut.mutate({ content: "", candidateId })}
            onSend={() => sendMut.mutate({ content: input })}
            onSuggestion={(text) => sendMut.mutate({ content: text })}
            pendingAction={pendingAction}
            sending={sendMut.isPending}
            suggestions={suggestions}
            visible={open}
          />
        </View>
      </Modal>
    </OgtaAiContext.Provider>
  );
}

export function useOgtaAi() {
  const ctx = useContext(OgtaAiContext);
  if (!ctx) {
    throw new Error("useOgtaAi must be used within OgtaAiProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: "#172554" }
});
