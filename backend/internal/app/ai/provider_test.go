package ai

import (
	"testing"

	aidomain "ots/backend/internal/domain/ai"
)

func TestIsReadyProviderKey(t *testing.T) {
	t.Parallel()

	if !isReadyProviderKey(aidomain.ProviderKey{Enabled: true, Status: aidomain.ProviderKeyStatusActive, Key: "sk-test-1234"}) {
		t.Fatal("active key should be ready")
	}
	if isReadyProviderKey(aidomain.ProviderKey{Enabled: true, Status: aidomain.ProviderKeyStatusExhausted, Key: "sk-test-1234"}) {
		t.Fatal("exhausted key should not be ready")
	}
	if isReadyProviderKey(aidomain.ProviderKey{Enabled: false, Status: aidomain.ProviderKeyStatusActive, Key: "sk-test-1234"}) {
		t.Fatal("disabled key should not be ready")
	}
}

func TestSanitizeProviderKeyHidesSecret(t *testing.T) {
	t.Parallel()

	public := sanitizeProviderKey(aidomain.ProviderKey{
		ID:      "key_1",
		Label:   "Yedek",
		Key:     "sk-abcdefghijklmnopqrstuvwxyz",
		Enabled: true,
		Status:  aidomain.ProviderKeyStatusActive,
	})
	if public.Key != "" {
		t.Fatal("secret must not leak")
	}
	if public.KeyHint != "sk-…wxyz" {
		t.Fatalf("hint = %q", public.KeyHint)
	}
}
