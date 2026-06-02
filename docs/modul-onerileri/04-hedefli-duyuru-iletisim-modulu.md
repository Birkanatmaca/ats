# 04 - Hedefli Duyuru ve İletişim Modülü

> Amaç: Duyuruları doğru hedef kitleye, ölçülebilir ve denetlenebilir şekilde ulaştırmak.

---

## 1. Ürün Kararı

Mevcut duyuru modeli `audience` string alanına dayanıyor. Bu, "tüm veliler" ve "öğretmenler" gibi basit hedefler için yeterli, fakat gerçek okul operasyonunda sınıf, şube, öğrenci, veli grubu ve rol kombinasyonları gerekir.

Bu modül duyuruyu basit yayın aracından kontrollü iletişim sistemine dönüştürür.

---

## 2. Kapsam

### Dahil

- Rol hedefleme.
- Sınıf/şube hedefleme.
- Belirli öğrenci velilerine duyuru.
- Öğretmen grubu hedefleme.
- Okundu bilgisi.
- Push + uygulama içi bildirim üretimi.
- Duyuru taslağı.
- Yayın zamanı planlama.
- Duyuru şablonları.

### Hariç

- İki yönlü sohbet.
- Öğrenci sosyal ağı.
- Pazarlama kampanya motoru.

---

## 3. Veri Modeli

```sql
announcements
- id
- tenant_id
- title
- body
- status              -- draft, scheduled, published, archived
- published_at nullable
- scheduled_at nullable
- created_by
- created_at
- updated_at
```

```sql
announcement_audiences
- id
- tenant_id
- announcement_id
- audience_type       -- role, class, section, student, user, all
- audience_id nullable
- role_code nullable
```

```sql
announcement_reads
- id
- tenant_id
- announcement_id
- user_id
- read_at
```

```sql
announcement_templates
- id
- tenant_id
- name
- title_template
- body_template
- category
- created_by
```

---

## 4. API Tasarımı

```text
GET    /api/v1/announcements
POST   /api/v1/announcements
GET    /api/v1/announcements/{id}
PATCH  /api/v1/announcements/{id}
DELETE /api/v1/announcements/{id}
POST   /api/v1/announcements/{id}/publish
POST   /api/v1/announcements/{id}/archive
PATCH  /api/v1/announcements/{id}/read

GET    /api/v1/announcement-templates
POST   /api/v1/announcement-templates
PATCH  /api/v1/announcement-templates/{id}
DELETE /api/v1/announcement-templates/{id}
```

Create payload:

```json
{
  "title": "Veli toplantısı",
  "body": "5-A velileri için toplantı...",
  "audiences": [
    { "type": "section", "id": "section-5a" },
    { "type": "role", "role": "teacher" }
  ],
  "scheduledAt": null
}
```

---

## 5. Mobil Frontend

### Müdür/System Admin

- Duyuru listesi.
- Yeni duyuru sheet.
- Hedef kitle seçici:
  - tüm kurum
  - öğretmenler
  - veliler
  - sınıf
  - şube
  - belirli öğrenciler
- Ön izleme.
- Yayınla / taslak kaydet.

### Öğretmen/Rehberlik/Veli

- Kendi hedeflendiği duyuruları görür.
- Okundu işaretleme.
- Arama/filtre.

---

## 6. Backend Kuralları

- Listeleme endpoint'i kullanıcıya hedeflenmeyen duyuruyu döndürmemelidir.
- Audience çözümü backend'de yapılmalıdır; frontend filtresi güvenlik değildir.
- Duyuru publish olduğunda notification ve push event'i üretilir.
- Scheduled duyurular job/cron ile yayınlanır.
- Duyuru güncelleme published sonrası sınırlı olmalıdır.

---

## 7. Yetki

| İşlem | Roller |
|-------|--------|
| Duyuru oluştur | principal, system_admin, super_admin |
| Duyuru taslak düzenle | oluşturan veya principal/system_admin |
| Duyuru okuma | hedeflenen kullanıcı |
| Template yönetimi | principal, system_admin |
| Platform duyurusu | super_admin |

---

## 8. Kabul Kriterleri

- Müdür 5-A velilerine duyuru gönderdiğinde sadece ilgili veliler görür.
- Öğretmen hedeflenmeyen veli duyurusunu göremez.
- Duyuru publish sonrası push gönderimi tetiklenir.
- Okundu oranı yönetici ekranında görünür.
- Taslak duyuru hedef kullanıcılara görünmez.

---

## 9. Test Planı

- Audience resolver unit test.
- Tenant izolasyon test.
- Role/class/section/student hedefleme integration test.
- Push event test.
- Mobil hedef kitle seçici test.
- Okundu oranı hesaplama test.

---

## 10. İlk Uygulama Sırası

1. `announcement_audiences` ve `announcement_reads` migration.
2. Backend audience resolver.
3. Listeleme güvenlik filtresi.
4. Mobil hedef seçici.
5. Push/in-app notification üretimi.
6. Okundu oranı.
7. Template desteği.

