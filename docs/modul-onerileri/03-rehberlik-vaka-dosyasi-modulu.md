# 03 - Rehberlik Vaka Dosyası Modülü

> Amaç: Rehberlik notları, destek planları, risk takipleri ve veli görüşmelerini öğrenci bazlı tek bir vaka dosyasında yönetmek.

---

## 1. Ürün Kararı

Mevcut rehberlik ekranları not, plan ve risk takibi olarak ayrı çalışıyor. Bu iyi bir başlangıçtır, fakat profesyonel rehberlik operasyonu için "vaka dosyası" gerekir. Vaka dosyası rehberlik modülünü premium ve kurumsal değeri yüksek bir alana taşır.

Bu modül güvenlik/scope kontrolleri netleşmeden geliştirilmemelidir.

---

## 2. Kapsam

### Dahil

- Öğrenci bazlı vaka dosyası.
- Vaka durumu: açık, izleniyor, kapalı.
- Vaka önceliği: düşük, orta, yüksek, kritik.
- Sorumlu rehberlik personeli.
- Veli görüşmesi kaydı.
- Öğretmen görüşmesi kaydı.
- Müdahale ve takip adımları.
- Vaka zaman çizelgesi.
- Gizlilik/sensitivity seviyesi.
- Müdüre sınırlı özet görünüm.

### Hariç

- Otomatik psikolojik tanı.
- Öğrenciye direkt rehberlik chat'i.
- Açık sosyal/yorum sistemi.

---

## 3. Roller

| Rol | Yetki |
|-----|-------|
| Rehberlik | Kendi scope'undaki vaka dosyalarını oluşturur ve yönetir. |
| Müdür/system_admin | Kurum politikası kadar özet görür; hassas not tam metni opsiyonel kapalıdır. |
| Öğretmen | Sadece kendi gözlemlerini ekler; vaka dosyasını görmez veya sınırlı özet görür. |
| Veli | Rehberlik iç notlarını görmez; sadece kurumun paylaştığı aksiyonları görür. |
| Super admin | İçeriği değil metrikleri görür. |

---

## 4. Veri Modeli

```sql
guidance_cases
- id
- tenant_id
- student_id
- owner_user_id
- status              -- open, monitoring, closed
- priority            -- low, medium, high, critical
- title
- summary
- sensitivity         -- standard, sensitive_student, guidance_confidential
- opened_at
- closed_at nullable
- created_by
- updated_by
- created_at
- updated_at
```

```sql
guidance_case_events
- id
- tenant_id
- case_id
- event_type          -- note, meeting, plan, risk, status_change, file
- title
- body
- actor_user_id
- visibility          -- guidance_only, principal_summary, shared_with_guardian
- occurred_at
- created_at
```

```sql
guidance_case_participants
- id
- tenant_id
- case_id
- participant_type    -- teacher, guardian, counselor, principal
- user_id nullable
- display_name
- relation
```

---

## 5. API Tasarımı

```text
GET    /api/v1/guidance/cases
POST   /api/v1/guidance/cases
GET    /api/v1/guidance/cases/{id}
PATCH  /api/v1/guidance/cases/{id}
POST   /api/v1/guidance/cases/{id}/close
POST   /api/v1/guidance/cases/{id}/reopen

GET    /api/v1/guidance/cases/{id}/events
POST   /api/v1/guidance/cases/{id}/events
PATCH  /api/v1/guidance/cases/{id}/events/{eventId}
DELETE /api/v1/guidance/cases/{id}/events/{eventId}

GET    /api/v1/guidance/students/{id}/case-summary
```

---

## 6. Mobil Frontend

### Rehberlik

- Vaka inbox.
- Öğrenci detayında "Vaka dosyası" sekmesi.
- Vaka oluşturma sheet.
- Zaman çizelgesi.
- Görüşme ekleme sheet.
- Takip aksiyonu ekleme.
- Kapat/yeniden aç confirmation.

### Müdür

- Risk/vaka özet listesi.
- Hassas içerik maskeli özet.
- Kritik vaka sayısı ve geciken takipler.

### Veli

- İç not yok.
- Sadece kurumun paylaşmaya karar verdiği takip aksiyonları veya görüşme randevusu.

---

## 7. Backend Kuralları

- Create/update/delete için `CanAccessStudent` zorunlu.
- Owner değişimi audit log'a yazılır.
- Hassas içerik principal response'unda maskelenebilir.
- Vaka kapandıktan sonra yeni event ekleme sadece reopen sonrası yapılır.
- Silme yerine soft delete tercih edilir.

---

## 8. ogta.ai Entegrasyonu

Güvenli kullanım:

- "Bu öğrencinin son 30 gün risk özetini çıkar."
- "Açık takip planlarını sırala."
- "Veli görüşmesi için tarafsız hazırlık notu oluştur."

Yasak/kaçınılacak:

- Tanı koyma.
- Öğrenciye etiket yapıştırma.
- Veliye otomatik hassas not gönderme.

AI çıktısı her zaman öneri niteliğinde olmalı ve kullanıcı onayı gerektirmelidir.

---

## 9. Kabul Kriterleri

- Rehberlik scope dışı öğrenci için vaka oluşturamaz.
- Vaka zaman çizelgesi not/plan/risk olaylarını birlikte gösterir.
- Müdür hassas not tam metnini varsayılan olarak görmez.
- Vaka kapatıldığında açık takip kalırsa uyarı verilir.
- Her create/update/delete audit log'a düşer.

---

## 10. Test Planı

- Backend policy testleri.
- Tenant izolasyon testleri.
- Rehberlik list/update/delete scope testleri.
- Mobil öğrenci detay -> vaka akışı.
- Müdür maskeli özet görür, veli görmez.
- AI prompt injection ve hassas veri testi.

---

## 11. İlk Uygulama Sırası

1. Rehberlik mevcut note/plan/risk scope açıklarını kapat.
2. `guidance_cases` migration.
3. Case service/repository.
4. Mobil vaka listesi ve öğrenci detay sekmesi.
5. Timeline event modeli.
6. Müdür özet görünümü.
7. AI özet desteği.

