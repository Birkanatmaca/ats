import { Bot, Loader2, SendHorizontal, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AiCandidate, AiMessage, AiPendingActionSummary, AiUsageSummary } from "../../lib/api";
import { api } from "../../lib/api";
import "./OgtaAiDock.css";

type ChatItem = AiMessage & {
  candidates?: AiCandidate[];
  pendingAction?: AiPendingActionSummary | null;
};

export function OgtaAiDock({ onActionCompleted }: { onActionCompleted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Bugünkü derslerimi özetle",
    "Öğrenci gözlemi ekle"
  ]);
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);

  const ensureConversation = useCallback(async () => {
    if (conversationId) {
      return conversationId;
    }
    setBootstrapping(true);
    try {
      const [conversation, capabilities] = await Promise.all([api.createAiConversation({ title: "ogta.ai" }), api.aiCapabilities()]);
      setConversationId(conversation.id);
      if (capabilities.suggestions?.length) {
        setSuggestions(capabilities.suggestions);
      }
      return conversation.id;
    } finally {
      setBootstrapping(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!open || conversationId) {
      return;
    }
    void ensureConversation().catch((bootstrapError) => {
      setError(bootstrapError instanceof Error ? bootstrapError.message : "ogta.ai başlatılamadı.");
    });
  }, [conversationId, ensureConversation, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void api.aiUsage().then(setUsage).catch(() => setUsage(null));
  }, [open, messages.length]);

  const pendingAction = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].pendingAction) {
        return messages[index].pendingAction;
      }
    }
    return null;
  }, [messages]);

  async function sendMessage(content: string, selectedCandidateId?: string) {
    const trimmed = content.trim();
    if (!trimmed && !selectedCandidateId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const id = await ensureConversation();
      const assistantId = `assistant-${Date.now()}`;
      if (trimmed) {
        setMessages((current) => [...current, { id: `local-${Date.now()}`, conversationId: id, role: "user", content: trimmed }]);
        setMessages((current) => [...current, { id: assistantId, conversationId: id, role: "assistant", content: "" }]);
      }

      if (selectedCandidateId) {
        const result = await api.sendAiMessage(id, { content: trimmed, selectedCandidateId });
        setMessages((current) => [...current, { ...result.message, candidates: result.candidates, pendingAction: result.pendingAction }]);
        setInput("");
        return;
      }

      let streamed = "";
      await api.sendAiMessageStream(id, { content: trimmed, selectedCandidateId }, (event) => {
        if (event.type === "token" && event.delta) {
          streamed += event.delta;
          setMessages((current) =>
            current.map((item) => (item.id === assistantId ? { ...item, content: streamed } : item))
          );
        }
        if (event.type === "done" && event.message) {
          const finalItem: ChatItem = {
            ...event.message,
            candidates: event.candidates,
            pendingAction: event.pendingAction
          };
          setMessages((current) => current.filter((item) => item.id !== assistantId).concat(finalItem));
        }
      });
      setInput("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Mesaj gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(actionId: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await api.confirmAiAction(actionId);
      setMessages((current) => [
        ...current.map((item) => ({ ...item, pendingAction: item.pendingAction?.id === actionId ? null : item.pendingAction })),
        result.message
      ]);
      onActionCompleted?.();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "İşlem onaylanamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelAction(actionId: string) {
    setLoading(true);
    setError(null);
    try {
      await api.cancelAiAction(actionId);
      setMessages((current) =>
        current.map((item) => ({ ...item, pendingAction: item.pendingAction?.id === actionId ? null : item.pendingAction }))
      );
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "İşlem iptal edilemedi.");
    } finally {
      setLoading(false);
    }
  }

  const dailyLimit = usage?.tenantDailyLimit && usage.tenantDailyLimit > 0 ? usage.tenantDailyLimit : usage?.dailyLimit ?? 0;
  const dailyUsed =
    usage?.tenantDailyLimit && usage.tenantDailyLimit > 0 ? usage.tenantMessagesToday : usage?.messagesToday ?? 0;
  const dailyRemaining =
    usage?.tenantDailyLimit && usage.tenantDailyLimit > 0 ? usage.tenantRemainingToday : usage?.remainingToday ?? 0;
  const usagePercent = dailyLimit > 0 ? Math.min(100, Math.round((dailyUsed / dailyLimit) * 100)) : 0;

  return (
    <>
      <button className="ogta-ai-fab" type="button" onClick={() => setOpen(true)} aria-label="ogta.ai asistanını aç">
        <Sparkles size={18} />
        <span>ogta.ai</span>
      </button>

      {open ? (
        <div className="ogta-ai-dock" role="dialog" aria-label="ogta.ai asistanı">
          <header className="ogta-ai-dock__header">
            <div>
              <strong>ogta.ai</strong>
              <span>Operasyon asistanı — yazma işlemleri onay ile tamamlanır</span>
              {usage && dailyLimit > 0 ? (
                <div className="ogta-ai-usage">
                  <div className="ogta-ai-usage__bar" aria-hidden="true">
                    <span style={{ width: `${usagePercent}%` }} />
                  </div>
                  <small>
                    Bugün {dailyUsed}/{dailyLimit} mesaj · kalan {dailyRemaining}
                  </small>
                </div>
              ) : null}
            </div>
            <button className="ogta-ai-icon-button" type="button" onClick={() => setOpen(false)} aria-label="Kapat">
              <X size={18} />
            </button>
          </header>

          <div className="ogta-ai-dock__body">
            {bootstrapping ? (
              <div className="ogta-ai-empty">
                <Loader2 className="spin" size={18} />
                Asistan hazırlanıyor
              </div>
            ) : messages.length === 0 ? (
              <div className="ogta-ai-empty">
                <Bot size={22} />
                <p>Doğal dille komut verin. Kayıt, duyuru veya not ekleme gibi işlemler önce taslak olarak gelir; onayladıktan sonra sisteme yazılır.</p>
                <div className="ogta-ai-suggestions">
                  {suggestions.map((suggestion) => (
                    <button key={suggestion} type="button" className="ogta-ai-suggestion" onClick={() => void sendMessage(suggestion)}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="ogta-ai-messages">
                {messages.map((message) => (
                  <article className={message.role === "user" ? "ogta-ai-message is-user" : "ogta-ai-message"} key={message.id}>
                    <p>{message.content}</p>
                    {message.candidates?.length ? (
                      <div className="ogta-ai-candidates">
                        {message.candidates.map((candidate) => (
                          <button
                            key={candidate.id}
                            type="button"
                            className="ogta-ai-candidate"
                            disabled={loading}
                            onClick={() => void sendMessage("", candidate.id)}
                          >
                            <strong>{candidate.label}</strong>
                            <span>{candidate.meta}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}

            {pendingAction ? (
              <div className="ogta-ai-action-card">
                <strong>Onay bekleyen işlem</strong>
                <p>{pendingAction.summary}</p>
                <div className="ogta-ai-action-card__actions">
                  <button className="ghost-action" type="button" disabled={loading} onClick={() => void cancelAction(pendingAction.id)}>
                    {pendingAction.cancelLabel}
                  </button>
                  <button className="primary-action" type="button" disabled={loading} onClick={() => void confirmAction(pendingAction.id)}>
                    {loading ? <Loader2 className="spin" size={16} /> : pendingAction.confirmLabel}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <div className="form-error ogta-ai-error">{error}</div> : null}
          </div>

          <form
            className="ogta-ai-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Örn: Defne Yılmaz adlı öğrenciye dikkat gözlemi ekle"
              rows={2}
              disabled={loading || bootstrapping}
            />
            <button type="submit" disabled={loading || bootstrapping || !input.trim()} aria-label="Gönder">
              {loading ? <Loader2 className="spin" size={18} /> : <SendHorizontal size={18} />}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
