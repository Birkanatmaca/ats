package ai

import (
	"context"
	"strings"

	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/platform/openai"
)

var supportedAIModels = []string{
	"gpt-4o-mini",
	"gpt-4o",
	"gpt-4.1-mini",
	"gpt-4.1",
}

func (s *Service) SupportedModels() []string {
	return append([]string(nil), supportedAIModels...)
}

func (s *Service) effectiveProviderSettings(ctx context.Context) (model string, useLLM bool) {
	model = strings.TrimSpace(s.cfg.Model)
	if model == "" {
		model = "gpt-4o-mini"
	}
	useLLM = s.cfg.UseLLM
	settings, err := s.repo.GetAIProviderSettings(ctx)
	if err != nil {
		return model, useLLM
	}
	if trimmed := strings.TrimSpace(settings.Model); trimmed != "" {
		model = trimmed
	}
	if settings.UseLLMSet {
		useLLM = settings.UseLLM
	}
	return model, useLLM
}

func (s *Service) ProviderStatus(ctx context.Context) (aidomain.ProviderStatus, error) {
	model, useLLM := s.effectiveProviderSettings(ctx)
	envKey := strings.TrimSpace(s.envOpenAIKey)
	platformKey, err := s.repo.GetAIProviderKey(ctx)
	if err != nil {
		return aidomain.ProviderStatus{}, err
	}
	platformKey = strings.TrimSpace(platformKey)

	status := aidomain.ProviderStatus{
		Model:              model,
		UseLLM:             useLLM,
		FallbackRuleEngine: true,
	}
	if envKey != "" {
		status.KeySource = "env"
		status.KeyConfigured = true
		status.EnvOverridesKey = platformKey != ""
		status.KeyHint = keyHint(envKey)
	} else if platformKey != "" {
		status.KeySource = "platform"
		status.KeyConfigured = true
		status.KeyHint = keyHint(platformKey)
	} else {
		status.KeySource = "none"
	}
	status.LLMReady = useLLM && status.KeyConfigured
	return status, nil
}

func (s *Service) UpdateProviderSettings(ctx context.Context, input aidomain.ProviderSettings) (aidomain.ProviderSettings, error) {
	model := strings.TrimSpace(input.Model)
	if model == "" {
		return aidomain.ProviderSettings{}, ErrInvalidProviderSettings
	}
	return s.repo.UpdateAIProviderSettings(ctx, aidomain.ProviderSettings{
		Model:  model,
		UseLLM: input.UseLLM,
	})
}

func (s *Service) TestProviderConnection(ctx context.Context) (aidomain.ProviderTestResult, error) {
	model, useLLM := s.effectiveProviderSettings(ctx)
	result := aidomain.ProviderTestResult{Model: model}
	if !useLLM {
		result.Error = "LLM modu kapalı. Ayarlardan etkinleştirin."
		return result, nil
	}
	client := s.ResolveOpenAIClient(ctx)
	if !client.Available() {
		result.Error = "API anahtarı tanımlı değil. Ayarlar > AI sekmesinden ekleyin."
		return result, nil
	}
	started := s.clock()
	text, err := client.Complete(ctx, "Sen bir bağlantı testi asistanısın. Tek kelimeyle yanıt ver.", "ping")
	latency := s.clock().Sub(started).Milliseconds()
	result.LatencyMs = latency
	if err != nil {
		result.Error = err.Error()
		return result, nil
	}
	result.OK = true
	result.ResponseHint = truncateText(strings.TrimSpace(text), 80)
	return result, nil
}

func (s *Service) resolveOpenAIClientWithModel(ctx context.Context, model string) openai.Client {
	if s.openai.Available() {
		if httpClient, ok := s.openai.(*openai.HTTPClient); ok {
			return openai.NewHTTPClient(openai.Config{
				APIKey:        httpClient.APIKey(),
				Model:         model,
				StoreResponse: s.cfg.StoreResponse,
			})
		}
		return s.openai
	}
	key, err := s.repo.GetAIProviderKey(ctx)
	if err != nil || strings.TrimSpace(key) == "" {
		return openai.NoopClient{}
	}
	return openai.NewHTTPClient(openai.Config{
		APIKey:        key,
		Model:         model,
		StoreResponse: s.cfg.StoreResponse,
	})
}

func keyHint(key string) string {
	key = strings.TrimSpace(key)
	if len(key) <= 4 {
		return "****"
	}
	return "…" + key[len(key)-4:]
}

func truncateText(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max] + "…"
}
