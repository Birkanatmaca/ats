package announcement

import (
	"testing"

	domain "ots/backend/internal/domain/announcement"
)

func TestUserMatchesAudienceSection(t *testing.T) {
	ctx := domain.UserTargetContext{
		RoleCodes:          []string{"guardian"},
		GuardianStudentIDs: []string{"student-1"},
		StudentClassIDs:    map[string]string{"student-1": "class-5a"},
		StudentSectionIDs:  map[string]string{"student-1": "class-5a-default"},
	}
	audiences := []domain.AudienceTarget{{Type: domain.AudienceSection, ID: "class-5a-default"}}
	if !UserMatchesAudience(ctx, audiences) {
		t.Fatal("expected guardian to match section audience")
	}
	if UserMatchesAudience(ctx, []domain.AudienceTarget{{Type: domain.AudienceSection, ID: "class-5b-default"}}) {
		t.Fatal("expected guardian not to match other section")
	}
}

func TestNormalizeAudiencesKeepsSectionType(t *testing.T) {
	audiences := NormalizeAudiences("", []domain.AudienceTarget{{Type: domain.AudienceSection, ID: "class-5a-default"}})
	if len(audiences) != 1 || audiences[0].Type != domain.AudienceSection {
		t.Fatalf("expected section audience, got %+v", audiences)
	}
}
