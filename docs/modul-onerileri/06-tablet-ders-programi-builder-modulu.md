# 06 - Tablet Ders Programı Builder Modülü

> Amaç: Müdür/system admin için ders programını tablet ve geniş ekranlarda görsel olarak düzenlenebilir hale getirmek.

---

## 1. Ürün Kararı

Ders programı üretimi projede güçlü bir çekirdek modüldür. Telefonda generate/validate/publish yeterlidir; fakat gerçek düzenleme işi geniş ekranda yapılmalıdır. Tablet builder bu yüzden ayrı bir modül olarak ele alınmalıdır.

---

## 2. Kapsam

### Dahil

- Haftalık grid görünümü.
- Sınıf/şube bazlı program.
- Öğretmen bazlı program.
- Ders sürükle-bırak veya modal ile taşıma.
- Öğretmen müsaitlik grid'i.
- Ders saat ihtiyacı editor.
- Çakışma uyarıları.
- Validate/publish akışı.
- Taslak versiyon yönetimi.

### Hariç

- Tam otomatik mükemmel solver garantisi.
- Muhasebe/ücret modülü.
- Öğrenci bireysel ders seçimi.

---

## 3. Veri Modeli

Mevcut scheduling tabloları kullanılabilir. Ek olarak:

```sql
schedule_drafts
- id
- tenant_id
- base_schedule_id nullable
- name
- status              -- draft, validating, published, archived
- created_by
- created_at
- updated_at
```

```sql
schedule_change_logs
- id
- tenant_id
- schedule_id
- actor_user_id
- lesson_id
- change_type
- before jsonb
- after jsonb
- created_at
```

---

## 4. API Tasarımı

Mevcut:

```text
GET   /api/v1/schedules/current
POST  /api/v1/schedules/generate
PATCH /api/v1/schedules/{id}/lessons/{lessonId}
POST  /api/v1/schedules/{id}/validate
POST  /api/v1/schedules/{id}/publish
GET   /api/v1/scheduling/requirements
POST  /api/v1/scheduling/requirements
GET   /api/v1/scheduling/teacher-availabilities
POST  /api/v1/scheduling/teacher-availabilities
```

Önerilen:

```text
POST  /api/v1/schedules/{id}/clone
GET   /api/v1/schedules/{id}/conflicts
GET   /api/v1/schedules/{id}/change-log
PATCH /api/v1/scheduling/teacher-availabilities/bulk
```

---

## 5. Tablet Frontend

### Görünümler

- Şube programı.
- Öğretmen programı.
- Derslik programı.
- Çakışma paneli.
- Müsaitlik paneli.

### Etkileşimler

- Ders kartına dokun -> detay modal.
- Geniş ekranda drag/drop.
- Telefon fallback: modal ile güncelleme.
- Validate sonrası hard conflict kırmızı, soft warning sarı.

---

## 6. Çakışma Kuralları

| Çakışma | Tür |
|---------|-----|
| Öğretmen aynı saatte iki derste | Hard |
| Sınıf aynı saatte iki derste | Hard |
| Derslik aynı saatte iki derste | Hard |
| Öğretmen müsait değil | Hard veya policy'ye göre soft |
| Günlük ders yükü fazla | Soft |
| Haftalık saat ihtiyacı eksik | Soft |

---

## 7. Yetki

- Düzenleme: principal/system_admin.
- Görüntüleme: öğretmen kendi programı, veli öğrencisinin programı, rehberlik öğrenci kapsamı.
- Publish: principal/system_admin.
- Super admin sadece destek amaçlı tenant bağlamında.

---

## 8. Kabul Kriterleri

- Tablet ekranda haftalık grid kullanılabilir.
- Ders taşındığında validate sonucu güncellenir.
- Hard conflict varken publish engellenir.
- Published program öğretmen/veli ekranlarına yansır.
- Değişiklik audit/change log'a düşer.

---

## 9. Test Planı

- Solver/validate unit testleri.
- Lesson PATCH integration.
- Conflict detection test.
- Tablet viewport screenshot test.
- Mobil fallback modal test.
- Publish sonrası öğretmen/veli program smoke.

---

## 10. İlk Uygulama Sırası

1. Mevcut mobil program ekranını koru.
2. Tablet breakpoint ve layout planı.
3. Teacher availability editor.
4. Grid builder.
5. Conflict panel.
6. Change log.
7. Publish smoke test.

---

## 10.1 Uygulama Durumu (2026-06)

| Alan | Durum |
|------|-------|
| Mobil planlama + müsaitlik + validate/publish | Tamam |
| Web program builder (local + API generate) | Tamam |
| Web veri girişi (`/dashboard/schedule/inputs`) | Tamam |
| Sınıf-ders haftalık saat ihtiyacı editor (API) | Tamam |
| Öğretmen müsaitlik grid (API bulk) | Tamam |
| Yayın öncesi eksik veri kontrol listesi | Tamam |
| Tablet drag/drop grid | Tamam (web builder + API taslak) |
| Öğretmen görünümü (web) | Tamam |
| Change log panel (web) | Tamam |
| Çakışma paneli (web) | Tamam |

