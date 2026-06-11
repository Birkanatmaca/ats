package announcement

import (
	"strings"

	domain "ots/backend/internal/domain/announcement"
)

func NormalizeAudiences(legacyAudience string, audiences []domain.AudienceTarget) []domain.AudienceTarget {
	if len(audiences) > 0 {
		out := make([]domain.AudienceTarget, 0, len(audiences))
		for _, item := range audiences {
			normalized := normalizeAudienceTarget(item)
			if normalized.Type != "" {
				out = append(out, normalized)
			}
		}
		if len(out) > 0 {
			return out
		}
	}
	legacyAudience = strings.TrimSpace(strings.ToLower(legacyAudience))
	if legacyAudience == "" {
		return nil
	}
	if strings.HasPrefix(legacyAudience, "class:") {
		return []domain.AudienceTarget{{
			Type: domain.AudienceClass,
			ID:   strings.TrimSpace(strings.TrimPrefix(legacyAudience, "class:")),
		}}
	}
	switch legacyAudience {
	case "all":
		return []domain.AudienceTarget{{Type: domain.AudienceAll}}
	case "teachers", "guardians", "guidance", "principal", "teacher", "guardian":
		role := legacyAudience
		if role == "teachers" {
			role = "teacher"
		}
		if role == "guardians" {
			role = "guardian"
		}
		return []domain.AudienceTarget{{Type: domain.AudienceRole, Role: role}}
	default:
		return []domain.AudienceTarget{{Type: domain.AudienceRole, Role: legacyAudience}}
	}
}

func normalizeAudienceTarget(item domain.AudienceTarget) domain.AudienceTarget {
	item.Type = domain.AudienceType(strings.TrimSpace(strings.ToLower(string(item.Type))))
	item.ID = strings.TrimSpace(item.ID)
	item.Role = strings.TrimSpace(strings.ToLower(item.Role))
	if item.Type == domain.AudienceRole {
		if item.Role == "teachers" {
			item.Role = "teacher"
		}
		if item.Role == "guardians" {
			item.Role = "guardian"
		}
	}
	return item
}

func AudienceSummary(audiences []domain.AudienceTarget) string {
	if len(audiences) == 0 {
		return "all"
	}
	if len(audiences) == 1 {
		switch audiences[0].Type {
		case domain.AudienceAll:
			return "all"
		case domain.AudienceRole:
			if audiences[0].Role == "teacher" {
				return "teachers"
			}
			if audiences[0].Role == "guardian" {
				return "guardians"
			}
			return audiences[0].Role
		case domain.AudienceClass, domain.AudienceSection:
			if audiences[0].ID != "" {
				return "class:" + audiences[0].ID
			}
			return "class"
		case domain.AudienceStudent:
			return "student:" + audiences[0].ID
		case domain.AudienceUser:
			return "user:" + audiences[0].ID
		}
	}
	return "mixed"
}

func UserMatchesAudience(ctx domain.UserTargetContext, audiences []domain.AudienceTarget) bool {
	if len(audiences) == 0 {
		return false
	}
	for _, audience := range audiences {
		if userMatchesSingleAudience(ctx, audience) {
			return true
		}
	}
	return false
}

func userMatchesSingleAudience(ctx domain.UserTargetContext, audience domain.AudienceTarget) bool {
	switch audience.Type {
	case domain.AudienceAll:
		return true
	case domain.AudienceRole:
		for _, role := range ctx.RoleCodes {
			if role == audience.Role {
				return true
			}
		}
		return false
	case domain.AudienceClass:
		if audience.ID == "" {
			return false
		}
		for _, studentID := range ctx.GuardianStudentIDs {
			if ctx.StudentClassIDs[studentID] == audience.ID {
				return true
			}
		}
		for _, role := range ctx.RoleCodes {
			if role == "teacher" || role == "principal" || role == "system_admin" {
				return true
			}
		}
		return false
	case domain.AudienceSection:
		if audience.ID == "" {
			return false
		}
		for _, studentID := range ctx.GuardianStudentIDs {
			if ctx.StudentSectionIDs[studentID] == audience.ID {
				return true
			}
		}
		for _, role := range ctx.RoleCodes {
			if role == "teacher" || role == "principal" || role == "system_admin" {
				return true
			}
		}
		return false
	case domain.AudienceStudent:
		if audience.ID == "" {
			return false
		}
		for _, studentID := range ctx.GuardianStudentIDs {
			if studentID == audience.ID {
				return true
			}
		}
		for _, role := range ctx.RoleCodes {
			if role == "teacher" || role == "guidance" || role == "principal" || role == "system_admin" {
				return true
			}
		}
		return false
	case domain.AudienceUser:
		return audience.ID != "" && audience.ID == ctx.UserID
	default:
		return false
	}
}
