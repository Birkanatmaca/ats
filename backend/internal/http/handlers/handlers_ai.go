package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	aiapp "ots/backend/internal/app/ai"
	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/platform/httpx"
)

func (h *Handler) registerAIRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/ai/capabilities", h.aiCapabilities)
	mux.HandleFunc("GET /api/v1/ai/usage", h.aiUsage)
	mux.HandleFunc("POST /api/v1/ai/conversations", h.createAIConversation)
	mux.HandleFunc("GET /api/v1/ai/conversations", h.listAIConversations)
	mux.HandleFunc("GET /api/v1/ai/conversations/{id}", h.getAIConversation)
	mux.HandleFunc("POST /api/v1/ai/conversations/{id}/messages", h.sendAIMessage)
	mux.HandleFunc("POST /api/v1/ai/conversations/{id}/messages:stream", h.streamAIMessage)
	mux.HandleFunc("GET /api/v1/ai/actions/{id}", h.getAIAction)
	mux.HandleFunc("POST /api/v1/ai/actions/{id}/confirm", h.confirmAIAction)
	mux.HandleFunc("POST /api/v1/ai/actions/{id}/cancel", h.cancelAIAction)
}

func (h *Handler) aiCapabilities(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, h.ai.Capabilities(principal.Role), nil)
}

func (h *Handler) aiUsage(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	summary, err := h.ai.UsageSummary(r.Context(), principal.TenantID, principal.UserID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_USAGE_FAILED", "Kullanım özeti alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary, nil)
}

func (h *Handler) createAIConversation(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	var input struct {
		Title string `json:"title"`
	}
	_ = httpx.DecodeJSON(r, &input)
	created, err := h.ai.CreateConversation(r.Context(), principal, input.Title)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_CONVERSATION_CREATE_FAILED", "Konuşma oluşturulamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, created, nil)
}

func (h *Handler) listAIConversations(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	items, err := h.ai.ListConversations(r.Context(), principal)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_CONVERSATION_LIST_FAILED", "Konuşmalar alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, items, nil)
}

func (h *Handler) getAIConversation(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	conversation, err := h.ai.GetConversation(r.Context(), principal, r.PathValue("id"))
	if errors.Is(err, aiapp.ErrConversationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "AI_CONVERSATION_NOT_FOUND", "Konuşma bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_CONVERSATION_LOOKUP_FAILED", "Konuşma alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, conversation, nil)
}

func (h *Handler) sendAIMessage(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	var input aidomain.SendMessageInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Mesaj okunamadı.", nil)
		return
	}
	result, err := h.ai.SendMessage(r.Context(), principal, r.PathValue("id"), input)
	if h.writeAIMessageError(w, err) {
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result, nil)
}

func (h *Handler) streamAIMessage(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_STREAM_UNSUPPORTED", "Streaming bu ortamda desteklenmiyor.", nil)
		return
	}
	var input aidomain.SendMessageInput
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Mesaj okunamadı.", nil)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	err := h.ai.SendMessageStream(r.Context(), principal, r.PathValue("id"), input, func(event aidomain.StreamEvent) error {
		payload, marshalErr := encodeStreamEvent(event)
		if marshalErr != nil {
			return marshalErr
		}
		if _, writeErr := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, payload); writeErr != nil {
			return writeErr
		}
		flusher.Flush()
		return nil
	})
	if h.writeAIMessageError(w, err) {
		return
	}
}

func encodeStreamEvent(event aidomain.StreamEvent) ([]byte, error) {
	return json.Marshal(event)
}

func (h *Handler) writeAIMessageError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, aiapp.ErrConversationNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "AI_CONVERSATION_NOT_FOUND", "Konuşma bulunamadı.", nil)
		return true
	}
	if errors.Is(err, aiapp.ErrInvalidMessage) {
		httpx.WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Mesaj içeriği zorunludur.", nil)
		return true
	}
	if errors.Is(err, aiapp.ErrDailyLimitExceeded) {
		httpx.WriteError(w, http.StatusTooManyRequests, "AI_DAILY_LIMIT", "Günlük ogta.ai mesaj limitine ulaşıldı.", nil)
		return true
	}
	if errors.Is(err, aiapp.ErrTenantDailyLimitExceeded) {
		httpx.WriteError(w, http.StatusTooManyRequests, "AI_TENANT_DAILY_LIMIT", "Kurum günlük ogta.ai mesaj limitine ulaşıldı.", nil)
		return true
	}
	if errors.Is(err, aiapp.ErrTenantTokenLimitExceeded) {
		httpx.WriteError(w, http.StatusTooManyRequests, "AI_TENANT_TOKEN_LIMIT", "Kurum aylık token limitine ulaşıldı.", nil)
		return true
	}
	if errors.Is(err, aiapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem için yetkiniz yok.", nil)
		return true
	}
	httpx.WriteError(w, http.StatusInternalServerError, "AI_MESSAGE_FAILED", "Mesaj işlenemedi.", nil)
	return true
}

func (h *Handler) getAIAction(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	action, err := h.ai.GetPendingAction(r.Context(), principal, r.PathValue("id"))
	if errors.Is(err, aiapp.ErrActionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "AI_ACTION_NOT_FOUND", "İşlem bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_ACTION_LOOKUP_FAILED", "İşlem alınamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, action, nil)
}

func (h *Handler) confirmAIAction(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	message, err := h.ai.ConfirmAction(r.Context(), principal, r.PathValue("id"))
	if errors.Is(err, aiapp.ErrActionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "AI_ACTION_NOT_FOUND", "İşlem bulunamadı.", nil)
		return
	}
	if errors.Is(err, aiapp.ErrActionExpired) {
		httpx.WriteError(w, http.StatusConflict, "AI_ACTION_EXPIRED", "Onay süresi doldu.", nil)
		return
	}
	if errors.Is(err, aiapp.ErrActionNotPending) {
		httpx.WriteError(w, http.StatusConflict, "AI_ACTION_NOT_PENDING", "İşlem onay beklemiyor.", nil)
		return
	}
	if errors.Is(err, aiapp.ErrForbidden) {
		httpx.WriteError(w, http.StatusForbidden, "FORBIDDEN", "Bu işlem için yetkiniz yok.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_ACTION_CONFIRM_FAILED", "İşlem onaylanamadı.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"message": message}, nil)
}

func (h *Handler) cancelAIAction(w http.ResponseWriter, r *http.Request) {
	principal, ok := requirePrincipal(w, r)
	if !ok {
		return
	}
	if h.ai == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "ogta.ai servisi henüz etkin değil.", nil)
		return
	}
	action, err := h.ai.CancelAction(r.Context(), principal, r.PathValue("id"))
	if errors.Is(err, aiapp.ErrActionNotFound) {
		httpx.WriteError(w, http.StatusNotFound, "AI_ACTION_NOT_FOUND", "İşlem bulunamadı.", nil)
		return
	}
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "AI_ACTION_CANCEL_FAILED", "İşlem iptal edilemedi.", nil)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, action, nil)
}
