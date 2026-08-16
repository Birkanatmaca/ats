package memory

import (
	"context"
	"strings"

	identitydomain "ots/backend/internal/domain/identity"
	superadmindomain "ots/backend/internal/domain/superadmin"
)

func (s *Store) GetUserProfile(_ context.Context, tenantID string, userID string) (identitydomain.UserProfile, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, user := range s.users {
		if user.ID != userID {
			continue
		}
		if tenantID != "" && user.TenantID != tenantID {
			continue
		}
		accent := user.ProfileAccent
		if accent == "" {
			accent = "#0891b2"
		}
		return identitydomain.UserProfile{
			ID:                 user.ID,
			TenantID:           user.TenantID,
			Tenant:             user.Tenant,
			FullName:           user.FullName,
			Email:              user.Email,
			Phone:              user.Phone,
			Role:               user.Role,
			Status:             userStatus(user),
			AvatarURL:          user.AvatarURL,
			ProfileAccent:      accent,
			MustChangePassword: user.MustChangePassword,
			CreatedAt:          user.CreatedAt,
		}, true, nil
	}
	return identitydomain.UserProfile{}, false, nil
}

func (s *Store) UpdateSelfProfile(_ context.Context, principal identitydomain.Principal, input superadmindomain.UpdateSelfProfileInput) (identitydomain.UserProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for index := range s.users {
		if s.users[index].ID != principal.UserID {
			continue
		}
		if input.FullName != nil {
			name := strings.TrimSpace(*input.FullName)
			if name == "" {
				return identitydomain.UserProfile{}, superadmindomain.ErrInvalidUser
			}
			s.users[index].FullName = name
		}
		if input.Email != nil {
			email := strings.ToLower(strings.TrimSpace(*input.Email))
			if email == "" || !strings.Contains(email, "@") {
				return identitydomain.UserProfile{}, superadmindomain.ErrInvalidUser
			}
			for _, other := range s.users {
				if other.ID != principal.UserID && strings.EqualFold(other.Email, email) {
					return identitydomain.UserProfile{}, superadmindomain.ErrUserAlreadyExists
				}
			}
			s.users[index].Email = email
		}
		if input.Phone != nil {
			s.users[index].Phone = strings.TrimSpace(*input.Phone)
		}
		if input.AvatarURL != nil {
			s.users[index].AvatarURL = strings.TrimSpace(*input.AvatarURL)
		}
		if input.ProfileAccent != nil {
			accent := strings.TrimSpace(*input.ProfileAccent)
			if accent == "" {
				accent = "#0891b2"
			}
			s.users[index].ProfileAccent = accent
		}
		user := s.users[index]
		accent := user.ProfileAccent
		if accent == "" {
			accent = "#0891b2"
		}
		return identitydomain.UserProfile{
			ID:                 user.ID,
			TenantID:           user.TenantID,
			Tenant:             user.Tenant,
			FullName:           user.FullName,
			Email:              user.Email,
			Phone:              user.Phone,
			Role:               user.Role,
			Status:             userStatus(user),
			AvatarURL:          user.AvatarURL,
			ProfileAccent:      accent,
			MustChangePassword: user.MustChangePassword,
			CreatedAt:          user.CreatedAt,
		}, nil
	}
	return identitydomain.UserProfile{}, identitydomain.ErrUserNotFound
}

func userAccountFromSystem(user systemUser) superadmindomain.UserAccount {
	accent := user.ProfileAccent
	if accent == "" {
		accent = "#0891b2"
	}
	return superadmindomain.UserAccount{
		ID:                 user.ID,
		TenantID:           user.TenantID,
		Tenant:             user.Tenant,
		FullName:           user.FullName,
		Email:              user.Email,
		Phone:              user.Phone,
		Role:               string(user.Role),
		Status:             userStatus(user),
		AvatarURL:          user.AvatarURL,
		ProfileAccent:      accent,
		MustChangePassword: user.MustChangePassword,
		CreatedAt:          user.CreatedAt,
	}
}
