# API Tasarımı

## Genel Yaklaşım

MVP için REST API yeterlidir. API versiyonlu tasarlanmalıdır:

```text
/api/v1
```

Her endpoint auth, tenant scope ve yetki kontrolünden geçmelidir.

## Standart Response

Başarılı cevap:

```json
{
  "data": {},
  "meta": {}
}
```

Hata cevabı:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Geçersiz istek.",
    "details": []
  }
}
```

## Auth Endpoint'leri

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
GET  /api/v1/me
```

## Kurum ve Kullanıcı

```text
GET    /api/v1/tenants/current
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/{id}
PATCH  /api/v1/users/{id}
POST   /api/v1/users/{id}/roles
POST   /api/v1/users/{id}/scopes
```

## Okul Tanımları

```text
GET    /api/v1/academic-years
POST   /api/v1/academic-years
GET    /api/v1/terms
POST   /api/v1/terms
GET    /api/v1/classes
POST   /api/v1/classes
GET    /api/v1/students
POST   /api/v1/students
GET    /api/v1/teachers
POST   /api/v1/teachers
GET    /api/v1/subjects
POST   /api/v1/subjects
```

## Ders Programı

```text
GET    /api/v1/scheduling/requirements
POST   /api/v1/scheduling/requirements
GET    /api/v1/scheduling/teacher-availabilities
POST   /api/v1/scheduling/teacher-availabilities
POST   /api/v1/schedules/generate
GET    /api/v1/schedules/{id}
PATCH  /api/v1/schedules/{id}/lessons/{lessonId}
POST   /api/v1/schedules/{id}/validate
POST   /api/v1/schedules/{id}/publish
GET    /api/v1/teachers/me/calendar
```

## Yoklama

```text
GET    /api/v1/attendance/current-lesson
POST   /api/v1/attendance/sessions
GET    /api/v1/attendance/sessions/{id}
PATCH  /api/v1/attendance/sessions/{id}/records
POST   /api/v1/attendance/sessions/{id}/finalize
GET    /api/v1/students/{id}/attendance-summary
```

## Veli Mobil

```text
GET    /api/v1/guardian/me/students
GET    /api/v1/guardian/students/{studentId}/schedule
GET    /api/v1/guardian/students/{studentId}/attendance
GET    /api/v1/guardian/announcements
GET    /api/v1/guardian/notifications
PATCH  /api/v1/guardian/notifications/{id}/read
```

## Öğrenci Gözlemleri

```text
GET    /api/v1/observations
POST   /api/v1/observations
GET    /api/v1/observations/{id}
PATCH  /api/v1/observations/{id}
DELETE /api/v1/observations/{id}
```

## Rehberlik Sonraki Faz

```text
GET    /api/v1/guidance/cases
POST   /api/v1/guidance/cases
GET    /api/v1/guidance/cases/{id}
POST   /api/v1/guidance/cases/{id}/notes
POST   /api/v1/guidance/cases/{id}/support-plans
GET    /api/v1/guidance/risk-signals
POST   /api/v1/guidance/risk-signals/{id}/review
```

## Dashboard

```text
GET /api/v1/dashboard/principal/summary
GET /api/v1/dashboard/attendance/today
GET /api/v1/dashboard/classes/{classId}/summary
```

## API Tasarım Kuralları

- Liste endpoint'leri pagination desteklemelidir.
- Filtreler query parametre olarak alınmalıdır.
- Tarihler ISO 8601 olmalıdır.
- Hata kodları frontend tarafından ayırt edilebilir sabit kodlar olmalıdır.
- Hassas endpoint'lerde audit middleware çalışmalıdır.
- Mobil API'lerde response payload küçük tutulmalıdır.

