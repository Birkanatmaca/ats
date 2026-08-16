package ai

import "time"

const (
	ProviderKeyStatusActive    = "active"
	ProviderKeyStatusExhausted = "exhausted"
	ProviderKeyStatusError     = "error"
	ProviderKeyStatusDisabled  = "disabled"

	ProviderKeySourceEnv      = "env"
	ProviderKeySourcePlatform = "platform"
)

type ProviderSettings struct {
	Model     string `json:"model"`
	UseLLM    bool   `json:"useLlm"`
	UseLLMSet bool   `json:"-"`
	APIKey    string `json:"apiKey,omitempty"`
	ClearKey  bool   `json:"clearKey,omitempty"`
}

type ProviderKey struct {
	ID          string     `json:"id"`
	Label       string     `json:"label"`
	Key         string     `json:"key,omitempty"`
	KeyHint     string     `json:"keyHint"`
	Enabled     bool       `json:"enabled"`
	Priority    int        `json:"priority"`
	Status      string     `json:"status"`
	Source      string     `json:"source"`
	LastError   string     `json:"lastError,omitempty"`
	LastUsedAt  *time.Time `json:"lastUsedAt,omitempty"`
	ExhaustedAt *time.Time `json:"exhaustedAt,omitempty"`
}

type ProviderKeyInput struct {
	Label  string `json:"label"`
	APIKey string `json:"apiKey"`
}

type ProviderKeyUpdate struct {
	Label       *string `json:"label,omitempty"`
	APIKey      string  `json:"apiKey,omitempty"`
	Enabled     *bool   `json:"enabled,omitempty"`
	ResetStatus bool    `json:"resetStatus,omitempty"`
}

type ProviderKeyReorder struct {
	OrderedIDs []string `json:"orderedIds"`
}

type ProviderStatus struct {
	KeySource          string        `json:"keySource"`
	KeyConfigured      bool          `json:"keyConfigured"`
	KeyHint            string        `json:"keyHint,omitempty"`
	ActiveKeyID        string        `json:"activeKeyId,omitempty"`
	ReadyKeyCount      int           `json:"readyKeyCount"`
	EnvInPool          bool          `json:"envInPool"`
	EnvOverridesKey    bool          `json:"envOverridesKey"`
	Model              string        `json:"model"`
	UseLLM             bool          `json:"useLlm"`
	LLMReady           bool          `json:"llmReady"`
	FallbackRuleEngine bool          `json:"fallbackRuleEngine"`
	Keys               []ProviderKey `json:"keys"`
}

type ProviderTestResult struct {
	OK           bool   `json:"ok"`
	Model        string `json:"model"`
	LatencyMs    int64  `json:"latencyMs"`
	ResponseHint string `json:"responseHint,omitempty"`
	Error        string `json:"error,omitempty"`
	KeyID        string `json:"keyId,omitempty"`
	KeyHint      string `json:"keyHint,omitempty"`
}
