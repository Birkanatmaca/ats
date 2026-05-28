# Sistem Detaylı Analiz ve Modül Önerileri

> Tarih: 2026-05-26  
> Kapsam: `docs/*.md` dokümanları, Go backend, PostgreSQL migrasyonları, React/Vite web uygulaması, test/build komutları ve kısa API smoke kontrolleri.  
> Amaç: Sistemde tamamlanan/tamamlanmayan işleri, modüllerin gerçek çalışma durumunu ve okul yönetim sistemine uygun yeni modül önerilerini tek bir güncel analizde toplamak.

---

## 1. Kısa Yönetici Özeti

Sistem, web MVP hedefinin önemli bir kısmını taşır durumda: Go backend modüler monolit olarak kurulmuş, PostgreSQL şeması MVP'nin ana tablolarını içeriyor, React web tarafında süper admin, müdür, öğretmen, veli ve rehberlik konsolları mevcut. `go test ./...` geçti, web production build geçti. Bu açıdan ürün artık yalnızca doküman aşamasında değil; çalışan bir web panel + API çekirdeği var.

Ancak "production-ready okul yönetim sistemi" seviyesine gelmeden önce çözülmesi gereken birkaç kritik konu var:

- Şifremi unuttum / şifre sıfırlama endpoint'leri route olarak var ama JWT middleware yüzünden anonim kullanıcıya kapalı. API smoke testte `POST /api/v1/auth/password/forgot` 401 döndü.
- Birçok kritik endpoint yalnızca "oturum var mı?" kontrolü yapıyor. Örneğin guardian kullanıcısı ile `POST /api/v1/schedules/generate` çağrısı 201 döndü. Bu, ders programı gibi yönetici işlemlerinde ciddi rol kontrolü açığıdır.
- Öğretmen gözlem ekranı öğrencileri `GET /api/v1/students` ile almaya çalışıyor; bu endpoint yalnızca okul yöneticilerine açık. API smoke testte öğretmen için 403 döndü. Bu nedenle öğretmen gözlem akışı frontend tarafında pratikte kırık/eksik.
- `user_scopes`, `announcement_audiences`, `guidance_cases`, `support_plans`, `risk_signals`, `device_tokens`, `attendance_notifications` tabloları dokümanda var ama migrasyonlarda yok.
- Testler geçiyor fakat kapsam ağırlıkla memory repository seviyesinde. PostgreSQL repository, handler/RBAC, frontend E2E ve gerçek tarayıcı akışları otomatik testle güvence altında değil.
- Login ekranında demo kullanıcı bilgileri ve şifreleri frontend kodunda görünüyor. Production build içinde bu görünür kalırsa güvenlik ve güven algısı açısından sorun oluşturur.

Genel değerlendirme:

| Alan | Durum | Yorum |
|---|---:|---|
| Ürün vizyonu ve MVP dokümantasyonu | Çok iyi | MVP hedefi, roller ve fazlar net. |
| Backend çekirdek API | İyi / kısmi | Ana servisler var; RBAC ve public auth akışları düzelmeli. |
| PostgreSQL şema | İyi / kısmi | Ana MVP tabloları var; scope, audience ve rehberlik faz tabloları eksik. |
| Web UI | İyi / kısmi | Tüm rol konsolları var; bazı ekranlar local/UI-only veya yanlış endpoint'e bağlı. |
| Güvenlik | Riskli | Tenant ID sorguları yaygın ama rol/kapsam guard eksikleri production blocker. |
| Test güvence seviyesi | Orta | Backend memory testleri ve build var; E2E/PostgreSQL/handler testleri eksik. |
| Mobil | Yok | Dokümanda strateji var, kodda mobil uygulama yok. |

Tahmini güncel durum:

```text
Dokümantasyon                 ~90%
Backend işlevsel çekirdek      ~75%
PostgreSQL şema                ~75%
Web rol konsolları             ~75%
Güvenlik / yetki doğruluğu     ~45%
Otomatik test güvencesi         ~40%
Mobil uygulama                  ~0%
Tam web MVP                    ~70-75%
Production-ready seviye         ~45-55%
```

---

## 2. Yapılan Doğrulamalar

| Kontrol | Sonuç | Not |
|---|---|---|
| `docs` altındaki Markdown belgeleri okundu | Başarılı | `00`-`14` arası dokümanlar incelendi. |
| `go test ./...` | Başarılı | Tüm Go paketleri derlendi; memory repository testleri geçti. |
| `npm run build` | Başarılı | TypeScript + Vite build geçti. Vite büyük chunk uyarısı verdi. |
| API smoke: `/healthz` | Başarılı | Memory fallback ile API ayağa kalktı. |
| API smoke: anonim `POST /api/v1/auth/password/forgot` | Başarısız | 401 döndü; bu endpoint public olmalı. |
| API smoke: guardian ile `POST /api/v1/schedules/generate` | Başarısız güvenlik | 201 döndü; guardian ders programı üretememeli. |
| API smoke: teacher ile `GET /api/v1/students` | Beklenen 403 ama UI açısından sorun | Endpoint öğretmene kapalı; TeacherConsole bu endpoint'e bağlı olduğu için gözlem öğrenci listesi dolmayabilir. |
| Docker/PostgreSQL local smoke | Çalıştırılamadı | Bu makinede `docker` komutu bulunamadı. |

Web build uyarısı:

- `assets/index-*.js` minified halde yaklaşık 925 KB çıktı.
- Şu an işlevsel bir hata değil, ama route/component bazlı code splitting eklenmeli.

---

## 3. Dokümantasyon Analizi

### Güçlü taraflar

`00-proje-vizyonu.md`, `01-mvp-kapsami.md`, `02-sistem-mimarisi.md`, `03-veri-modeli.md`, `04-yetkilendirme-guvenlik.md`, `05-ai-ders-programi.md`, `06-akilli-yoklama.md`, `07-ogrenci-destek-erken-uyari.md`, `08-api-tasarimi.md`, `09-frontend-mobil-mimarisi.md`, `10-roadmap-uygulama-plani.md`, `11-backlog-ve-future-moduller.md`, `12-teknik-kararlar.md` ve `13-mvp-epik-kabul-kriterleri.md` ürün yönünü iyi tarif ediyor.

Özellikle şu kararlar doğru:

- Modüler monolit ile başlamak doğru.
- AI ders programında hard constraint'leri LLM'e bırakmama kararı doğru.
- Öğrenci gözlem/rehberlik verilerini hassas veri olarak ele alma yaklaşımı doğru.
- MVP dışı özellikleri net ayırmak ürün odağını koruyor.
- Her fazda backend, migrasyon, API, yetki, frontend, test, audit sırasını şart koşmak iyi bir geliştirme disiplini.

### Güncellenmesi gereken taraflar

`14-web-mvp-durum-ve-gorevler.md` önceki entegrasyon dalgasından sonra çok faydalı bir durum raporu, ancak bugün yapılan kod doğrulamasıyla birkaç iddiası güncellenmeli:

- Şifre sıfırlama "tamamlandı" gibi işaretlenmiş; route ve UI var ama middleware public erişimi engellediği için uçtan uca çalışmıyor.
- Öğretmen gözlem akışı çalışıyor gibi görünüyor; backend create scope kontrolü var fakat frontend öğrenci listesini öğretmene kapalı endpoint'ten çekiyor.
- "Genel rol kontrolü" ifadesi olduğundan daha güçlü görünüyor. Kritik yönetici endpoint'lerinde `requirePrincipal` kullanımı sadece oturum kontrolü yaptığı için rol kontrolü eksik.
- "9/9 demo adımı çalışır" ifadesi otomatik E2E ile kanıtlanmış değil. Manuel demo çalışabilir, fakat security smoke testler bazı açıkları gösterdi.
- Demo sınırlamalarında "Excel toplu import frontend-only" ifadesi güncel değil; backend import endpoint'i var.

Eksik dokümantasyon:

- Gerçek endpoint envanteri / OpenAPI dosyası yok.
- Rol ve kapsam matrisi kod seviyesinde endpoint bazında yok.
- Test stratejisinin hangi kısmının gerçekten otomatikleştiği ayrı bir tabloyla izlenmiyor.
- Production güvenlik checklist'i yok.

---

## 4. Mimari ve Kod Yapısı

### Backend

Backend Go ile modüler monolit olarak tasarlanmış:

- `cmd/api/main.go`: uygulama başlangıcı, repository seçimi, servis wiring, middleware zinciri.
- `internal/app/*`: use-case servisleri.
- `internal/domain/*`: domain modelleri.
- `internal/http/handlers/*`: API handler'ları.
- `internal/http/middleware/*`: JWT, CORS, request logging, recoverer.
- `internal/repository/memory`: demo/test repository.
- `internal/repository/postgres`: PostgreSQL repository.
- `migrations`: SQL şeması ve demo seed verileri.

Olumlu:

- PostgreSQL yoksa development ortamında memory store'a düşüyor; geliştirme hızlı.
- Production ortamında PostgreSQL bağlantısı başarısızsa süreç çıkıyor; doğru yaklaşım.
- Tenant ID çoğu PostgreSQL sorgusunda kullanılıyor.
- Attendance, scheduling, guardian, dashboard gibi domainler ayrı servis/repo sınırlarına sahip.

Riskli:

- Handler seviyesinde rol kontrolü tutarlı değil.
- `requirePrincipal` adı yanıltıcı; aslında sadece authenticated principal kontrolü.
- JWT refresh/logout stateless; logout gerçek token iptali yapmıyor.
- Şifre hash stratejisi custom SHA-256. Production için Argon2id veya bcrypt gerekir.
- Default `JWT_SECRET` var ve production compose içinde zorunlu olarak set edilmiyor.

### Frontend

Frontend Vite + React:

- Süper admin konsolu.
- Müdür konsolu.
- Öğretmen konsolu.
- Veli konsolu.
- Rehberlik konsolu.
- Ortak `api.ts` client.
- CSS dosyaları role/page bazlı büyümüş durumda.

Olumlu:

- Role özel navigasyon ve sayfalar büyük ölçüde mevcut.
- Build geçiyor.
- API client 401 durumunda refresh denemesi yapıyor.
- Bildirim zili ortak bileşen haline getirilmiş.

Riskli:

- API client tek dosyada çok büyümüş.
- TanStack Query, RHF, Zod ve shared package yapısı dokümanda var ama kodda yok.
- Bazı ekranlar local state/localStorage ile çalışıyor.
- Login sayfasında demo hesaplar ve şifreler hardcoded.
- Frontend test altyapısı ve E2E yok.

### Veritabanı

`000001_initial_schema.sql` ana MVP tablolarını oluşturuyor:

- tenants, users, roles, permissions
- academic years, terms
- classes, students, guardians, teachers
- class_students, student_guardians
- subjects, teacher_subjects
- class_subject_requirements, teacher_availabilities
- schedules, schedule_lessons
- attendance_sessions, attendance_records
- announcements, notifications
- student_observations, audit_logs

Eksik veya planlanmış tablolar:

- `user_scopes`
- `announcement_audiences`
- `attendance_notifications`
- `device_tokens`
- `guidance_cases`
- `guidance_notes`
- `support_plans`
- `risk_signals`
- gerçek `sections` / `branches` modeli
- `schedule_generation_jobs`
- `schedule_change_logs`

---

## 5. Modül Bazlı Çalışma Durumu

### 5.1 Auth, oturum ve şifre yönetimi

| Özellik | Durum | Analiz |
|---|---|---|
| Login | Çalışıyor | Demo/memory ve PostgreSQL repo tarafında login mevcut. |
| JWT access token | Çalışıyor | Middleware token parse ediyor. |
| Refresh token | Kısmi | Endpoint var; token stateless. Revocation/rotation yok. |
| Logout | Kısmi / yanıltıcı | Endpoint var ama servis no-op. Token iptal edilmiyor. |
| İlk girişte şifre değiştirme | Çalışıyor görünüyor | UI ve endpoint var. |
| Şifremi unuttum | Kırık | Endpoint var ama public path listesinde değil; anonim kullanıcı 401 alıyor. |
| Şifre sıfırlama | Kırık | Aynı public erişim sorunu var. |
| Parola güvenliği | Production için yetersiz | Custom SHA-256 kullanılıyor. |
| Demo hesaplar | Development için iyi, production için risk | Login ekranında hardcoded şifreli demo butonları var. |

Kritik yapılacaklar:

- `/api/v1/auth/password/forgot` ve `/api/v1/auth/password/reset` public path listesine eklenmeli.
- Logout gerçek refresh token/session revocation yapmalı.
- Refresh token rotasyonu ve token store eklenmeli.
- Parola hash Argon2id veya bcrypt'e taşınmalı.
- Production build'de demo hesap butonları kapatılmalı.
- `JWT_SECRET` production'da zorunlu env olmalı; default secret ile production başlamamalı.

### 5.2 Tenant izolasyonu, rol ve kapsam yetkisi

| Özellik | Durum | Analiz |
|---|---|---|
| Tenant ID ile sorgu filtreleme | Büyük ölçüde var | PostgreSQL sorgularında yaygın şekilde `tenant_id` kullanılıyor. |
| Rol bazlı endpoint guard | Kısmi / riskli | Bazı endpoint'ler doğru guard kullanıyor, bazı kritik endpoint'ler sadece auth kontrolü yapıyor. |
| Kapsam bazlı erişim | Eksik | `user_scopes` tablosu/middleware yok. |
| Öğretmen öğrenci kapsamı | Kısmi | Create observation için backend kontrolü var; list/update/delete tarafında eksikler var. |
| Veli öğrenci kapsamı | İyi | Guardian endpoint'lerinde `student_guardians` ilişkisi kontrol ediliyor. |

Kritik bulgu:

- Guardian token ile `POST /api/v1/schedules/generate` 201 döndü. Ders programı üretme/yayınlama gibi işlemler yalnızca müdür/system admin/süper admin rolüne açık olmalı.

Role göre kesinleşmesi gereken endpoint örnekleri:

| Endpoint grubu | Doğru rol |
|---|---|
| Scheduling write: requirements, generate, lesson patch, publish | Principal, system_admin |
| Attendance create/update/finalize | İlgili öğretmen veya yetkili yönetici |
| Principal dashboard | Principal, system_admin, belki guidance için sınırlı özet |
| Observation list | Guidance, principal; öğretmene yalnız kendi kayıtları |
| Observation create | Teacher, guidance, principal; kapsam kontrolü şart |
| Observation update/delete | Author, guidance veya principal; audit şart |
| Student attendance summary | Principal/guidance veya ilişkili guardian; öğretmene kapsamlı |

### 5.3 Süper admin modülü

| Özellik | Durum | Analiz |
|---|---|---|
| Kurum listesi / detay | Çalışıyor görünüyor | API ve UI var. |
| Kurum oluşturma | Çalışıyor görünüyor | API ve UI var. |
| Kullanıcı oluşturma/güncelleme/pasifleştirme | Çalışıyor görünüyor | Süper admin endpoint'leri var. |
| Audit log görüntüleme | Çalışıyor görünüyor | `audit_logs` üzerinden listeleme var. |
| Platform ayarları | Çalışıyor görünüyor | Bakım modu ve credential ayarları var. |
| Destek talepleri | Çalışıyor görünüyor | `support_tickets` tablosu ve UI var. |
| Lisans/faturalama | Eksik | Plan metni var, gerçek lisans/paket/tahsilat yok. |

Not:

- Süper admin modülü MVP için güçlü bir başlangıç.
- Production tarafında hassas platform credential alanlarının saklama/şifreleme stratejisi ayrıca sertleştirilmeli.

### 5.4 Okul temel verileri

| Özellik | Durum | Analiz |
|---|---|---|
| Akademik yıl / dönem | API var | UI görünürlüğü sınırlı. |
| Sınıf CRUD | Kısmi | Create/list/update var; delete API yok. |
| Şube/section modeli | Eksik / UI-only | Frontend section oluşturuyor ama kalıcı gerçek tablo/API yok. |
| Öğrenci CRUD | Kısmi iyi | Create/list/update var; delete yerine status/passive kullanılıyor. |
| Öğrenci import | Var | Backend endpoint ve frontend modal var. |
| Öğretmen provision | Var | Kullanıcı + teacher kaydı oluşturuluyor. |
| Öğretmen güncelleme | Kısmi | Title güncelleniyor; silme/pasifleştirme okul panelinden yok. |
| Ders tanımları | Var | Subject list/create var. |
| Öğretmen-ders eşleştirme | Eksik endpoint | `teacher_subjects` tablo var ama yönetim endpoint'i yok. |
| Veli provision | Var | Kullanıcı + guardian + student_guardians bağlantısı kuruluyor. |
| Veli CRUD tam set | Eksik | Liste/güncelle/sil/scope yönetimi tam değil. |
| Arama/pagination | Kısmi | Frontend tarafında lokal arama var; backend liste endpoint'leri pagination standardına sahip değil. |

Önemli not:

- Sınıf/şube ayrımı okul sistemleri için kritik. Şu an `classes` tek tabloluk bir yapı; frontend ise `sections` bekliyor. Bu model netleşmeden öğrenci yerleştirme, sınıf raporu ve ders programı ileride zorlanır.

### 5.5 Ders programı modülü

| Özellik | Durum | Analiz |
|---|---|---|
| Ders ihtiyacı endpoint'i | Var | `class_subject_requirements` üzerinden çalışıyor. |
| Öğretmen müsaitlik endpoint'i | Var | `teacher_availabilities` üzerinden çalışıyor. |
| Generate draft | Var | Greedy solver ile draft oluşturuyor. |
| Validate | Var / kısmi | Çakışmaları hard conflict görüyor; haftalık saat eksikleri soft warning. |
| Publish | Var / riskli | Hard conflict yoksa yayınlıyor; haftalık saat eksikleri publish'i engellemiyor. |
| Manual lesson patch | Var | Draft üzerinde PATCH var. |
| Audit | Kısmi | Publish audit yazıyor. |
| UI builder | Var / kısmi | API generate/publish kullanıyor; bazı taslaklar localStorage ile destekleniyor. |

Kritik riskler:

- Scheduling write endpoint'lerinde rol guard eksik.
- Haftalık ders ihtiyacı dokümana göre hard constraint olmalı; kodda eksik ders saatleri soft warning olarak kalıyor. Bu, eksik programın yayınlanmasına izin verebilir.
- Öğretmen-ders eşleştirme endpoint'i yok; sistem bazı default/fallback eşleştirmeler oluşturuyor. Bu MVP için pratik ama yönetimsel doğruluk için yeterli değil.
- Derslik/oda, öğle arası, blok ders, kısmi kilitleme ve alternatif programlar yok.

### 5.6 Öğretmen takvimi ve akıllı yoklama

| Özellik | Durum | Analiz |
|---|---|---|
| Öğretmen takvimi | Var | Published schedule içinden öğretmen dersleri geliyor. |
| Aktif ders bulma | Var | 10 dk tolerans penceresi uygulanıyor. |
| Yoklama oturumu | Var | Lesson ID ile session oluşturuluyor/getiriliyor. |
| Öğrenci kayıtları | Var | Sınıf öğrencileri attendance_records olarak açılıyor. |
| Güncelleme | Var | Status ve not güncelleniyor. |
| Finalize | Var | Finalize sonrası update kilitleniyor. |
| Veli bildirimi | Kısmi | Absence/late için in-app notification oluşuyor. |
| Öğretmen ownership kontrolü | Eksik | Lesson ID bilen başka auth kullanıcı da işlem yapabilir. |
| Offline yoklama | Yok | MVP dışı olarak kabul edilebilir. |

Kritik güvenlik notu:

- `POST /api/v1/attendance/sessions`, `PATCH /records`, `POST /finalize` sadece auth kontrolü yapıyor. En azından lesson'ın öğretmeni veya yetkili yönetici kontrolü olmalı.

### 5.7 Veli bilgilendirme

| Özellik | Durum | Analiz |
|---|---|---|
| Veli çocuk listesi | Çalışıyor | `student_guardians` ilişkisine bakıyor. |
| Veli ders programı | Çalışıyor | Yalnız ilişkili öğrencinin sınıf programını döndürüyor. |
| Veli devamsızlık | Çalışıyor | Finalize edilmiş attendance kayıtlarından geliyor. |
| Duyuru görüntüleme | Kısmi | `audience IN ('guardians','all')` string filtreyle çalışıyor. |
| Bildirim okundu | Çalışıyor | `notifications.read_at` güncelleniyor. |
| Push notification | Yok | Sadece uygulama içi notification var. |
| Veli CRUD/scope yönetimi | Kısmi | Provision var; tam yönetim ekranı yok. |

Genel olarak veli modülü MVP için en sağlam görünen alanlardan biri. Ancak duyuru hedefleme string yerine ilişki tablosuna geçmeli.

### 5.8 Müdür dashboard ve operasyon

| Özellik | Durum | Analiz |
|---|---|---|
| KPI metrikleri | Var | Öğrenci, öğretmen, sınıf, ders, devamsızlık sorguları gerçek veriden. |
| Yoklama tamamlanma oranı | Var | Published schedule + finalized session karşılaştırması yapılıyor. |
| Operasyon uyarıları | Var | Program yok / yoklama bekliyor gibi satırlar üretiliyor. |
| Sınıf özet endpoint'i | Var | Class summary endpoint'i mevcut. |
| Rol guard | Eksik | Principal summary endpoint'i tüm authenticated roller tarafından çağrılabiliyor. |

Yorum:

- Dashboard fonksiyonel olarak iyi bir başlangıç.
- Yetki doğru sınırlanırsa MVP değerini hızlı gösteren modüllerden biri olur.

### 5.9 Öğrenci gözlemleri ve rehberlik

| Özellik | Durum | Analiz |
|---|---|---|
| Observation create | Kısmi | Backend var; teacher için scope kontrolü var. |
| Observation list | Var / riskli | Tüm authenticated roller listeleyebilir. |
| Observation get/update/delete | Var / riskli | Rol/kapsam/author kontrolü eksik. |
| Guidance list audit | Kısmi | Guidance list görüntülemede audit yazılıyor. |
| Teacher frontend observation | Kırık/kısmi | Öğrenci listesini öğretmene kapalı endpoint'ten çekiyor. |
| Risk sinyalleri | Frontend-only | Rehberlik riskleri observation listesinden browser'da türetiliyor. |
| Takip planları | Placeholder | `GuidancePlansPage` Faz 2 placeholder. |
| Guidance cases / notes / support plans | Yok | Tablo ve API yok. |

Kritik yapılacaklar:

- Öğretmene özel roster endpoint'i eklenmeli: `GET /api/v1/teachers/me/students` veya `GET /api/v1/teachers/me/roster`.
- Observation list/get/update/delete endpoint'leri rol ve kapsam kurallarına bağlanmalı.
- Rehberlik görüntüleme audit'i sadece list değil, detay görüntülemeyi de kapsamalı.
- Guidance cases, notes ve support plans ayrı hassaslık seviyesinde tasarlanmalı.

### 5.10 Duyuru ve bildirim

| Özellik | Durum | Analiz |
|---|---|---|
| Duyuru listesi | Var | Tenant bazlı yayınlanmış duyuruları döndürüyor. |
| Duyuru oluşturma/güncelleme | Var | Müdür/system/süper admin guard kullanıyor. |
| Audience seçimi | Kısmi | String alan olarak tutuluyor. |
| Announcement audience tablosu | Yok | Rol/sınıf/kullanıcı hedefleme gerçek model değil. |
| Kullanıcı bildirimi | Var | `notifications` tablosu var. |
| Duyurudan notification üretme | Kısmi/yok | Attendance finalize bildirim üretiyor; duyuru notification üretimi net değil. |
| Push/device token | Yok | `device_tokens` tablosu yok. |

Öneri:

- `announcement_audiences` tablosu ve audience resolver eklenmeli.
- Duyuru yayınlandığında hedef kullanıcılar için notification kayıtları üretilmeli.
- SMS/e-posta/push provider entegrasyonu daha sonra job queue ile eklenmeli.

### 5.11 Destek ve bakım modu

| Özellik | Durum | Analiz |
|---|---|---|
| Destek talebi oluşturma | Var | Kullanıcı destek formu ve backend endpoint var. |
| Süper admin destek yönetimi | Var | Ticket liste/güncelleme ekranı var. |
| Bakım modu | Var | System status ve admin ayarı var. |
| Bakım modunda super admin bypass | Var | App route seviyesinde düşünülmüş. |

Bu alan MVP için iyi durumda.

### 5.12 Mobil uygulama

| Özellik | Durum | Analiz |
|---|---|---|
| Mobil mimari dokümanı | Var | React Native/Expo önerilmiş. |
| Mobil app kodu | Yok | `frontend/apps/mobile` bulunmuyor. |
| Öğretmen mobil akışı | Web ile temsil ediliyor | TeacherConsole var ama mobil native/PWA değil. |
| Veli mobil akışı | Web ile temsil ediliyor | GuardianConsole var ama native/PWA değil. |

MVP şu an "web MVP" olarak düşünülmeli. Mobil ayrıca fazlandırılmalı.

---

## 6. MVP Kabul Kriterleri Güncel Durum

| Kabul kriteri | Durum | Not |
|---|---|---|
| Bir kurumun verileri başka kurum tarafından görülemez | Kısmi | Tenant ID sorguları var; ancak rol/kapsam guard eksikleri var. |
| Yönetici ders programını üretip yayınlayabilir | Kısmi çalışıyor | API/UI var; fakat yetkisiz roller de generate edebiliyor. |
| Yayınlanan program öğretmen takvimine yansır | Çalışıyor | Published schedule üzerinden teacher calendar var. |
| Öğretmen aktif ders için sınıf seçmeden yoklama alabilir | Kısmi çalışıyor | Active lesson var; ownership kontrolü eksik. |
| Yoklama sonucu öğrenci devamsızlık kayıtlarına işlenir | Çalışıyor | Attendance records + summary var. |
| Veli yalnızca kendi çocuğunun verisini görür | Büyük ölçüde çalışıyor | Guardian endpoint'lerinde scope iyi. |
| Öğretmen yalnızca yetkili olduğu öğrenciler için gözlem girer | Backend kısmi, UI sorunlu | Create için teacher scope var; UI öğrenci listesi 403 alıyor. |
| Müdür temel operasyon dashboard'unu görebilir | Çalışıyor | Metrikler gerçek veriden; endpoint rol guard eksik. |

---

## 7. En Önemli Eksikler ve Riskler

### P0 - Production blocker

1. Public olması gereken auth endpoint'leri kapalı:
   - `/api/v1/auth/password/forgot`
   - `/api/v1/auth/password/reset`

2. Kritik endpoint'lerde rol guard eksik:
   - scheduling write endpoint'leri
   - attendance write/finalize endpoint'leri
   - observation list/get/update/delete endpoint'leri
   - dashboard principal summary

3. Öğretmen gözlem frontend akışı kırık:
   - TeacherConsole `api.listStudents()` çağırıyor.
   - `GET /api/v1/students` öğretmene 403 dönüyor.

4. Production güvenlik sertleştirmesi eksik:
   - default JWT secret
   - demo hesaplar frontend kodunda
   - SHA-256 parola hash
   - logout no-op

5. `user_scopes` yok:
   - Dokümanın minimum yetki yaklaşımı tam uygulanamıyor.

### P1 - MVP tamamlanma kalitesi

1. Backend pagination/search yok veya standart değil.
2. Teacher-subject eşleştirme yönetimi yok.
3. Gerçek section/branch modeli yok.
4. Announcement audience modeli string alanla sınırlı.
5. PostgreSQL repository ve handler seviyesinde integration test yok.
6. E2E smoke test yok.
7. OpenAPI/endpoint envanteri yok.
8. Frontend form validasyonları Zod/RHF ile standardize değil.

### P2 - Sonraki faz / teknik borç

1. API client shared package haline taşınmalı.
2. TanStack Query ile server state yönetimi kurulmalı.
3. Role console kodları ve CSS modülerleştirilmeli.
4. Vite code splitting eklenmeli.
5. Mobil uygulama veya PWA stratejisi netleşmeli.
6. Job queue ve notification provider altyapısı eklenmeli.

---

## 8. Önerilen Düzeltme Yol Haritası

### Sprint 1 - Güvenlik ve kırık akış düzeltmeleri

Hedef: Uçtan uca MVP akışlarını doğru yetkiyle çalışır hale getirmek.

- Auth middleware public path listesine forgot/reset endpoint'lerini ekle.
- Endpoint bazlı rol matrisi çıkar ve handler guard'larını güncelle.
- Attendance endpoint'lerinde lesson teacher ownership kontrolü ekle.
- Scheduling write endpoint'lerini principal/system_admin/super_admin ile sınırla.
- Observation list/get/update/delete endpoint'lerine rol + author + kapsam kontrolü ekle.
- `GET /api/v1/teachers/me/students` endpoint'i ekle ve TeacherConsole'u buna bağla.
- Login demo hesaplarını sadece development env'de göster.
- Production'da `JWT_SECRET` zorunlu olsun.

### Sprint 2 - Veri modeli eksiklerini kapatma

Hedef: Doküman veri modeliyle kodu yaklaştırmak.

- `user_scopes` tablosu + middleware.
- `announcement_audiences` tablosu.
- Gerçek `sections` veya `class_sections` tablosu.
- Teacher-subject CRUD endpoint'leri.
- Veli yönetimi list/update/delete.
- Pagination/search helper standardı.

### Sprint 3 - Test ve gözlemlenebilirlik

Hedef: Her demo adımının otomatik doğrulanması.

- Handler/RBAC testleri.
- PostgreSQL repository integration testleri.
- Playwright web smoke:
  - süper admin kurum oluşturur
  - müdür öğrenci/öğretmen/sınıf oluşturur
  - program üretir/yayınlar
  - öğretmen yoklama alır
  - veli devamsızlık görür
  - rehberlik gözlem listeler
- CI'ya frontend build yanında E2E job ekle.
- OpenAPI endpoint envanteri üret.

### Sprint 4 - Ürünleşme

Hedef: MVP'yi okulda kullanılabilir ürüne yaklaştırmak.

- Rehberlik vaka ve takip planı.
- Duyuru hedefleme ve bildirim üretimi.
- Yoklama raporları ve export.
- Veli/öğretmen mobil veya PWA.
- Kurum bazlı ayarlar: ders saatleri, tolerans penceresi, tatil günleri.

---

## 9. Okul Yönetim Sistemi İçin Önerilen Yeni Modüller

Aşağıdaki modüller sistemin amacına uygun, okul yönetimlerinde gerçekten ihtiyaç doğuran alanlardır. Önceliklendirme MVP sonrası ürünleşme sırasına göre verilmiştir.

### 9.1 Kayıt Kabul ve Aday Öğrenci CRM

Öncelik: Yüksek  
Paket: Growth / Premium

İhtiyaç:

- Özel okullarda aday öğrenci, veli görüşmesi, tanıtım randevusu, sınav/deneme sonucu ve kayıt dönüşüm takibi önemlidir.

Özellikler:

- Aday öğrenci kartı.
- Veli iletişim geçmişi.
- Görüşme/randevu takvimi.
- Başvuru durumu pipeline'ı.
- Kayıt kabul evrak listesi.
- Kayıt dönüşüm raporu.

### 9.2 Ölçme Değerlendirme ve Not/Karne Modülü

Öncelik: Yüksek  
Paket: Core / Growth

İhtiyaç:

- Okul yönetim sisteminde devamsızlık ve ders programından sonra en kritik alan akademik ölçmedir.

Özellikler:

- Sınav tanımı.
- Not giriş ekranı.
- Kazanım/konu bazlı analiz.
- Sınıf/öğrenci başarı grafikleri.
- Veli akademik raporu.
- Karne/ara rapor çıktısı.

### 9.3 Gelişmiş Rehberlik ve Öğrenci Destek Dosyası

Öncelik: Yüksek  
Paket: Premium

İhtiyaç:

- Dokümandaki erken uyarı yaklaşımının gerçek okul değerine dönüşmesi için vaka takibi gerekir.

Özellikler:

- Rehberlik vaka dosyası.
- Görüşme notları.
- Veli görüşmesi kayıtları.
- Takip planı.
- Müdahale aksiyonları.
- Gizlilik seviyesi.
- Risk sinyali değerlendirme.
- Haftalık rehberlik raporu.

### 9.4 Veli İletişim Merkezi

Öncelik: Yüksek  
Paket: Growth

İhtiyaç:

- Duyuru tek başına yeterli olmaz; okul-veli iletişimi kontrollü ve kayıtlı yürümeli.

Özellikler:

- SMS/e-posta/push şablonları.
- Hedef kitle seçimi.
- Gönderim durumu.
- Okundu bilgisi.
- İzin/onay formları.
- Veli geri dönüş formları.
- İletişim logları.

### 9.5 Tahsilat ve Finans Takibi

Öncelik: Yüksek  
Paket: Premium

İhtiyaç:

- Özel okul, kurs ve etüt merkezlerinde ödeme planı ve gecikme takibi temel ticari ihtiyaçtır.

Özellikler:

- Öğrenci ödeme planı.
- Taksit takibi.
- Gecikme bildirimi.
- Tahsilat makbuzu.
- İndirim/burs oranı.
- Veli finans ekranı.
- Finans raporları.

### 9.6 Servis ve Ulaşım Modülü

Öncelik: Orta / Yüksek  
Paket: Premium

İhtiyaç:

- Özellikle okul ve kolejlerde servis operasyonu günlük kritik süreçtir.

Özellikler:

- Servis aracı ve şoför tanımı.
- Rota tanımı.
- Öğrenci servis ataması.
- Sabah/akşam biniş iniş listesi.
- Veliye servis bildirimi.
- Gecikme/rota değişikliği duyurusu.

### 9.7 Yemek, Alerjen ve Sağlık/Revir Modülü

Öncelik: Orta  
Paket: Growth / Premium

İhtiyaç:

- Kreş, kolej ve özel okullarda yemek listesi, alerji ve sağlık notları önemli operasyonel bilgidir.

Özellikler:

- Haftalık yemek menüsü.
- Alerjen bilgisi.
- Öğrenci alerji/ilaç notları.
- Revir ziyaret kaydı.
- Veli bilgilendirmesi.
- Acil durum kişi bilgileri.

### 9.8 Etüt, Kulüp ve Ek Ders Planlama

Öncelik: Orta  
Paket: Growth

İhtiyaç:

- Kurs, etüt merkezi ve kolejlerde normal ders programı dışında etüt/kulüp operasyonları vardır.

Özellikler:

- Etüt/kulüp tanımı.
- Öğrenci kayıt listesi.
- Öğretmen ataması.
- Yoklama.
- Veli bilgilendirme.
- Kapasite takibi.

### 9.9 Personel, Nöbet ve İzin Yönetimi

Öncelik: Orta  
Paket: Growth

İhtiyaç:

- Öğretmen devamsızlığı, nöbet, yerine ders girme gibi operasyonlar müdürün günlük işidir.

Özellikler:

- Personel profili.
- Nöbet çizelgesi.
- İzin talebi.
- Vekil öğretmen atama.
- Ders değişikliği bildirimi.
- Personel raporu.

### 9.10 Derslik, Kaynak ve Envanter Yönetimi

Öncelik: Orta  
Paket: Growth

İhtiyaç:

- Ders programı büyüdükçe oda/derslik/lab kaynakları çakışmaya başlar.

Özellikler:

- Derslik/lab tanımı.
- Kapasite ve uygunluk.
- Programda oda atama.
- Kaynak rezervasyonu.
- Envanter zimmet takibi.

### 9.11 Evrak, Onay ve Dijital Formlar

Öncelik: Orta  
Paket: Growth

İhtiyaç:

- Okullar izin formu, gezi onayı, kayıt evrakı ve veli muvafakatleriyle çalışır.

Özellikler:

- Form şablonu.
- Veli onayı.
- Belge yükleme.
- Eksik evrak takibi.
- Sınıf/öğrenci bazlı form gönderimi.
- Onay raporu.

### 9.12 Raporlama ve Yönetim BI

Öncelik: Yüksek  
Paket: Premium

İhtiyaç:

- Kurum sahipleri ve yöneticiler tek okul ya da çoklu kampüs için karar destek raporları ister.

Özellikler:

- Devamsızlık trendleri.
- Öğretmen kullanım raporu.
- Sınıf doluluk oranı.
- Akademik başarı trendi.
- Tahsilat durumu.
- Rehberlik risk dağılımı.
- Haftalık yönetici özeti.

### 9.13 Çoklu Kampüs ve Kurum Grupları

Öncelik: Orta / yüksek büyüme fazı  
Paket: Premium

İhtiyaç:

- Kolej zincirleri ve kurum grupları kampüs bazlı yönetim ister.

Özellikler:

- Kampüs/şube modeli.
- Kampüs bazlı yetki.
- Merkezi raporlama.
- Kampüsler arası öğretmen/öğrenci transferi.
- Paket/lisans yönetimi.

---

## 10. Öncelikli Yeni Modül Sıralaması

Ürünün bugünkü durumuna göre en mantıklı sıra:

1. Yetki ve kapsam altyapısı modülü (`user_scopes`, endpoint matrix, audit).
2. Öğretmen roster ve gerçek sınıf/şube modeli.
3. Duyuru hedefleme ve bildirim merkezi.
4. Rehberlik vaka/takip planı.
5. Ölçme değerlendirme ve veli akademik raporu.
6. Tahsilat.
7. Servis.
8. Yemek/sağlık.
9. Etüt/kulüp.
10. Raporlama/BI.

Bu sırada ilk iki madde "yeni özellik" gibi görünse de aslında temel ürün omurgasıdır. Bunlar çözülmeden premium modüller eklendiğinde yetki ve veri modeli borcu büyür.

---

## 11. Sonuç

Bu proje iyi bir ürün iskeletine sahip. Dokümanlar ürün yönünü doğru tarif ediyor; kod tabanı da MVP'nin ana kaslarını oluşturmuş. En güçlü alanlar süper admin, veli API, yoklama persistence/finalize, dashboard metrikleri ve ders programı çekirdeği. En zayıf alanlar rol/kapsam yetkilendirme, public auth akışları, öğretmen gözlem frontend entegrasyonu, gerçek şube modeli ve otomatik E2E test güvencesi.

Kısa vadede yeni büyük modül eklemek yerine önce güvenlik ve kapsam doğruluğunu toparlamak gerekir. Bu toparlandıktan sonra rehberlik vaka yönetimi, ölçme değerlendirme, veli iletişim merkezi ve tahsilat modülleri ürünü gerçek okul yönetim sistemi seviyesine taşır.

