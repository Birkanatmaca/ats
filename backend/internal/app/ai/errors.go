package ai

import "errors"

var (
	ErrInvalidMessage       = errors.New("invalid ai message")
	ErrConversationNotFound = errors.New("ai conversation not found")
	ErrActionNotFound       = errors.New("ai action not found")
	ErrActionNotPending     = errors.New("ai action not pending")
	ErrActionExpired        = errors.New("ai action expired")
	ErrDailyLimitExceeded   = errors.New("ai daily message limit exceeded")
	ErrInvalidCostSettings  = errors.New("invalid ai cost settings")
	ErrForbidden            = errors.New("ai action forbidden")
	ErrTenantDailyLimitExceeded = errors.New("ai tenant daily message limit exceeded")
	ErrTenantTokenLimitExceeded = errors.New("ai tenant monthly token limit exceeded")
)
