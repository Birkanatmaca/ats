package ai

type ProviderSettings struct {
	Model     string `json:"model"`
	UseLLM    bool   `json:"useLlm"`
	UseLLMSet bool   `json:"-"`
}

type ProviderStatus struct {
	KeySource           string `json:"keySource"`
	KeyConfigured       bool   `json:"keyConfigured"`
	KeyHint             string `json:"keyHint,omitempty"`
	EnvOverridesKey     bool   `json:"envOverridesKey"`
	Model               string `json:"model"`
	UseLLM              bool   `json:"useLlm"`
	LLMReady            bool   `json:"llmReady"`
	FallbackRuleEngine  bool   `json:"fallbackRuleEngine"`
}

type ProviderTestResult struct {
	OK           bool   `json:"ok"`
	Model        string `json:"model"`
	LatencyMs    int64  `json:"latencyMs"`
	ResponseHint string `json:"responseHint,omitempty"`
	Error        string `json:"error,omitempty"`
}
