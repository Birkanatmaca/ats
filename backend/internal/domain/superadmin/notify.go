package superadmin

import (
	"encoding/json"
	"strings"
)

func DefaultMailSettings() MailSettings {
	return MailSettings{
		Provider: "smtp",
		Port:     587,
		UseTLS:   true,
	}
}

func DefaultSMSSettings() SMSSettings {
	return SMSSettings{
		Provider: "netgsm",
	}
}

func ParseMailSettings(raw string, password string) MailSettings {
	settings := DefaultMailSettings()
	raw = strings.TrimSpace(raw)
	if raw != "" {
		_ = json.Unmarshal([]byte(raw), &settings)
	}
	if strings.TrimSpace(settings.Provider) == "" {
		settings.Provider = "smtp"
	}
	if settings.Port <= 0 {
		settings.Port = 587
	}
	password = strings.TrimSpace(password)
	settings.PasswordSet = password != ""
	settings.PasswordHint = maskSecretHint(password)
	return settings
}

func ParseSMSSettings(raw string, apiKey string) SMSSettings {
	settings := DefaultSMSSettings()
	raw = strings.TrimSpace(raw)
	if raw != "" {
		_ = json.Unmarshal([]byte(raw), &settings)
	}
	if strings.TrimSpace(settings.Provider) == "" {
		settings.Provider = "netgsm"
	}
	apiKey = strings.TrimSpace(apiKey)
	settings.APIKeySet = apiKey != ""
	settings.APIKeyHint = maskSecretHint(apiKey)
	return settings
}

func EncodeMailConfig(input MailSettingsInput) (string, error) {
	payload := MailSettings{
		Enabled:   input.Enabled,
		Provider:  strings.TrimSpace(input.Provider),
		Host:      strings.TrimSpace(input.Host),
		Port:      input.Port,
		Username:  strings.TrimSpace(input.Username),
		FromName:  strings.TrimSpace(input.FromName),
		FromEmail: strings.TrimSpace(input.FromEmail),
		UseTLS:    input.UseTLS,
	}
	if payload.Provider == "" {
		payload.Provider = "smtp"
	}
	if payload.Port <= 0 {
		payload.Port = 587
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func EncodeSMSConfig(input SMSSettingsInput) (string, error) {
	payload := SMSSettings{
		Enabled:  input.Enabled,
		Provider: strings.TrimSpace(input.Provider),
		Username: strings.TrimSpace(input.Username),
		Sender:   strings.TrimSpace(input.Sender),
		BaseURL:  strings.TrimSpace(input.BaseURL),
	}
	if payload.Provider == "" {
		payload.Provider = "netgsm"
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func maskSecretHint(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if len(value) <= 4 {
		return "••••"
	}
	return "••••" + value[len(value)-4:]
}
