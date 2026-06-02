package studentimport

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"

	domain "ots/backend/internal/domain/studentimport"
)

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func NormalizeRawRow(raw map[string]any) domain.NormalizedRow {
	get := func(keys ...string) string {
		for _, key := range keys {
			if value, ok := raw[key]; ok {
				if text := strings.TrimSpace(toString(value)); text != "" {
					return text
				}
			}
		}
		for rawKey, value := range raw {
			normalizedKey := normalizeImportKey(rawKey)
			for _, key := range keys {
				if normalizedKey == normalizeImportKey(key) {
					if text := strings.TrimSpace(toString(value)); text != "" {
						return text
					}
				}
			}
		}
		return ""
	}

	firstName := get("first_name", "firstname", "ad", "adi")
	lastName := get("last_name", "lastname", "soyad", "soyadi")
	fullName := get("full_name", "fullname", "ad_soyad", "adsoyad", "name")
	if firstName == "" && lastName == "" && fullName != "" {
		firstName, lastName = splitFullName(fullName)
	}

	return domain.NormalizedRow{
		SchoolNumber:     get("school_number", "schoolnumber", "okul_no", "okulno", "student_number", "numara"),
		FirstName:        firstName,
		LastName:         lastName,
		ClassName:        get("class_name", "classname", "sinif", "sinif_adi", "class"),
		SectionName:      get("section_name", "sectionname", "sube", "sube_adi", "section", "branch"),
		GuardianName:     get("guardian_name", "guardianname", "veli_adi", "veliad", "veli"),
		GuardianPhone:    NormalizePhone(get("guardian_phone", "guardianphone", "veli_telefon", "telefon", "phone")),
		GuardianEmail:    strings.ToLower(get("guardian_email", "guardianemail", "veli_email", "email", "eposta")),
		GuardianRelation: get("guardian_relation", "guardianrelation", "yakinlik", "relation"),
		Gender:           get("gender", "cinsiyet"),
		BirthDate:        get("birth_date", "birthdate", "dogum_tarihi"),
		StudentStatus:    get("student_status", "status", "durum"),
	}
}

func NormalizePhone(value string) string {
	digits := make([]rune, 0, len(value))
	for _, r := range value {
		if unicode.IsDigit(r) {
			digits = append(digits, r)
		}
	}
	if len(digits) == 0 {
		return ""
	}
	text := string(digits)
	if strings.HasPrefix(text, "90") && len(text) > 10 {
		text = text[2:]
	}
	if strings.HasPrefix(text, "0") && len(text) == 11 {
		text = text[1:]
	}
	return text
}

func normalizeImportKey(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	replacer := strings.NewReplacer("ı", "i", "ğ", "g", "ü", "u", "ş", "s", "ö", "o", "ç", "c", " ", "_", "-", "_")
	value = replacer.Replace(value)
	var b strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func splitFullName(value string) (string, string) {
	parts := strings.Fields(strings.TrimSpace(value))
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	lastName := parts[len(parts)-1]
	return strings.Join(parts[:len(parts)-1], " "), lastName
}

func toString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case float64:
		if typed == float64(int64(typed)) {
			return fmt.Sprintf("%d", int64(typed))
		}
		return strings.TrimSpace(fmt.Sprintf("%v", typed))
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

func ValidateEmail(email string) bool {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return true
	}
	return emailPattern.MatchString(email)
}

func ClassLookupKey(className, sectionName string) string {
	className = strings.TrimSpace(className)
	sectionName = strings.TrimSpace(sectionName)
	if sectionName != "" && !strings.Contains(strings.ToLower(className), strings.ToLower(sectionName)) {
		return strings.ToLower(strings.TrimSpace(className + " " + sectionName))
	}
	return strings.ToLower(className)
}

func MatchClassID(classes []domain.ClassRef, className, sectionName string) (string, bool) {
	if len(classes) == 0 {
		return "", false
	}
	target := ClassLookupKey(className, sectionName)
	if target == "" {
		return "", false
	}
	for _, class := range classes {
		if strings.ToLower(strings.TrimSpace(class.Name)) == target {
			return class.ID, true
		}
	}
	for _, class := range classes {
		name := strings.ToLower(strings.TrimSpace(class.Name))
		if strings.Contains(target, name) || strings.Contains(name, target) {
			return class.ID, true
		}
	}
	combined := strings.TrimSpace(className)
	if sectionName != "" {
		combined = strings.TrimSpace(className + "-" + sectionName)
	}
	for _, class := range classes {
		if strings.EqualFold(class.Name, combined) {
			return class.ID, true
		}
	}
	return "", false
}

func SplitGuardianName(fullName string) (string, string) {
	return splitFullName(fullName)
}
