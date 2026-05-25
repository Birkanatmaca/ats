package ai

import "testing"

func TestEstimateTokens(t *testing.T) {
	if got := estimateTokens(""); got != 0 {
		t.Fatalf("expected 0, got %d", got)
	}
	if got := estimateTokens("abcd"); got != 1 {
		t.Fatalf("expected 1, got %d", got)
	}
	if got := estimateTokens("1234567890123456789012345678901234567890"); got != 10 {
		t.Fatalf("expected 10, got %d", got)
	}
}

func TestMessageTokenUsage(t *testing.T) {
	in, out := messageTokenUsage("user", "hello world")
	if in == 0 || out != 0 {
		t.Fatalf("unexpected user tokens in=%d out=%d", in, out)
	}
	in, out = messageTokenUsage("assistant", "hello world")
	if in != 0 || out == 0 {
		t.Fatalf("unexpected assistant tokens in=%d out=%d", in, out)
	}
}
