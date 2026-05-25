package ai

import (
	"regexp"
	"strings"
)

var promptInjectionPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)ignore (all )?(previous|prior) instructions`),
	regexp.MustCompile(`(?i)disregard (the )?(system|developer) (prompt|message)`),
	regexp.MustCompile(`(?i)(system prompt|developer message|hidden instructions)`),
	regexp.MustCompile(`(?i)(api key|api anahtar|openai key|jwt secret|password hash)`),
	regexp.MustCompile(`(?i)(veritaban[ıi]|database).*(yaz|write|update|delete|drop)`),
	regexp.MustCompile(`(?i)(yetki|role|scope).*(bypass|atla|yok say|ignore)`),
	regexp.MustCompile(`(?i)(sen bir|you are a).*(admin|süper admin|super admin|root)`),
	regexp.MustCompile(`(?i)(onay olmadan|without approval).*(oluştur|create|yayınla|publish)`),
	regexp.MustCompile(`(?i)tool call.*(doğrudan|directly|hemen)`),
}

func detectPromptInjection(content string) (blocked bool, reason string) {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return false, ""
	}
	for _, pattern := range promptInjectionPatterns {
		if pattern.MatchString(trimmed) {
			return true, "Güvenlik politikası gereği bu istek işlenemez. Lütfen okul operasyonu ile ilgili normal bir komut yazın."
		}
	}
	return false, ""
}

func sanitizeUserFacingContent(content string) string {
	lower := strings.ToLower(content)
	for _, secret := range []string{"sk-", "bearer ", "apikey", "api_key"} {
		if strings.Contains(lower, secret) {
			return "İstek alındı."
		}
	}
	return content
}
