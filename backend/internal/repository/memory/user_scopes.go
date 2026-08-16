package memory

import (
	"context"

	identitydomain "ots/backend/internal/domain/identity"
)

func (s *Store) ListUserScopes(_ context.Context, _, _ string) ([]identitydomain.UserScope, error) {
	return nil, nil
}
