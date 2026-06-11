# 01 - Mobil Bildirim Modülü

> Amaç: Mobil uygulamanın anlık okul iletişimi değerini üretmesi: devamsızlık, duyuru, destek ve rehberlik takip olaylarının kullanıcıya push + uygulama içi bildirim olarak ulaşması.

## Durum (Haziran 2026)

| Alan | Durum |
|------|-------|
| Token kayıt / logout unregister | Tamam |
| Bildirim tercihleri (mobil profil) | Tamam |
| Event push: yoklama, duyuru, destek, rehberlik, program, servis | Tamam |
| Deep link yönlendirme | Tamam |
| Super admin push sağlık + log paneli | Tamam |
| Müdür test push (native cihaz) | Tamam |
| Müdür kritik yoklama eksikleri push | Tamam (2 saatte bir cron) |
| EAS preview cihaz doğrulaması | Manuel test gerekli |

---

## 1. Ürün Kararı

Bu modül mobil ürünün ilk gerçek "native değer" katmanıdır. Sadece uygulama içi bildirim listesi yeterli değildir; öğretmen, veli, müdür ve rehberlik rolleri okul olaylarını telefon kilit ekranından görebilmelidir.

Mevcut durumda projede push için temel yapı eklenmiş görünüyor:

- Mobil: `expo-notifications`, `expo-device`, push provider, token kayıt API wrapper.
- Backend: `device_tokens` migration, push domain/service, Expo sender, device token endpoints.
- Event kaynakları: duyuru oluşturma, yoklama finalize, destek talebi güncelleme.

Bu doküman kalan işi üretim kalitesine taşımak için kullanılmalıdır.

---

## 2. Kapsam

### Dahil

- Expo push token alma ve backend'e kaydetme.
- Token logout / cihaz değişimi / token yenileme durumlarını yönetme.
- Kullanıcı bazlı bildirim tercihleri.
- Devamsızlık push bildirimi.
- Duyuru push bildirimi.
- Destek talebi durum push bildirimi.
- Rehberlik takip tarihi hatırlatmaları.
- Uygulama içi bildirim listesiyle push event'lerinin tutarlı olması.
- Push gönderim logları ve hata takibi.

### Hariç

- SMS entegrasyonu.
- E-posta kampanya sistemi.
- Öğrenciler arası mesajlaşma.
- Gerçek zamanlı chat.

---

## 3. Roller ve Senaryolar

| Rol | Senaryo |
|-----|---------|
| Veli | Çocuğu derse gelmedi/geç kaldı bildirimi alır. |
| Öğretmen | Program değişikliği, duyuru ve destek cevabı alır. |
| Müdür | Kritik yoklama eksikleri ve destek talepleri hakkında uyarı alır. |
| Rehberlik | Takip planı yaklaşan öğrenci için hatırlatma alır. |
| Super admin | Push gönderim sağlığı ve kurum bazlı hata oranlarını görür. |

---

## 4. Veri Modeli

Mevcut `device_tokens` tablosu korunabilir, fakat üretim için şu alanlar değerlendirilmelidir:

```sql
device_tokens
- id
- tenant_id
- user_id
- token
- platform
- preferences jsonb
- last_seen_at
- revoked_at nullable
- failure_count integer default 0
- last_error text nullable
- created_at
- updated_at
```

Önerilen ek tablo:

```sql
push_delivery_logs
- id
- tenant_id
- user_id
- device_token_id nullable
- notification_id nullable
- category
- title
- status              -- queued, sent, failed, dropped
- provider
- provider_receipt_id nullable
- error_code nullable
- error_message nullable
- sent_at nullable
- created_at
```

Tercih modeli:

```json
{
  "attendance": true,
  "announcements": true,
  "support": true,
  "guidance": true,
  "schedule": true,
  "billing": true
}
```

Not: Tercihler sadece token satırında tutulursa token yokken yapılan tercih güncellemesi kalıcı olmayabilir. Kullanıcı bazlı ayrı `notification_preferences` tablosu daha sağlamdır.

---

## 5. API Tasarımı

Mevcut endpoint'ler:

```text
GET    /api/v1/me/notification-preferences
PATCH  /api/v1/me/notification-preferences
POST   /api/v1/me/device-tokens
DELETE /api/v1/me/device-tokens?token=...
```

Önerilen ek endpoint'ler:

```text
GET    /api/v1/me/device-tokens
PATCH  /api/v1/me/device-tokens/{id}/revoke
POST   /api/v1/push/test
GET    /api/v1/super-admin/push/health
GET    /api/v1/super-admin/push/logs
```

`POST /api/v1/push/test` sadece geliştirme veya yetkili admin için açık olmalıdır.

---

## 6. Mobil Frontend

### Ekranlar

- Bildirimler inbox.
- Bildirim tercihleri sheet veya profil alt bölümü.
- İlk izin ekranı: sade açıklama + "Bildirimleri aç".
- Token kayıt durumu: sadece debug/development modunda gösterilebilir.

### Uygulama davranışı

- Login sonrası token alınır ve backend'e kaydedilir.
- Logout öncesinde token unregister denenir.
- Web/simülatör ortamında push sessizce devre dışı kalır.
- Push'a tıklayınca ilgili route'a deep link:
  - `attendance` -> veli devamsızlık ekranı
  - `announcement` -> duyuru detayı/liste
  - `support` -> destek talebi
  - `guidance` -> takip planı veya öğrenci detayı
  - `transport` -> veli çocuk ekranı, şoför takip, müdür canlı servis

### Dikkat Edilecekler

- Logout sonrası token silme işlemi auth header olmadan kalabilir. Logout akışında token unregister, `clearAuthSession` öncesi yapılmalıdır.
- `EXPO_PUBLIC_EAS_PROJECT_ID` yoksa token alınamaz. `.env.example` ve EAS config bunu açıkça belgelemelidir.
- Bildirim tercihleri UI'si eklenmelidir; API tek başına yeterli değildir.

---

## 7. Backend İş Akışı

1. Domain event oluşur.
2. Uygulama içi `notifications` kaydı üretilir.
3. Push servis hedef kullanıcıları bulur.
4. Kullanıcının tercihleri ve aktif tokenları kontrol edilir.
5. Expo sender çağrılır.
6. Gönderim loglanır.
7. Hatalı tokenlar işaretlenir veya pasifleştirilir.

Event kaynakları:

- Yoklama finalize.
- Duyuru publish.
- Destek talebi durum değişimi.
- Rehberlik plan due date yaklaşıyor.
- Program değişikliği publish.
- Müdür/sistem yöneticisi için bekleyen günlük yoklama özeti (cron, günde bir kez kullanıcı başına).

---

## 8. Yetki ve Güvenlik

- Device token sadece oturumdaki kullanıcı adına kaydedilebilir.
- Tenant izolasyonu zorunludur.
- Push içeriğinde hassas rehberlik notu tam metin olarak gönderilmemelidir.
- Veliye sadece kendi çocuğuna ait devamsızlık gider.
- Push data payload içinde hassas metin yerine route/category/id taşınmalıdır.

---

## 9. Kabul Kriterleri

- Native cihazda login sonrası token backend'e kaydedilir.
- Web/simülatörde hata vermeden push devre dışı kalır.
- Veli, çocuğu absent/late olduğunda push alır.
- Müdür duyuru yayınlayınca hedef kitle push alır.
- Kullanıcı bildirim tercihlerini kapatınca ilgili kategori push almaz.
- Push hatası uygulama içi bildirimi silmez.
- `npm run typecheck`, `npm test`, backend `go test ./...` geçer.

---

## 10. Test Planı

- Unit: preference merge, token register validation, category enabled.
- Backend integration: attendance finalize -> guardian push sender çağrılır.
- Backend integration: announcement audience -> doğru kullanıcı listesi.
- Mobile unit: push registration web/simülatör/native ayrımı.
- Manual native: iOS/Android preview build ile gerçek push.
- Regression: logout sonrası token unregister sırası.

---

## 11. İlk Uygulama Sırası

1. Mevcut push kodunu testle sabitle.
2. Bildirim tercihleri UI'sini ekle.
3. User-level preference tablosunu değerlendir.
4. Push delivery log ekle.
5. Deep link yönlendirme ekle.
6. Rehberlik ve program event'lerini ekle.
7. EAS preview cihaz testi yap.

