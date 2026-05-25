package handlers

import (
	"context"

	"ots/backend/internal/domain/identity"
	observationDomain "ots/backend/internal/domain/observation"
)

func (h *Handler) filterObservationsForRole(ctx context.Context, principal identity.Principal, items []observationDomain.Observation) []observationDomain.Observation {
	switch principal.Role {
	case identity.RoleGuardian:
		return nil
	case identity.RoleTeacher:
		filtered := make([]observationDomain.Observation, 0, len(items))
		for _, item := range items {
			if item.AuthorID == principal.UserID {
				filtered = append(filtered, item)
				continue
			}
			if h.observation.TeacherCanObserveStudent(ctx, principal.TenantID, principal.UserID, item.StudentID) {
				filtered = append(filtered, item)
			}
		}
		return filtered
	case identity.RoleGuidance:
		filtered := make([]observationDomain.Observation, 0, len(items))
		for _, item := range items {
			if h.guidance.CanAccessStudent(ctx, principal.TenantID, principal.UserID, item.StudentID) {
				filtered = append(filtered, item)
			}
		}
		return filtered
	default:
		return items
	}
}

func (h *Handler) canReadObservation(ctx context.Context, principal identity.Principal, item observationDomain.Observation) bool {
	switch principal.Role {
	case identity.RoleGuardian:
		return false
	case identity.RoleTeacher:
		if item.AuthorID == principal.UserID {
			return true
		}
		return h.observation.TeacherCanObserveStudent(ctx, principal.TenantID, principal.UserID, item.StudentID)
	case identity.RoleGuidance:
		return h.guidance.CanAccessStudent(ctx, principal.TenantID, principal.UserID, item.StudentID)
	default:
		return true
	}
}

func (h *Handler) canModifyObservation(principal identity.Principal, item observationDomain.Observation) bool {
	switch principal.Role {
	case identity.RoleTeacher:
		return item.AuthorID == principal.UserID
	case identity.RolePrincipal, identity.RoleSystemAdmin:
		return true
	default:
		return false
	}
}

func (h *Handler) canViewStudentAttendanceSummary(ctx context.Context, principal identity.Principal, studentID string) bool {
	switch principal.Role {
	case identity.RoleGuardian:
		return h.guardian != nil && h.guardian.HasStudent(ctx, principal.TenantID, principal.UserID, studentID)
	case identity.RoleTeacher:
		return h.observation.TeacherCanObserveStudent(ctx, principal.TenantID, principal.UserID, studentID)
	case identity.RoleGuidance:
		return h.guidance.CanAccessStudent(ctx, principal.TenantID, principal.UserID, studentID)
	case identity.RolePrincipal, identity.RoleSystemAdmin:
		return true
	default:
		return false
	}
}

func (h *Handler) canViewTenantAttendanceReport(principal identity.Principal) bool {
	switch principal.Role {
	case identity.RolePrincipal, identity.RoleSystemAdmin:
		return true
	default:
		return false
	}
}
