package studentimport

import (
	"strconv"
	"strings"

	domain "ots/backend/internal/domain/studentimport"
)

type ValidationContext struct {
	ExistingNumbers map[string]struct{}
	SeenNumbers     map[string]int
	Classes         []domain.ClassRef
	CreateMissing   bool
}

func ValidateRow(rowNumber int, normalized domain.NormalizedRow, ctx ValidationContext) (domain.NormalizedRow, domain.RowStatus, []string) {
	messages := make([]string, 0, 4)
	status := domain.RowStatusValid

	if strings.TrimSpace(normalized.SchoolNumber) == "" {
		messages = append(messages, "Okul numarası zorunludur.")
		status = domain.RowStatusError
	}
	if strings.TrimSpace(normalized.FirstName) == "" || strings.TrimSpace(normalized.LastName) == "" {
		messages = append(messages, "Ad ve soyad zorunludur.")
		status = domain.RowStatusError
	}

	numberKey := strings.ToLower(strings.TrimSpace(normalized.SchoolNumber))
	if numberKey != "" {
		if _, exists := ctx.ExistingNumbers[numberKey]; exists {
			messages = append(messages, "Bu okul numarası sistemde kayıtlı.")
			status = domain.RowStatusError
		} else if firstRow, seen := ctx.SeenNumbers[numberKey]; seen {
			messages = append(messages, "Dosyada tekrar eden okul numarası (satır "+strconv.Itoa(firstRow)+").")
			status = domain.RowStatusError
		} else {
			ctx.SeenNumbers[numberKey] = rowNumber
		}
	}

	if !ValidateEmail(normalized.GuardianEmail) {
		messages = append(messages, "Veli e-posta formatı geçersiz.")
		if status != domain.RowStatusError {
			status = domain.RowStatusWarning
		}
	}

	if classID, ok := MatchClassID(ctx.Classes, normalized.ClassName, normalized.SectionName); ok {
		normalized.ClassID = classID
	} else if strings.TrimSpace(normalized.ClassName) != "" {
		if ctx.CreateMissing {
			messages = append(messages, "Sınıf bulunamadı; commit sırasında oluşturulacak.")
			if status == domain.RowStatusValid {
				status = domain.RowStatusWarning
			}
		} else {
			messages = append(messages, "Sınıf/şube eşleşmesi bulunamadı.")
			status = domain.RowStatusError
		}
	} else {
		messages = append(messages, "Sınıf bilgisi eksik.")
		status = domain.RowStatusError
	}

	if len(messages) == 0 {
		messages = append(messages, "Hazır")
	}
	return normalized, status, messages
}
