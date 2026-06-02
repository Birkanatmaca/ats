package announcement

import (
	"testing"

	domain "ots/backend/internal/domain/announcement"
)

func TestNormalizeLegacyAudience(t *testing.T) {
	audiences := NormalizeAudiences("guardians", nil)
	if len(audiences) != 1 || audiences[0].Type != domain.AudienceRole || audiences[0].Role != "guardian" {
		t.Fatalf("unexpected audiences: %#v", audiences)
	}
	classAudiences := NormalizeAudiences("class:abc-123", nil)
	if len(classAudiences) != 1 || classAudiences[0].ID != "abc-123" {
		t.Fatalf("unexpected class audiences: %#v", classAudiences)
	}
}
