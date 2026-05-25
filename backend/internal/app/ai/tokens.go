package ai

import "unicode/utf8"

func estimateTokens(text string) int {
	if text == "" {
		return 0
	}
	n := utf8.RuneCountInString(text)
	if n <= 0 {
		return 0
	}
	tokens := n / 4
	if tokens < 1 {
		return 1
	}
	return tokens
}

func messageTokenUsage(role, content string) (input, output int) {
	tokens := estimateTokens(content)
	switch role {
	case "user":
		return tokens, 0
	default:
		return 0, tokens
	}
}
