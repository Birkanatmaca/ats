package superadmin

import "errors"

var ErrInvalidInstitution = errors.New("invalid institution")
var ErrInstitutionNotFound = errors.New("institution not found")
var ErrInvalidUser = errors.New("invalid user")
var ErrUserAlreadyExists = errors.New("user already exists")
var ErrProtectedUser = errors.New("protected user")
var ErrInvalidSettings = errors.New("invalid settings")
var ErrInvalidSupportTicket = errors.New("invalid support ticket")
var ErrSupportTicketNotFound = errors.New("support ticket not found")
