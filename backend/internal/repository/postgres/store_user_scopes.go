package postgres

import (
	"context"

	identitydomain "ots/backend/internal/domain/identity"
)

func (s *Store) ListUserScopes(ctx context.Context, tenantID, userID string) ([]identitydomain.UserScope, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT scope_type, COALESCE(class_id::text, ''), COALESCE(student_id::text, '')
FROM user_scopes
WHERE tenant_id = $1 AND user_id = $2`,
		tenantID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []identitydomain.UserScope
	for rows.Next() {
		var scopeType string
		var classID, studentID string
		if err := rows.Scan(&scopeType, &classID, &studentID); err != nil {
			return nil, err
		}
		out = append(out, identitydomain.UserScope{
			Type:      identitydomain.ScopeType(scopeType),
			ClassID:   classID,
			StudentID: studentID,
		})
	}
	return out, rows.Err()
}

func (s *Store) userCanAccessStudentViaScopes(ctx context.Context, tenantID, userID, studentID string) (bool, bool) {
	scopes, err := s.ListUserScopes(ctx, tenantID, userID)
	if err != nil || len(scopes) == 0 {
		return false, false
	}
	for _, scope := range scopes {
		switch scope.Type {
		case identitydomain.ScopeAll:
			return true, true
		case identitydomain.ScopeStudent:
			if scope.StudentID == studentID {
				return true, true
			}
		case identitydomain.ScopeClass:
			if scope.ClassID == "" {
				continue
			}
			var exists bool
			err := s.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM class_students
  WHERE tenant_id = $1 AND class_id = $2::uuid AND student_id = $3::uuid
    AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
)`, tenantID, scope.ClassID, studentID).Scan(&exists)
			if err == nil && exists {
				return true, true
			}
		}
	}
	return false, true
}

func (s *Store) teacherCanObserveViaScopes(ctx context.Context, tenantID, teacherUserID, studentID string) (bool, bool) {
	return s.userCanAccessStudentViaScopes(ctx, tenantID, teacherUserID, studentID)
}
