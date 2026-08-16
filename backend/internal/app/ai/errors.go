package ai

import "errors"

var (
	ErrInvalidMessage       = errors.New("invalid ai message")
	ErrConversationNotFound = errors.New("ai conversation not found")
	ErrActionNotFound       = errors.New("ai action not found")
	ErrActionNotPending     = errors.New("ai action not pending")
	ErrActionExpired        = errors.New("ai action expired")
	ErrDailyLimitExceeded   = errors.New("ai daily message limit exceeded")
	ErrInvalidCostSettings    = errors.New("invalid ai cost settings")
	ErrInvalidProviderSettings = errors.New("invalid ai provider settings")
	ErrInvalidProviderKey      = errors.New("invalid ai provider key")
	ErrProviderKeyNotFound     = errors.New("ai provider key not found")
	ErrProviderKeyLimit        = errors.New("ai provider key limit reached")
	ErrProviderKeyDuplicate    = errors.New("ai provider key already exists")
	ErrForbidden            = errors.New("ai action forbidden")
	ErrTenantDailyLimitExceeded = errors.New("ai tenant daily message limit exceeded")
	ErrTenantTokenLimitExceeded = errors.New("ai tenant monthly token limit exceeded")
)
