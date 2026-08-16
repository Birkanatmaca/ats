package ai

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"strconv"
	"strings"
	"time"

	aidomain "ots/backend/internal/domain/ai"
	"ots/backend/internal/platform/openai"
)

const maxProviderKeys = 10

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
	keys, err := s.publicProviderKeys(ctx)
	if err != nil {
		return aidomain.ProviderStatus{}, err
	}

	status := aidomain.ProviderStatus{
		Model:              model,
		UseLLM:             useLLM,
		FallbackRuleEngine: true,
		Keys:               keys,
		EnvInPool:          strings.TrimSpace(s.envOpenAIKey) != "",
	}
	for _, key := range keys {
		if key.Source == aidomain.ProviderKeySourceEnv {
			status.EnvInPool = true
		}
		if isReadyProviderKey(key) {
			status.ReadyKeyCount++
			if status.ActiveKeyID == "" {
				status.ActiveKeyID = key.ID
				status.KeyHint = key.KeyHint
				status.KeySource = key.Source
			}
		}
	}
	status.KeyConfigured = status.ReadyKeyCount > 0
	if !status.KeyConfigured {
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
	updated, err := s.repo.UpdateAIProviderSettings(ctx, aidomain.ProviderSettings{
		Model:  model,
		UseLLM: input.UseLLM,
	})
	if err != nil {
		return aidomain.ProviderSettings{}, err
	}
	if key := strings.TrimSpace(input.APIKey); key != "" {
		if _, err := s.AddProviderKey(ctx, aidomain.ProviderKeyInput{APIKey: key}); err != nil {
			return aidomain.ProviderSettings{}, err
		}
	}
	return updated, nil
}

func (s *Service) TestProviderConnection(ctx context.Context) (aidomain.ProviderTestResult, error) {
	return s.TestProviderKey(ctx, "")
}

func (s *Service) TestProviderKey(ctx context.Context, keyID string) (aidomain.ProviderTestResult, error) {
	model, useLLM := s.effectiveProviderSettings(ctx)
	result := aidomain.ProviderTestResult{Model: model}
	if !useLLM {
		result.Error = "LLM modu kapalı. Sağlayıcı sekmesinden etkinleştirin."
		return result, nil
	}

	var client openai.Client
	if strings.TrimSpace(keyID) != "" {
		slot, hint, err := s.providerKeySlot(ctx, keyID)
		if err != nil {
			return result, err
		}
		result.KeyID = slot.ID
		result.KeyHint = hint
		client = openai.NewHTTPClient(openai.Config{
			APIKey:        slot.Key,
			Model:         model,
			StoreResponse: s.cfg.StoreResponse,
		})
	} else {
		client = s.ResolveOpenAIClient(ctx)
	}
	if !client.Available() {
		result.Error = "Kullanılabilir API anahtarı yok. ogta.ai > Sağlayıcı sekmesinden ekleyin."
		return result, nil
	}

	started := s.clock()
	text, err := client.Complete(ctx, "Sen bir bağlantı testi asistanısın. Tek kelimeyle yanıt ver.", "ping")
	result.LatencyMs = s.clock().Sub(started).Milliseconds()
	if err != nil {
		result.Error = err.Error()
		return result, nil
	}
	result.OK = true
	result.ResponseHint = truncateText(strings.TrimSpace(text), 80)
	if result.KeyID == "" {
		if status, statusErr := s.ProviderStatus(ctx); statusErr == nil {
			result.KeyID = status.ActiveKeyID
			result.KeyHint = status.KeyHint
		}
	}
	return result, nil
}

func (s *Service) resolveOpenAIClientWithModel(ctx context.Context, model string) openai.Client {
	if s.openai.Available() {
		if _, ok := s.openai.(*openai.HTTPClient); !ok {
			if _, ok := s.openai.(*openai.FailoverClient); !ok {
				return s.openai
			}
		}
	}
	slots := s.readyProviderKeySlots(ctx)
	if len(slots) == 0 {
		return openai.NoopClient{}
	}
	return &openai.FailoverClient{
		Model:         model,
		StoreResponse: s.cfg.StoreResponse,
		Keys:          slots,
		OnSuccess: func(id string) {
			_ = s.markProviderKeyUsed(context.Background(), id)
		},
		OnFailure: func(id, status, message string) {
			_ = s.markProviderKeyFailure(context.Background(), id, status, message)
		},
	}
}

func (s *Service) publicProviderKeys(ctx context.Context) ([]aidomain.ProviderKey, error) {
	stored, err := s.repo.ListAIProviderKeys(ctx)
	if err != nil {
		return nil, err
	}
	keys := make([]aidomain.ProviderKey, 0, len(stored)+1)
	if env := strings.TrimSpace(s.envOpenAIKey); env != "" {
		keys = append(keys, sanitizeProviderKey(aidomain.ProviderKey{
			ID:       "env",
			Label:    "Sunucu (OPENAI_API_KEY)",
			Key:      env,
			Enabled:  true,
			Priority: 0,
			Status:   aidomain.ProviderKeyStatusActive,
			Source:   aidomain.ProviderKeySourceEnv,
		}))
	}
	for i, key := range stored {
		key.Source = aidomain.ProviderKeySourcePlatform
		key.Priority = i + 1
		keys = append(keys, sanitizeProviderKey(key))
	}
	return keys, nil
}

func (s *Service) readyProviderKeySlots(ctx context.Context) []openai.KeySlot {
	slots := make([]openai.KeySlot, 0, 4)
	if env := strings.TrimSpace(s.envOpenAIKey); env != "" {
		slots = append(slots, openai.KeySlot{ID: "env", Key: env})
	}
	stored, err := s.repo.ListAIProviderKeys(ctx)
	if err != nil {
		return slots
	}
	for _, key := range stored {
		if !isReadyProviderKey(key) {
			continue
		}
		if secret := strings.TrimSpace(key.Key); secret != "" {
			slots = append(slots, openai.KeySlot{ID: key.ID, Key: secret})
		}
	}
	return slots
}

func (s *Service) providerKeySlot(ctx context.Context, keyID string) (openai.KeySlot, string, error) {
	if keyID == "env" {
		env := strings.TrimSpace(s.envOpenAIKey)
		if env == "" {
			return openai.KeySlot{}, "", ErrProviderKeyNotFound
		}
		return openai.KeySlot{ID: "env", Key: env}, keyHint(env), nil
	}
	stored, err := s.repo.ListAIProviderKeys(ctx)
	if err != nil {
		return openai.KeySlot{}, "", err
	}
	for _, key := range stored {
		if key.ID == keyID {
			secret := strings.TrimSpace(key.Key)
			if secret == "" {
				return openai.KeySlot{}, "", ErrInvalidProviderKey
			}
			return openai.KeySlot{ID: key.ID, Key: secret}, keyHint(secret), nil
		}
	}
	return openai.KeySlot{}, "", ErrProviderKeyNotFound
}

func (s *Service) AddProviderKey(ctx context.Context, input aidomain.ProviderKeyInput) (aidomain.ProviderKey, error) {
	secret := strings.TrimSpace(input.APIKey)
	if len(secret) < 8 {
		return aidomain.ProviderKey{}, ErrInvalidProviderKey
	}
	stored, err := s.repo.ListAIProviderKeys(ctx)
	if err != nil {
		return aidomain.ProviderKey{}, err
	}
	if len(stored) >= maxProviderKeys {
		return aidomain.ProviderKey{}, ErrProviderKeyLimit
	}
	for _, key := range stored {
		if strings.TrimSpace(key.Key) == secret {
			return aidomain.ProviderKey{}, ErrProviderKeyDuplicate
		}
	}
	label := strings.TrimSpace(input.Label)
	if label == "" {
		label = "Anahtar " + strconv.Itoa(len(stored)+1)
	}
	item := aidomain.ProviderKey{
		ID:       newProviderKeyID(),
		Label:    label,
		Key:      secret,
		Enabled:  true,
		Priority: len(stored) + 1,
		Status:   aidomain.ProviderKeyStatusActive,
		Source:   aidomain.ProviderKeySourcePlatform,
	}
	stored = append(stored, item)
	if err := s.repo.SaveAIProviderKeys(ctx, normalizeProviderKeys(stored)); err != nil {
		return aidomain.ProviderKey{}, err
	}
	return sanitizeProviderKey(item), nil
}

func (s *Service) UpdateProviderKey(ctx context.Context, keyID string, input aidomain.ProviderKeyUpdate) (aidomain.ProviderKey, error) {
	if keyID == "env" {
		return aidomain.ProviderKey{}, ErrInvalidProviderKey
	}
	stored, err := s.repo.ListAIProviderKeys(ctx)
	if err != nil {
		return aidomain.ProviderKey{}, err
	}
	index := -1
	for i, key := range stored {
		if key.ID == keyID {
			index = i
			break
		}
	}
	if index < 0 {
		return aidomain.ProviderKey{}, ErrProviderKeyNotFound
	}
	item := stored[index]
	if input.Label != nil {
		label := strings.TrimSpace(*input.Label)
		if label == "" {
			return aidomain.ProviderKey{}, ErrInvalidProviderKey
		}
		item.Label = label
	}
	if secret := strings.TrimSpace(input.APIKey); secret != "" {
		if len(secret) < 8 {
			return aidomain.ProviderKey{}, ErrInvalidProviderKey
		}
		for i, key := range stored {
			if i != index && strings.TrimSpace(key.Key) == secret {
				return aidomain.ProviderKey{}, ErrProviderKeyDuplicate
			}
		}
		item.Key = secret
		item.Status = aidomain.ProviderKeyStatusActive
		item.LastError = ""
		item.ExhaustedAt = nil
	}
	if input.Enabled != nil {
		item.Enabled = *input.Enabled
		if !item.Enabled {
			item.Status = aidomain.ProviderKeyStatusDisabled
		} else if item.Status == aidomain.ProviderKeyStatusDisabled {
			item.Status = aidomain.ProviderKeyStatusActive
			item.LastError = ""
		}
	}
	if input.ResetStatus {
		item.Status = aidomain.ProviderKeyStatusActive
		item.LastError = ""
		item.ExhaustedAt = nil
		if !item.Enabled {
			item.Enabled = true
		}
	}
	stored[index] = item
	if err := s.repo.SaveAIProviderKeys(ctx, normalizeProviderKeys(stored)); err != nil {
		return aidomain.ProviderKey{}, err
	}
	return sanitizeProviderKey(item), nil
}

func (s *Service) DeleteProviderKey(ctx context.Context, keyID string) error {
	if keyID == "env" {
		return ErrInvalidProviderKey
	}
	stored, err := s.repo.ListAIProviderKeys(ctx)
	if err != nil {
		return err
	}
	next := make([]aidomain.ProviderKey, 0, len(stored))
	found := false
	for _, key := range stored {
		if key.ID == keyID {
			found = true
			continue
		}
		next = append(next, key)
	}
	if !found {
		return ErrProviderKeyNotFound
	}
	return s.repo.SaveAIProviderKeys(ctx, normalizeProviderKeys(next))
}

func (s *Service) ReorderProviderKeys(ctx context.Context, orderedIDs []string) ([]aidomain.ProviderKey, error) {
	stored, err := s.repo.ListAIProviderKeys(ctx)
	if err != nil {
		return nil, err
	}
	byID := make(map[string]aidomain.ProviderKey, len(stored))
	for _, key := range stored {
		byID[key.ID] = key
	}
	next := make([]aidomain.ProviderKey, 0, len(stored))
	seen := make(map[string]bool, len(orderedIDs))
	for _, id := range orderedIDs {
		if id == "env" {
			continue
		}
		key, ok := byID[id]
		if !ok || seen[id] {
			continue
		}
		seen[id] = true
		next = append(next, key)
	}
	for _, key := range stored {
		if !seen[key.ID] {
			next = append(next, key)
		}
	}
	if err := s.repo.SaveAIProviderKeys(ctx, normalizeProviderKeys(next)); err != nil {
		return nil, err
	}
	return s.publicProviderKeys(ctx)
}

func (s *Service) markProviderKeyUsed(ctx context.Context, keyID string) error {
	if keyID == "" || keyID == "env" {
		return nil
	}
	stored, err := s.repo.ListAIProviderKeys(ctx)
	if err != nil {
		return err
	}
	now := s.clock()
	changed := false
	for i, key := range stored {
		if key.ID != keyID {
			continue
		}
		stored[i].LastUsedAt = &now
		stored[i].Status = aidomain.ProviderKeyStatusActive
		stored[i].LastError = ""
		changed = true
		break
	}
	if !changed {
		return nil
	}
	return s.repo.SaveAIProviderKeys(ctx, normalizeProviderKeys(stored))
}

func (s *Service) markProviderKeyFailure(ctx context.Context, keyID, status, message string) error {
	if keyID == "" || keyID == "env" || strings.TrimSpace(status) == "" {
		return nil
	}
	stored, err := s.repo.ListAIProviderKeys(ctx)
	if err != nil {
		return err
	}
	now := s.clock()
	changed := false
	for i, key := range stored {
		if key.ID != keyID {
			continue
		}
		stored[i].Status = status
		stored[i].LastError = truncateText(strings.TrimSpace(message), 180)
		if status == aidomain.ProviderKeyStatusExhausted {
			stored[i].ExhaustedAt = &now
		}
		changed = true
		break
	}
	if !changed {
		return nil
	}
	return s.repo.SaveAIProviderKeys(ctx, normalizeProviderKeys(stored))
}

func isReadyProviderKey(key aidomain.ProviderKey) bool {
	if !key.Enabled {
		return false
	}
	if key.Status == aidomain.ProviderKeyStatusExhausted || key.Status == aidomain.ProviderKeyStatusError || key.Status == aidomain.ProviderKeyStatusDisabled {
		return false
	}
	return strings.TrimSpace(key.KeyHint) != "" || strings.TrimSpace(key.Key) != ""
}

func sanitizeProviderKey(key aidomain.ProviderKey) aidomain.ProviderKey {
	if key.Status == "" {
		if key.Enabled {
			key.Status = aidomain.ProviderKeyStatusActive
		} else {
			key.Status = aidomain.ProviderKeyStatusDisabled
		}
	}
	if key.Source == "" {
		key.Source = aidomain.ProviderKeySourcePlatform
	}
	key.KeyHint = keyHint(key.Key)
	if key.KeyHint == "" {
		key.KeyHint = "****"
	}
	key.Key = ""
	return key
}

func normalizeProviderKeys(keys []aidomain.ProviderKey) []aidomain.ProviderKey {
	normalized := make([]aidomain.ProviderKey, 0, len(keys))
	for i, key := range keys {
		key.Priority = i + 1
		key.Source = aidomain.ProviderKeySourcePlatform
		if strings.TrimSpace(key.ID) == "" {
			key.ID = newProviderKeyID()
		}
		if strings.TrimSpace(key.Label) == "" {
			key.Label = "Anahtar " + strconv.Itoa(i+1)
		}
		if !key.Enabled && key.Status == aidomain.ProviderKeyStatusActive {
			key.Status = aidomain.ProviderKeyStatusDisabled
		}
		normalized = append(normalized, key)
	}
	return normalized
}

func newProviderKeyID() string {
	var buf [8]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "key_" + strconv.FormatInt(time.Now().UnixNano(), 10)
	}
	return "key_" + hex.EncodeToString(buf[:])
}

func keyHint(key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}
	if len(key) <= 8 {
		return "****"
	}
	return key[:3] + "…" + key[len(key)-4:]
}

func truncateText(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max] + "…"
}

