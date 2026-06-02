package push

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type SendResult struct {
	Token    string
	Status   string
	TicketID string
	Error    string
}

type Sender interface {
	Send(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]SendResult, error)
}

type ExpoSender struct {
	client      *http.Client
	accessToken string
	logger      *slog.Logger
}

func NewExpoSender(accessToken string, logger *slog.Logger) *ExpoSender {
	if logger == nil {
		logger = slog.Default()
	}
	return &ExpoSender{
		client:      &http.Client{Timeout: 10 * time.Second},
		accessToken: strings.TrimSpace(accessToken),
		logger:      logger,
	}
}

type expoMessage struct {
	To    string            `json:"to"`
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Data  map[string]string `json:"data,omitempty"`
	Sound string            `json:"sound,omitempty"`
}

type expoTicket struct {
	Status string `json:"status"`
	ID     string `json:"id"`
	Detail string `json:"message"`
}

type expoSendResponse struct {
	Data []expoTicket `json:"data"`
}

func (e *ExpoSender) Send(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]SendResult, error) {
	valid := make([]string, 0, len(tokens))
	for _, token := range tokens {
		token = strings.TrimSpace(token)
		if token == "" {
			continue
		}
		valid = append(valid, token)
	}
	if len(valid) == 0 {
		return nil, nil
	}

	messages := make([]expoMessage, 0, len(valid))
	for _, token := range valid {
		messages = append(messages, expoMessage{
			To:    token,
			Title: title,
			Body:  body,
			Data:  data,
			Sound: "default",
		})
	}

	payload, err := json.Marshal(messages)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://exp.host/--/api/v2/push/send", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if e.accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+e.accessToken)
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	bodyBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("expo push failed with status %d", resp.StatusCode)
	}

	var parsed expoSendResponse
	if err := json.Unmarshal(bodyBytes, &parsed); err != nil {
		// Provider accepted request but response shape unknown — treat as sent.
		out := make([]SendResult, 0, len(valid))
		for _, token := range valid {
			out = append(out, SendResult{Token: token, Status: "ok"})
		}
		return out, nil
	}

	out := make([]SendResult, 0, len(valid))
	for index, token := range valid {
		result := SendResult{Token: token, Status: "ok"}
		if index < len(parsed.Data) {
			ticket := parsed.Data[index]
			result.TicketID = ticket.ID
			if ticket.Status == "error" {
				result.Status = "error"
				result.Error = ticket.Detail
			}
		}
		out = append(out, result)
	}
	return out, nil
}

type NoopSender struct {
	logger *slog.Logger
}

func NewNoopSender(logger *slog.Logger) *NoopSender {
	if logger == nil {
		logger = slog.Default()
	}
	return &NoopSender{logger: logger}
}

func (n *NoopSender) Send(_ context.Context, tokens []string, title, body string, _ map[string]string) ([]SendResult, error) {
	if len(tokens) == 0 {
		return nil, nil
	}
	n.logger.Info("push noop send", slog.Int("tokens", len(tokens)), slog.String("title", title), slog.String("body", body))
	out := make([]SendResult, 0, len(tokens))
	for _, token := range tokens {
		out = append(out, SendResult{Token: token, Status: "ok", TicketID: "noop"})
	}
	return out, nil
}

func IsInvalidTokenError(message string) bool {
	message = strings.ToLower(message)
	return strings.Contains(message, "devicenotregistered") ||
		strings.Contains(message, "notregistered") ||
		strings.Contains(message, "invalidcredentials")
}
