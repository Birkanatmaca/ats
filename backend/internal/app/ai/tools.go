package ai

import (
	"ots/backend/internal/domain/identity"
	"ots/backend/internal/platform/openai"
)

func toolsForRole(role identity.Role) []openai.ToolDefinition {
	switch role {
	case identity.RoleTeacher:
		return teacherTools()
	case identity.RoleGuidance:
		return guidanceTools()
	case identity.RolePrincipal, identity.RoleSystemAdmin:
		return principalTools()
	case identity.RoleGuardian:
		return guardianTools()
	default:
		return nil
	}
}

func teacherTools() []openai.ToolDefinition {
	return []openai.ToolDefinition{
		{
			Name:        "search_students",
			Description: "Yetkili öğrenciler arasında isim veya numaraya göre arama yapar.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{"type": "string", "description": "Öğrenci adı veya okul numarası"},
				},
				"required": []string{"query"},
			},
		},
		{
			Name:        "draft_observation",
			Description: "Seçilen öğrenci için onay bekleyen gözlem kaydı taslağı oluşturur.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"student_id": map[string]any{"type": "string"},
					"category":   map[string]any{"type": "string", "enum": []string{"participation", "attention", "behavior", "social", "absence_risk", "academic_drop", "teacher_note"}},
					"note":       map[string]any{"type": "string"},
				},
				"required": []string{"student_id", "category", "note"},
			},
		},
	}
}

func guidanceTools() []openai.ToolDefinition {
	return []openai.ToolDefinition{
		{
			Name:        "search_students",
			Description: "Rehberlik kapsamındaki öğrencileri arar.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{"type": "string"},
				},
				"required": []string{"query"},
			},
		},
		{
			Name:        "draft_guidance_note",
			Description: "Onay bekleyen rehberlik notu taslağı oluşturur.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"student_id": map[string]any{"type": "string"},
					"title":      map[string]any{"type": "string"},
					"body":       map[string]any{"type": "string"},
					"note_type":  map[string]any{"type": "string"},
				},
				"required": []string{"student_id", "title", "body"},
			},
		},
		{
			Name:        "draft_support_plan",
			Description: "Onay bekleyen destek planı taslağı oluşturur.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"student_id":  map[string]any{"type": "string"},
					"title":       map[string]any{"type": "string"},
					"description": map[string]any{"type": "string"},
				},
				"required": []string{"student_id", "title", "description"},
			},
		},
		{
			Name:        "summarize_risk_signals",
			Description: "Kurum genelindeki risk sinyallerini özetler.",
			Parameters:  map[string]any{"type": "object", "properties": map[string]any{}},
		},
	}
}

func principalTools() []openai.ToolDefinition {
	return []openai.ToolDefinition{
		{
			Name:        "dashboard_summary",
			Description: "Müdür dashboard operasyon özetini döndürür.",
			Parameters:  map[string]any{"type": "object", "properties": map[string]any{}},
		},
		{
			Name:        "attendance_today",
			Description: "Bugünkü yoklama durumunu özetler.",
			Parameters:  map[string]any{"type": "object", "properties": map[string]any{}},
		},
		{
			Name:        "draft_announcement",
			Description: "Onay bekleyen duyuru taslağı oluşturur.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"title":    map[string]any{"type": "string"},
					"body":     map[string]any{"type": "string"},
					"audience": map[string]any{"type": "string"},
				},
				"required": []string{"title", "body"},
			},
		},
		{
			Name:        "search_students",
			Description: "Kurum öğrencilerini arar.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{"type": "string"},
				},
				"required": []string{"query"},
			},
		},
	}
}

func guardianTools() []openai.ToolDefinition {
	return []openai.ToolDefinition{
		{
			Name:        "child_schedule",
			Description: "Velinin bağlı olduğu çocuğun ders programını özetler.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"student_id": map[string]any{"type": "string", "description": "Boş bırakılırsa ilk çocuk kullanılır"},
				},
			},
		},
		{
			Name:        "child_attendance",
			Description: "Velinin çocuğunun devamsızlık özetini döndürür.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"student_id": map[string]any{"type": "string"},
				},
			},
		},
		{
			Name:        "recent_announcements",
			Description: "Veliye yönelik son duyuruları listeler.",
			Parameters:  map[string]any{"type": "object", "properties": map[string]any{}},
		},
		{
			Name:        "draft_support_ticket",
			Description: "Onay bekleyen destek talebi taslağı oluşturur.",
			Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"type":    map[string]any{"type": "string"},
					"subject": map[string]any{"type": "string"},
					"message": map[string]any{"type": "string"},
				},
				"required": []string{"subject", "message"},
			},
		},
	}
}

func systemPromptForRole(role identity.Role) string {
	switch role {
	case identity.RoleTeacher:
		return "Sen ogta.ai öğretmen asistanısın. Yalnızca yetkili öğrenciler için işlem yap. Yazma işlemleri için uygun aracı çağır; klinik tanı koyma. Türkçe yanıt ver."
	case identity.RoleGuidance:
		return "Sen ogta.ai rehberlik asistanısın. Hassas öğrenci verilerini yalnızca özetle; yazma işlemleri için araç kullan. Türkçe yanıt ver."
	case identity.RolePrincipal, identity.RoleSystemAdmin:
		return "Sen ogta.ai müdür asistanısın. Operasyon özetleri ver; duyuru yayınlamadan önce draft aracını kullan. Türkçe yanıt ver."
	case identity.RoleGuardian:
		return "Sen ogta.ai veli asistanısın. Yalnızca velinin çocuğuyla ilgili bilgi ver; ham gözlem/rehberlik notu paylaşma. Türkçe yanıt ver."
	default:
		return "Sen ogta.ai asistanısın. Türkçe yanıt ver."
	}
}
