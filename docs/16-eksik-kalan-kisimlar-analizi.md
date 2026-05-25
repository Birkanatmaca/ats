# Eksik Kalan Kısımlar Analizi

> Tarih: 2026-05-25  
> Kapsam: `docs/00` - `docs/17`, Go backend, PostgreSQL migrasyonları ve React web paneli.  
> Amaç: Sistemde tamamlanmamış, dokümanla kod arasında farklılaşmış veya düzeltilmesi gereken alanları netleştirmek.

> **Güncelleme (2026-05-25):** ogta.ai modülü uygulandı. Güncel durum, tamamlanan fazlar ve kalan ogta.ai eksikleri için bkz. **[17-ogta-ai-durum-ve-eksikler.md](./17-ogta-ai-durum-ve-eksikler.md)**.

---

## 1. Yönetici Özeti

Sistem artık ilk doküman setindeki MVP hedeflerine oldukça yaklaşmış durumda. Kod tarafında PostgreSQL repository kullanımı, JWT auth, okul CRUD, ders programı, yoklama, veli konsolu, gözlem, rehberlik notları, destek planları ve bildirim akışları büyük ölçüde var.

Ancak iki ayrı gerçek var:

1. Mevcut web MVP, dokümanlardaki bazı eski eksik maddeleri aşmış durumda.
2. Yetki/scope, E2E test, API envanteri, hedefli duyuru ve yeni `ogta.ai` katmanı tarafında önemli boşluklar duruyor.

En kritik sonuç:

- ogta.ai çekirdeği ve dört rol MVP'si tamamlandı (bkz. doc 17). Hassas endpoint scope kuralları hâlâ sertleştirilmeli.
- AI, mevcut domain servislerini kullanıyor; model doğrudan DB yazmıyor.

---

## 2. Güncel Tamamlanma Tahmini

| Alan | Tahmini durum | Not |
|------|---------------|-----|
| Ürün ve mimari dokümanları | %95 | Yeni `ogta.ai` dokümanı eklendiğinde kapsam tamamlanıyor |
| Backend API | %85 | Ana MVP endpoint'leri var, fakat bazı scope ve CRUD boşlukları duruyor |
| PostgreSQL şema | %88 | MVP tabloları var, AI ve hedefli duyuru tabloları yok |
| Web UI | %84 | Rol konsolları çalışıyor, bazı legacy/demo ve mimari borçlar var |
| Web uçtan uca | %87 | Ana akışlar API'ye bağlı, Playwright/Cypress E2E yok |
| Auth/güvenlik | %80 | JWT ve tenant var, hassas endpoint scope kontrolleri tamamlanmalı |
| Rehberlik modülü | %70 | Not ve destek planı var, vaka dosyası ve kalıcı risk sinyali yok |
| ogta.ai | %85 | Çekirdek + 4 rol MVP + Faz 5 kısmen; OpenAI tool loop ve E2E eksik — bkz. doc 17 |

---

## 3. Öncelikli Bulgular

### P0 - AI öncesi çözülmesi gereken güvenlik/scope açıkları

Bu maddeler `ogta.ai` eklenmeden önce veya aynı PR dalgasında çözülmelidir. AI asistanı bu endpoint'leri tool olarak kullanacağı için mevcut boşluklar büyür.

#### 3.1 Gözlem listeleme tüm tenant kayıtlarını döndürüyor

Kaynak: `backend/internal/http/handlers/handlers.go` içindeki `listObservations`.

Mevcut davranış:

- Her authenticated kullanıcı `GET /api/v1/observations` çağırabiliyor.
- Handler sadece tenant filtresi uyguluyor.
- Öğretmen frontend'i kendi notlarını filtreliyor, ancak backend öğretmene tenant içindeki tüm gözlemleri döndürebiliyor.
- Veli veya alakasız rol bu endpoint'e ulaşırsa hassas öğrenci notu görme riski var.

Gereken davranış:

- Öğretmen sadece kendi oluşturduğu veya kendi yetkili öğrencilerine ait izin verilen gözlemleri görmeli.
- Rehberlik kendi scope'una göre görmeli.
- Müdür sadece kurum politikasına göre özet veya maskeleme ile görmeli.
- Veli bu endpoint'i kullanmamalı.

Önerilen iş:

- `ListObservations(ctx, tenantID, principal)` imzasına rol ve scope eklenmeli.
- Repository sorgusu role göre filtrelenmeli.
- Frontend filtrelemesi güvenlik değil sadece UX kabul edilmeli.

#### 3.2 Gözlem detay/güncelleme/silme author veya scope kontrolü yapmıyor

Kaynak: `getObservation`, `updateObservation`, `deleteObservation`.

Mevcut davranış:

- Sadece authenticated principal aranıyor.
- Tenant içinde observation ID biliniyorsa detay, update ve delete yolu açılıyor.

Gereken davranış:

- Öğretmen sadece kendi kaydını veya izin verilen öğrencisini düzenleyebilmeli.
- Rehberlik düzenleme yetkisi kurum politikasına bağlı olmalı.
- Veli erişimi olmamalı.
- Silme soft delete olsa bile rol/scope ve audit zorunlu olmalı.

Önerilen iş:

- `CanReadObservation`, `CanUpdateObservation`, `CanDeleteObservation` policy fonksiyonları yazılmalı.
- Unit ve integration test eklenmeli.

#### 3.3 Öğrenci devamsızlık özeti endpoint'i scope kontrolü eksik

Kaynak: `GET /api/v1/students/{id}/attendance-summary`.

Mevcut davranış:

- Handler sadece tenant kontrolü yapıyor.
- Aynı tenant içindeki authenticated kullanıcı öğrenci ID'sini biliyorsa özet alabilir.

Gereken davranış:

- Müdür ve system admin kurum kapsamında görebilir.
- Öğretmen sadece kendi ders verdiği/scope kapsamındaki öğrenciyi görebilir.
- Rehberlik kendi scope'una göre görebilir.
- Veli yalnızca `student_guardians` ilişkili çocuğunu görebilir.

Önerilen iş:

- Genel endpoint'e role/scope policy eklenmeli veya role özel endpoint'ler kullanılmalı.
- Guardian tarafı zaten `/api/v1/guardian/students/{studentId}/attendance` ile güvenli akışa sahip; genel endpoint veliye kapatılmalı.

#### 3.4 Günlük yoklama raporu role göre sınırlandırılmalı

Kaynak: `GET /api/v1/dashboard/attendance/today`.

Mevcut davranış:

- Handler authenticated kullanıcıyla yetiniyor.
- Bu rapor tenant genelindeki yoklama kayıtlarını döndürüyor.

Gereken davranış:

- Müdür/system admin tüm kurumu görmeli.
- Öğretmen sadece kendi dersleri veya kendi sınıflarıyla sınırlı rapor görmeli.
- Rehberlik için özel özet düşünülmeli.
- Veli bu endpoint'i kullanmamalı.

---

## 4. P1 - Ürün/MVP Eksikleri

### 4.1 ogta.ai modülü — çekirdek tamam, genişletme devam ediyor

Güncel durum: **[17-ogta-ai-durum-ve-eksikler.md](./17-ogta-ai-durum-ve-eksikler.md)**

Tamamlanan:

- Migration, domain, service, handler, frontend dock (4 rol)
- Öğretmen gözlem, rehberlik notu/plan, müdür duyuru/dashboard, veli Q&A + destek talebi
- Prompt injection filtresi, rate limit, günlük kota, retention job, integration testler

Kalan:

- OpenAI Responses API tool loop (şu an rule-engine)
- Playwright E2E
- Token/maliyet metrikleri, streaming

### 4.2 Öğretmen-ders eşleştirme endpoint'i eksik

Dokümanlarda `teacher_subjects` veri modeli var. Kodda tablo var, fakat ayrı yönetim endpoint'i görünmüyor.

Etkisi:

- Ders programı üretim kalitesi düşer.
- Müdürün öğretmen branş/ders yetkinliğini sistematik yönetmesi zorlaşır.
- AI asistanı "bu öğretmene matematik dersi ata" gibi komutları güvenle çalıştıramaz.

Gereken iş:

```text
GET    /api/v1/teacher-subjects
POST   /api/v1/teacher-subjects
DELETE /api/v1/teacher-subjects/{teacherId}/{subjectId}
```

veya öğretmen detayına gömülü:

```text
GET    /api/v1/teachers/{id}/subjects
PUT    /api/v1/teachers/{id}/subjects
```

### 4.3 Hedefli duyuru tablosu eksik

Mevcut durum:

- `announcements.audience` string alanı var.
- Dokümanda `announcement_audiences` ayrı tablo olarak planlanmış.
- Frontend rol ve opsiyonel sınıf seçici sunuyor, ancak kalıcı hedefleme modeli sınırlı.

Etkisi:

- Duyurunun "sadece 5-A velileri" gibi hedefleri doğru ve denetlenebilir biçimde yönetilemez.
- AI duyuru oluşturduğunda yanlış kitleye gönderme riski artar.

Gereken iş:

- `announcement_audiences` tablosu.
- Hedef türleri: `role`, `class`, `student`, `all`.
- Duyuru listeleme endpoint'lerinde audience join filtreleri.
- Duyuru gönderimi için audit.

### 4.4 Veli CRUD tam değil

Mevcut durum:

- `POST /api/v1/principal/guardians` ile veli provision var.
- Listeleme, güncelleme, pasifleştirme ve veli-öğrenci ilişkisi yönetimi tam set değil.

Etkisi:

- Yanlış veli telefon/e-posta düzeltme akışı eksik kalır.
- Veli erişimini kaldırma veya ilişki güncelleme net değildir.
- AI asistanına veli işlemleri açılmadan önce bu CRUD tamamlanmalı.

Gereken endpoint seti:

```text
GET    /api/v1/guardians
GET    /api/v1/guardians/{id}
PATCH  /api/v1/guardians/{id}
DELETE /api/v1/guardians/{id}
POST   /api/v1/students/{id}/guardians
DELETE /api/v1/students/{id}/guardians/{guardianId}
```

### 4.5 Ders programı input UI kısmi

Mevcut durum:

- Backend `scheduling/requirements` ve `teacher-availabilities` endpoint'lerine sahip.
- Dokümanlarda `C2.5` kısmi görünüyor.

Etkisi:

- Program üretimi için gereken haftalık saat ihtiyacı ve öğretmen müsaitliği UI tarafında tam yönetilemezse solver kalitesi düşer.
- Müdür her şeyi AI ile yapmak istese bile altında yönetilebilir veri ekranları eksik kalır.

Gereken iş:

- Öğretmen müsaitlik grid'i.
- Sınıf-ders haftalık saat ihtiyacı formu.
- Eksik veri uyarılarını yayınlama öncesi zorunlu kontrol haline getirme.

---

## 5. P1 - Rehberlik ve Erken Uyarı Eksikleri

### 5.1 Guidance case dosyası yok

Dokümanda `guidance_cases` var, ancak kodda vaka dosyası endpoint'i yok.

Mevcut olan:

- `guidance_notes`
- `support_plans`
- guidance student list

Eksik olan:

- Öğrenci için tekil vaka dosyası.
- Vaka durumu.
- Sorumlu rehberlik personeli.
- Vaka açılış/kapanış tarihi.
- Not, plan, risk ve görüşme kayıtlarını bir araya getiren detay ekranı.

Önerilen endpoint:

```text
GET    /api/v1/guidance/cases
POST   /api/v1/guidance/cases
GET    /api/v1/guidance/cases/{id}
PATCH  /api/v1/guidance/cases/{id}
POST   /api/v1/guidance/cases/{id}/notes
POST   /api/v1/guidance/cases/{id}/support-plans
```

### 5.2 Risk sinyalleri backend'de kalıcı değil

Mevcut durum:

- Rehberlik riskleri frontend'de `buildGuidanceRiskSignals` ile gözlemlerden türetiliyor.
- `risk_signals` tablosu ve review endpoint'i yok.

Etkisi:

- Risk değerlendirme geçmişi tutulmuyor.
- Rehberlik "inceledim", "yanlış alarm", "takip açıldı" gibi kararları işleyemiyor.
- AI özetleri için güvenilir, denetlenebilir risk kaydı oluşmuyor.

Gereken iş:

- `risk_signals` tablosu.
- Kural tabanlı sinyal üretici job veya servis.
- `GET /api/v1/guidance/risk-signals`
- `POST /api/v1/guidance/risk-signals/{id}/review`
- Review audit.

### 5.3 Rehberlik okuma audit kapsamı sınırlı

Mevcut durum:

- Gözlem listesi rehberlik rolüyle açıldığında `guidance.view` audit yazılıyor.
- `guidance_notes` ve `support_plans` listelemeleri GET olduğu için genel audit middleware tarafından loglanmıyor.

Etkisi:

- Hassas rehberlik verisi görüntüleme izleri eksik kalabilir.

Gereken iş:

- Rehberlik notu, destek planı ve vaka detay görüntülemeleri için explicit audit yazılmalı.
- Liste görüntüleme ile detay görüntüleme ayrı action olmalı.

---

## 6. P1 - Test ve Kabul Eksikleri

### 6.1 Web E2E testi yok

CI var:

- Backend `go test ./...`
- Frontend `npm ci && npm run build`

Eksik:

- Playwright veya Cypress smoke test.

Önerilen minimum E2E senaryoları:

1. Müdür login olur, öğrenci oluşturur.
2. Müdür ders programı üretir ve yayınlar.
3. Öğretmen login olur, dersini görür.
4. Öğretmen gözlem oluşturur.
5. Rehberlik login olur, gözlemi görür.
6. Veli login olur, yalnızca kendi çocuğunu görür.

AI eklendikten sonra ek senaryo:

1. Öğretmen `ogta.ai` ile öğrenci arar.
2. Gözlem taslağı onay bekler.
3. Onay verilmeden kayıt oluşmaz.
4. Onay verilince gözlem oluşur.

### 6.2 Kabul kriterleri otomatik doğrulanmıyor

`docs/13-mvp-epik-kabul-kriterleri.md` iyi bir ürün listesi sunuyor, fakat maddelerin otomatik test veya checklist raporu yok.

Gereken iş:

- Her kabul kriteri için `manual`, `integration`, `e2e` etiketi.
- CI'da backend integration testleri.
- Playwright smoke test raporu.
- Demo veriyle manuel test checklist'i.

---

## 7. P2 - Frontend Mimari Borçları

### 7.1 TanStack Query yok

Mevcut durum:

- `api.ts` merkezi fetch wrapper var.
- Rol konsolları çoğunlukla `useEffect` ve `Promise.allSettled` ile veri çekiyor.

Etkisi:

- Cache invalidation elle yapılıyor.
- AI action sonrası ilgili panel verisini yenilemek zorlaşır.
- Loading/error state'leri her sayfada farklılaşır.

Önerilen iş:

- `@tanstack/react-query` kurulumu.
- Önce gözlem, rehberlik notları, destek planları ve bildirimler taşınmalı.
- AI action başarılarında query invalidation kullanılmalı.

### 7.2 React Hook Form / Zod yok

Mevcut durum:

- Form validasyonları component içinde elle yapılıyor.
- Dokümanda Zod/RHF hedeflenmiş.

Etkisi:

- AI tarafından doldurulan formlarda schema paylaşımı zorlaşır.
- Frontend ve backend validasyon mesajları ayrışır.

Önerilen iş:

- Öğrenci, öğretmen, gözlem, rehberlik notu, destek planı formları için shared validation schema.
- AI pending action payload doğrulamasında da aynı alan kuralları kullanılmalı.

### 7.3 Shared package yapısı yok

Dokümanda şu paketler hedeflenmiş:

```text
frontend/packages/api-client
frontend/packages/domain-types
frontend/packages/ui
frontend/packages/auth
```

Mevcut durumda tek web app içinde `src/lib/api.ts` ve lokal tipler var.

Etkisi:

- Mobil uygulama veya ikinci client eklendiğinde API/tip tekrarları oluşur.
- AI panelinin web ve mobilde paylaşılması zorlaşır.

Önerilen iş:

- Önce `api-client` ve `domain-types` çıkarılmalı.
- Sonra AI client ve role capability tipleri buraya taşınmalı.

### 7.4 Legacy demo ekranlar duruyor

Mevcut bulgu:

- `frontend/apps/web/src/role-dashboard/pages/TeacherDashboard.tsx` `demoStudents` kullanıyor.
- Ana akış `TeacherConsole` üzerinden gerçek API'ye bağlı, fakat legacy dosya yanlışlıkla route'a bağlanırsa demo veri görünür.

Gereken iş:

- Legacy dashboard kaldırılmalı veya gerçek API'ye taşınmalı.
- `demoStudents` sadece story/demo fixture olarak ayrılmalı.

---

## 8. P2 - Dokümantasyon Tutarsızlıkları

### 8.1 README güncel değil

`README.md`, API'nin ilk geliştirme aşamasında in-memory repository ile çalıştığını söylüyor. Kodda ise `main.go` PostgreSQL'e bağlanabiliyorsa tüm ana repository'leri PostgreSQL store'a geçiriyor; sadece bağlantı yoksa development ortamında memory fallback kullanıyor.

Gereken iş:

- README güncellenmeli.
- Production'da PostgreSQL bağlantısı başarısızsa uygulamanın çıktığı belirtilmeli.

### 8.2 `docs/14` bazı eski maddeleri hala eksik gösteriyor

Örnek:

- Rehberlik notları ve destek planları artık backend/frontend tarafında var.
- Ancak risk sinyalleri ve vaka dosyası hala eksik.

Gereken iş:

- `docs/14-web-mvp-durum-ve-gorevler.md` yeni analizle senkronize edilmeli.
- Özellikle security/scope bulguları ayrı P0 olarak eklenmeli.

### 8.3 OpenAPI veya gerçek endpoint envanteri yok

`docs/08-api-tasarimi.md` plan dokümanı olarak iyi, ancak koddan üretilmiş gerçek endpoint envanteri yok.

Gereken iş:

- `docs/api-endpoint-envanteri.md` oluşturulmalı veya OpenAPI üretimi eklenmeli.
- Handler kayıtları ile frontend `api.ts` çağrıları karşılaştırılmalı.
- Yetki ve audit bilgileri endpoint bazında işlenmeli.

---

## 9. P2 - Operasyon ve Production Hazırlığı

### 9.1 AI secret yönetimi netleşmeli

Mevcut durum:

- `platform_settings.ai_provider_key` var.
- `config.go` içinde OpenAI özel env alanı yok.

Öneri:

- Production için secret manager veya environment değişkeni ana kaynak olmalı.
- Admin paneldeki key saklama yolu encryption-at-rest olmadan kullanılmamalı.
- `ai_provider_key` değeri audit edilmeden okunmamalı.

### 9.2 Rate limit ve kullanım kotası yok

AI eklendiğinde maliyet ve kötüye kullanım riski oluşur.

Gereken iş:

- Kullanıcı başına dakika/saat limitleri.
- Tenant başına aylık AI kullanım limiti.
- Token kullanım kaydı.
- Tool call sayısı limiti.
- Uzun konuşmalar için özetleme.

### 9.3 Background job altyapısı yok

Şu an sistem modüler monolit içinde request-response ağırlıklı. AI özetleri, risk sinyali üretimi, bildirim gönderimi ve retention işleri için job altyapısı gerekecek.

Önce basit yaklaşım:

- Aynı Go binary içinde periyodik worker.
- Daha sonra queue.

İlk job adayları:

- AI transcript retention cleanup.
- Risk signal generation.
- Announcement notification fan-out.
- Attendance notification retry.

---

## 10. ogta.ai İçin Hazırlık Checklist'i

> **Durum:** Aşağıdaki maddelerin çoğu tamamlandı. Detay için [doc 17](./17-ogta-ai-durum-ve-eksikler.md).

AI geliştirmesine başlamadan önce:

- [ ] Observation endpoint'lerinde role/scope read/update/delete policy. *(hâlâ açık — P0)*
- [ ] Attendance summary endpoint'inde role/scope policy. *(hâlâ açık — P0)*
- [ ] Attendance day report endpoint'inde role/scope policy. *(hâlâ açık — P0)*
- [x] OpenAI config ve secret yönetimi kararı.
- [x] AI conversation/pending action migration tasarımı.
- [x] Öğretmen gözlem akışı için backend test fixtures.

İlk AI PR sırasında:

- [x] `backend/internal/domain/ai`.
- [x] `backend/internal/app/ai`.
- [x] `backend/internal/platform/openai`.
- [x] `handlers_ai.go`.
- [x] `OgtaAiDock`.
- [x] `search_students`, `draft_observation`, `create_observation` (rule-engine).
- [x] Pending action confirm/cancel.
- [x] Audit log.
- [x] Onaysız write reddi testi.

AI PR sonrasında:

- [x] Rehberlik notu ve destek planı action'ları.
- [x] Veli read-only Q&A.
- [x] Müdür dashboard Q&A.
- [x] Duyuru taslak/onay akışı.
- [x] Prompt injection ve role bypass testleri (integration).
- [ ] Playwright E2E.
- [ ] OpenAI tool loop / streaming.

---

## 11. Önerilen Yol Haritası

### Sprint 1 - Güvenlik sertleştirme

Hedef: AI tool'larının kullanacağı hassas endpoint'leri güvenli hale getirmek.

İşler:

- Observation policy.
- Attendance summary policy.
- Attendance day report policy.
- Bu endpoint'lere negatif integration test.

### Sprint 2 - ogta.ai çekirdek

Hedef: Öğretmen gözlem kaydı akışını uçtan uca çalıştırmak.

İşler:

- AI tabloları.
- OpenAI client.
- Tool registry.
- Pending action.
- Öğretmen `OgtaAiDock`.
- Gözlem oluşturma action'ı.

### Sprint 3 - Rehberlik AI

Hedef: Rehberlik notu ve destek planı işlemlerini AI ile onaylı hale getirmek.

İşler:

- Rehberlik notu action.
- Destek planı action.
- Gözlem özetleri.
- Hassas veri maskeleme.

### Sprint 4 - Müdür ve veli AI

Hedef: Read-only Q&A ve kontrollü yazma aksiyonları.

İşler:

- Müdür dashboard özetleri.
- Duyuru taslağı ve onayı.
- Veli program/devamsızlık soruları.
- Veli destek talebi.

### Sprint 5 - Test ve üretim hazırlığı

Hedef: Regresyon, maliyet ve güvenlik kontrolü.

İşler:

- Playwright smoke suite.
- Prompt injection testleri.
- AI usage metrics.
- Rate limit.
- Retention job.
- OpenAPI envanteri.

---

## 12. Sonuç

MVP'nin ana operasyon omurgası kurulmuş durumda. En büyük yeni ürün fırsatı `ogta.ai`; fakat bu modül hassas öğrenci verisi üzerinde çalışacağı için önce policy katmanı tamamlanmalı.

En doğru ilk adım, AI'ı büyük ve genel bir sohbet botu olarak eklemek değil; tek bir yüksek değerli ve kontrollü akışı uçtan uca kurmaktır:

> Öğretmen, konuşarak yetkili öğrencisini bulur, gözlem taslağı oluşturur, onaylar ve kayıt rehberlik paneline düşer.

Bu akış başarıyla tamamlandığında aynı altyapı rehberlik notu, destek planı, müdür duyurusu ve veli read-only sorularına genişletilebilir.
