package postgres

import "testing"

func TestNormalizeInstitutionRoleAcceptsDriver(t *testing.T) {
	if got := normalizeInstitutionRole("driver"); got != "driver" {
		t.Fatalf("normalizeInstitutionRole(driver) = %q, want driver", got)
	}
}

func TestRoleNameIncludesDriver(t *testing.T) {
	if got := roleName("driver"); got != "Şoför" {
		t.Fatalf("roleName(driver) = %q, want Şoför", got)
	}
}
