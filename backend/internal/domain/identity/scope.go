package identity

import "context"

type ScopeType string

const (
	ScopeAll     ScopeType = "all"
	ScopeClass   ScopeType = "class"
	ScopeStudent ScopeType = "student"
)

type UserScope struct {
	Type      ScopeType
	ClassID   string
	StudentID string
}

type scopeKey struct{}

func WithScopes(ctx context.Context, scopes []UserScope) context.Context {
	return context.WithValue(ctx, scopeKey{}, scopes)
}

func ScopesFromContext(ctx context.Context) ([]UserScope, bool) {
	scopes, ok := ctx.Value(scopeKey{}).([]UserScope)
	return scopes, ok
}

func HasScopeRestriction(scopes []UserScope) bool {
	if len(scopes) == 0 {
		return false
	}
	for _, s := range scopes {
		if s.Type == ScopeAll {
			return false
		}
	}
	return true
}
