package memory

import (
	"context"

	billingdomain "ots/backend/internal/domain/billing"
)

func (s *Store) GetBillingSettings(_ context.Context) (billingdomain.Settings, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.billingSettings, nil
}

func (s *Store) UpdateBillingSettings(_ context.Context, input billingdomain.Settings) (billingdomain.Settings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.billingSettings = input
	return s.billingSettings, nil
}
