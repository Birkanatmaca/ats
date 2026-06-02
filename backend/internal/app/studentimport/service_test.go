package studentimport

import (
	"testing"

	domain "ots/backend/internal/domain/studentimport"
)

func TestNormalizeRawRowFromAliases(t *testing.T) {
	row := NormalizeRawRow(map[string]any{
		"okul_no":        "101",
		"ad":             "Ali",
		"soyad":          "Veli",
		"class_name":     "5-A",
		"guardian_name":  "Ayşe Veli",
		"guardian_phone": "0532 111 22 33",
	})
	if row.SchoolNumber != "101" || row.FirstName != "Ali" || row.LastName != "Veli" {
		t.Fatalf("unexpected normalized row: %#v", row)
	}
	if row.GuardianPhone != "5321112233" {
		t.Fatalf("expected normalized phone, got %q", row.GuardianPhone)
	}
}

func TestValidateRowRejectsDuplicateInFile(t *testing.T) {
	ctx := ValidationContext{
		ExistingNumbers: map[string]struct{}{},
		SeenNumbers:     map[string]int{},
		Classes:         []domain.ClassRef{{ID: "class-1", Name: "5-a"}},
	}
	_, status, _ := ValidateRow(1, domain.NormalizedRow{
		SchoolNumber: "101",
		FirstName:    "Ali",
		LastName:     "Veli",
		ClassName:    "5-A",
	}, ctx)
	if status != domain.RowStatusValid {
		t.Fatalf("expected valid first row, got %s", status)
	}
	_, status, messages := ValidateRow(2, domain.NormalizedRow{
		SchoolNumber: "101",
		FirstName:    "Ayşe",
		LastName:     "Veli",
		ClassName:    "5-A",
	}, ctx)
	if status != domain.RowStatusError {
		t.Fatalf("expected duplicate error, got %s", status)
	}
	if len(messages) == 0 {
		t.Fatal("expected duplicate message")
	}
}

func TestMatchClassByCombinedName(t *testing.T) {
	id, ok := MatchClassID([]domain.ClassRef{{ID: "c1", Name: "5-A"}}, "5", "A")
	if !ok || id != "c1" {
		t.Fatalf("expected class match, got %s ok=%v", id, ok)
	}
}

func TestValidateEmail(t *testing.T) {
	if !ValidateEmail("veli@example.com") {
		t.Fatal("expected valid email")
	}
	if ValidateEmail("invalid-email") {
		t.Fatal("expected invalid email")
	}
}

func TestNormalizePreservesJSONNumbers(t *testing.T) {
	row := NormalizeRawRow(map[string]any{"school_number": float64(2024)})
	if row.SchoolNumber != "2024" {
		t.Fatalf("expected numeric school number, got %q", row.SchoolNumber)
	}
}
