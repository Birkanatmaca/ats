package middleware

import "testing"

func TestIsPublicPathIncludesPasswordResetRoutes(t *testing.T) {
	public := []string{
		"/api/v1/auth/password/forgot",
		"/api/v1/auth/password/reset",
	}
	for _, path := range public {
		if !isPublicPath(path) {
			t.Fatalf("expected public path %q", path)
		}
	}
}

func TestIsPublicPathRejectsProtectedRoutes(t *testing.T) {
	if isPublicPath("/api/v1/guidance/notes") {
		t.Fatal("expected guidance notes to require auth")
	}
}
