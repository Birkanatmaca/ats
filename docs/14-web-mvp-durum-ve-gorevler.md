# Web MVP Durum Analizi ve Görev Listesi

> **Hedef:** Web panel (müdür, rehberlik, öğretmen, veli, süper admin) + Go API + PostgreSQL ile dokümantasyondaki MVP akışlarının **uçtan uca çalışır** olması.  
> **Kapsam:** Bu dosya yalnızca **web** tarafını kapsar. Mobil uygulama ayrı fazdadır.  
> **Referans:** `docs/00`–`docs/13` doküman seti ve mevcut kod tabanı (Mayıs 2026).

---

## Özet: Hedefe Ne Kadar Yakınız?

| Katman | Tamamlanma (tahmini) | Durum |
|--------|----------------------|-------|
| Ürün / mimari dokümantasyon | **~95%** | Planlama olgun; bu dosya kod ile senkron tutuluyor |
| Backend API (MVP endpoint'leri) | **~78%** | Auth, okul CRUD, scheduling, yoklama, veli, gözlem, duyuru — büyük ölçüde uygulandı |
| PostgreSQL şema / migrasyon | **~85%** | MVP tabloları var; `user_scopes` henüz kullanılmıyor |
| Web UI ekranları (görsel) | **~80%** | Tüm rol konsolları ve sayfalar mevcut |
| Auth / güvenlik (production-ready) | **~78%** | JWT + refresh; şifre sıfırlama eklendi; user_scopes hâlâ yok |
| Web uçtan uca (API ↔ UI gerçek veri) | **~82%** | Ana akışlar API'ye bağlı; FE mimari refactor (I) bekliyor |

### Genel mesafe

```
Dokümantasyon ████████████████████░  95%
DB Şema       █████████████████░░░░  85%
Web UI Shell  ████████████████░░░░  80%
Backend API   ███████████████░░░░░  78%
Web E2E       ██████████████░░░░░░  72%
Auth/Güvenlik █████████████░░░░░░░  65%
─────────────────────────────────────────
Tam çalışır web MVP hedefi          ~82%
```

**Yorum:** Büyük entegrasyon dalgası tamamlandı (Mayıs 2026). **JWT oturumu**, **müdür okul CRUD**, **ders programı üret/yayınla**, **yoklama PG + finalize + bildirim**, **veli API**, **gözlem CRUD** ve **duyuru oluşturma** artık kodda. Kalan mesafe: **şifre sıfırlama**, **Excel import**, **kapsam middleware**, **global bildirim merkezi**, **FE mimari refactor** (TanStack Query / monorepo paketleri) ve **E2E testler**.

---

## Dokümantasyon Durumu

### Tam / yeterli

| Dosya | Durum |
|-------|-------|
| `00-proje-vizyonu.md` | Tam — ürün yönü net |
| `01-mvp-kapsami.md` | Tam — MVP modül listesi net |
| `02-sistem-mimarisi.md` | Tam — katman yapısı kodla uyumlu |
| `03-veri-modeli.md` | Tam — şema büyük ölçüde migrate edilmiş |
| `04-yetkilendirme-guvenlik.md` | Tam — kod kısmen uyguluyor (JWT, rol guard) |
| `05-ai-ders-programi.md` | Tam — greedy MVP solver uygulandı |
| `06-akilli-yoklama.md` | Tam — attendance PG + finalize + bildirim |
| `07-ogrenci-destek-erken-uyari.md` | Tam — rehberlik faz 2 |
| `08-api-tasarimi.md` | Kısmi — ~45 endpoint uygulandı (~55 planlı) |
| `09-frontend-mobil-mimarisi.md` | Tam — web kısmı referans; monorepo paketleri henüz yok |
| `10-roadmap-uygulama-plani.md` | Tam — faz sırası geçerli |
| `11-backlog-ve-future-moduller.md` | Tam |
| `12-teknik-kararlar.md` | Tam |
| `13-mvp-epik-kabul-kriterleri.md` | Tam — issue'lara bölünebilir |

### Eksik / güncellenmesi gereken

- [x] Kod–doküman fark listesi (bu dosya)
- [ ] Gerçek API endpoint envanteri (OpenAPI / otomatik üretim)
- [x] Web-only MVP kabul checklist'i (aşağıdaki task'lar + demo senaryo)
- [ ] Test stratejisi uygulama durumu (memory unit test + CI; integration/E2E eksik)

---

## Mevcut Kod: Ne Çalışıyor, Ne Çalışmıyor?

### Backend — çalışan

- [x] Go API iskeleti, middleware zinciri, health check
- [x] PostgreSQL bağlantısı + migrasyonlar (000001–000006)
- [x] Login (email/şifre) + ilk giriş şifre değiştirme
- [x] **JWT access + refresh token** (`internal/platform/auth`, `middleware.JWTAuth`)
- [x] `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`
- [x] Süper admin: kurum, kullanıcı, ayar, destek, audit log
- [x] Tenant okuma, duyuru listeleme + **oluşturma/düzenleme** (müdür rolleri)
- [x] **Okul CRUD:** akademik yıl, dönem, sınıf, öğrenci, öğretmen, ders, sınıf-öğrenci atama
- [x] **Ders programı:** requirements, availabilities, generate (greedy → DB taslak), validate, publish, lesson PATCH
- [x] Yayınlanmış ders programı okuma, öğretmen takvimi, aktif ders bulma
- [x] **Veli API:** `/api/v1/guardian/*` (6 endpoint, scope kontrolü)
- [x] Gözlem listeleme + **PostgreSQL create** + GET/PATCH/DELETE `{id}`
- [x] Müdür dashboard özeti (**gerçek yoklama tamamlanma %** — hardcoded 72 kaldırıldı)
- [x] `GET /api/v1/dashboard/attendance/today`, `GET /api/v1/dashboard/classes/{classId}/summary`
- [x] Yoklama oturumu oluşturma, okuma, güncelleme, **kesinleştirme** (PostgreSQL)
- [x] `GET /api/v1/students/{id}/attendance-summary`
- [x] Yoklama güncelleme/finalize **operational audit log** (`writeOperationalAudit`)
- [x] Devamsızlık bildirim olayı: finalize sonrası `notifications` tablosu (idempotent)
- [x] Öğretmen takviminde `TeacherID` = `users.id` eşleşmesi
- [x] Handler seviyesinde rol kontrolü (`requirePrincipalRole`, guardian scope)

### Backend — eksik / kısmi

- [ ] Şifremi unuttum / sıfırla: `password/forgot`, `password/reset`
- [ ] Kapsam bazlı erişim (`user_scopes` tablosu + middleware)
- [ ] Tüm hassas işlemlerde otomatik audit middleware (yalnızca yoklama finalize/update yazıyor)
- [ ] Öğretmen-ders eşleştirme ayrı endpoint (B1.6)
- [ ] Veli kaydı + öğrenci-veli ilişkisi CRUD endpoint'i (B1.8 — seed'de var, API yok)
- [ ] Liste endpoint'lerinde arama + pagination (B1.9)
- [ ] Toplu öğrenci import API — Excel backend parse (B1.10)
- [ ] Ders programı yayınlama audit log (C1.8)
- [ ] Öğretmen gözlem kapsam kontrolü — yalnızca kendi öğrencileri (G1.3)
- [ ] Rehberlik görüntüleme audit log (G1.4)
- [ ] Gözlem listesi filtre query params (G3.1)
- [ ] `announcement_audiences` hedef kitle tablosu (H1.2 — şu an basit `audience` string)

### Web frontend — çalışan (uçtan uca)

- [x] Login, bakım modu, ilk giriş şifre değişimi
- [x] **JWT oturumu:** Bearer token, 401'de otomatik refresh (`api.ts`)
- [x] Süper admin konsolu (kurum, kullanıcı, ayar, destek, log)
- [x] **Müdür:** sınıf/öğrenci CRUD → API (`PrincipalConsole.tsx`, localStorage kaldırıldı)
- [x] **Müdür:** ders programı generate + publish → backend API (`PrincipalSchedulePage.tsx`)
- [x] **Müdür:** duyuru oluşturma formu (`PrincipalAnnouncementsPage.tsx`)
- [x] **Müdür:** yoklama raporu → `api.attendanceToday`
- [x] **Öğretmen:** yoklama kaydet + kesinleştir, öğrenci listesi API'den
- [x] **Öğretmen:** "Hepsi geldi", kaydedilmemiş çıkış uyarısı (`beforeunload`)
- [x] **Öğretmen:** gözlem oluştur + öğrenci listesi API roster'dan
- [x] **Veli:** çocuk seçici, program, devamsızlık, duyuru, bildirim + okundu (`GuardianConsole.tsx`)
- [x] Tüm roller: duyuru listesi (read), destek talebi oluşturma
- [x] Müdür/rehberlik/öğretmen: dashboard özeti, program okuma (published)
- [x] Rehberlik: `GuidancePlansPage` → "Faz 2" placeholder

### Web frontend — eksik / kısmi

- [ ] `PrincipalSchedulePage` — localStorage yedek/cache hâlâ var (offline taslak)
- [ ] `PrincipalTeachersPage` — öğretmen ekleme tam API entegrasyonu eksik olabilir
- [ ] `StudentImportModal` → backend import endpoint yok
- [ ] `PrincipalOperationsPage` — liste var, tıklanabilir aksiyon yok (F2.2)
- [ ] Program eksik / veri tutarsızlığı uyarı banner'ları (F2.3)
- [ ] Duyuru hedef kitle seçici — gelişmiş UI (sınıf/rol bazlı) (H2.2)
- [ ] Tüm rollerde ortak bildirim merkezi bileşeni (H2.3)
- [ ] `TeacherDashboard.tsx` (legacy) — hâlâ `demoStudents` kullanıyor; ana akış `TeacherConsole`
- [ ] TanStack Query, shared packages, RHF/Zod — dokümanda var, kodda yok
- [ ] Öğrenci devamsızlık özeti UI — API hazır, ekran bağlantısı yok

---

## Web MVP Görev Listesi (Parça Parça)

Her task bağımsız issue / PR olarak alınabilir. Sıra önerilir; paralel çalışılabilir bloklar `[P]` ile işaretlidir.

---

### Faz A — Altyapı ve Güvenlik Temeli

> **Amaç:** Demo ortamından production-ready auth ve tenant izolasyonuna geçiş.  
> **Epic referansı:** Epic 1 (`13-mvp-epik-kabul-kriterleri.md`)  
> **Durum:** ~70% tamamlandı

#### A1. Kimlik doğrulama

- [x] **A1.1** JWT access token üretimi ve doğrulama (`internal/platform/auth/jwt.go`)
- [x] **A1.2** Refresh token endpoint: `POST /api/v1/auth/refresh`
- [x] **A1.3** Logout endpoint: `POST /api/v1/auth/logout`
- [x] **A1.4** Şifremi unuttum / sıfırla: `password/forgot`, `password/reset` (+ `/forgot-password`, `/reset-password` sayfaları)
- [x] **A1.5** `DemoAuth` kaldırıldı; `JWTAuth` middleware aktif (`main.go`)
- [x] **A1.6** Web `api.ts`: refresh akışı, oturum yenileme, Bearer-only auth

#### A2. Yetkilendirme

- [x] **A2.1** Rol bazlı route guard (backend handler seviyesi — `requirePrincipalRole`, guardian scope)
- [x] **A2.2** Tenant scope zorunluluğu — tüm PG sorgularında `tenant_id`
- [ ] **A2.3** Kapsam bazlı erişim (`user_scopes` tablosu + middleware) — MVP minimum: sınıf/öğrenci
- [ ] **A2.4** Hassas endpoint'lerde audit log middleware (yoklama finalize/update hariç genel middleware yok)
- [ ] **A2.5** Web: rol bazlı route koruması (403 yönlendirme — kısmi)

#### A3. Gözlemlenebilirlik

- [x] **A3.1** Standart hata kodları (`httpx.WriteError` — docs/08 formatına uyumlu)
- [ ] **A3.2** Pagination helper (liste endpoint'leri için)
- [x] **A3.3** `[P]` CI: `go test ./...` + `npm run build` (`.github/workflows/ci.yml`)

**Faz A tamamlanma kriteri:** Başka tenant verisine erişim imkânsız ✓ · token süresi dolunca refresh çalışır ✓ · rolü olmayan kullanıcı korumalı endpoint'e giremez ✓ (kısmi) · şifre sıfırlama ✗

---

### Faz B — Okul Temel Verileri (Müdür CRUD)

> **Amaç:** Müdürün girdiği veriler PostgreSQL'de kalıcı olsun; localStorage kaldırılsın.  
> **Epic referansı:** Epic 2  
> **Durum:** ~75% tamamlandı

#### B1. Backend API

- [x] **B1.1** `GET/POST /api/v1/academic-years`, `GET/POST /api/v1/terms`
- [x] **B1.2** `GET/POST /api/v1/classes`, `PATCH /api/v1/classes/{id}`
- [x] **B1.3** `GET/POST /api/v1/students`, `PATCH /api/v1/students/{id}`
- [x] **B1.4** `GET/POST /api/v1/teachers`, `PATCH /api/v1/teachers/{id}`
- [x] **B1.5** `GET/POST /api/v1/subjects`
- [ ] **B1.6** Öğretmen-ders eşleştirme endpoint'i
- [x] **B1.7** Sınıf-öğrenci yerleştirme endpoint'i (`POST /api/v1/classes/{id}/students`)
- [ ] **B1.8** Veli kaydı + öğrenci-veli ilişkisi endpoint'i
- [ ] **B1.9** Liste endpoint'lerinde arama + pagination
- [x] **B1.10** Toplu öğrenci import API (`POST /api/v1/students/import`)

#### B2. Web entegrasyonu

- [x] **B2.1** `PrincipalStudentsPage` → API CRUD (localStorage kaldırıldı)
- [x] **B2.2** `PrincipalClassesPage` + detay/şube sayfaları → API CRUD
- [x] **B2.3** `PrincipalTeachersPage` → `provisionTeacher` + `resetTeacherPassword` API
- [x] **B2.4** `StudentImportModal` → backend import + sınıf seçici
- [ ] **B2.5** `[P]` Form validasyonu (Zod) — öğrenci/öğretmen formları
- [x] **B2.6** Loading/error state tutarlılığı (temel seviye)

**Faz B tamamlanma kriteri:** Müdür tarayıcıyı kapatıp açsa bile öğrenci/sınıf verisi DB'den gelir ✓ · veli yalnızca ilişkili öğrenciyi görür ✓ (seed ilişkileri) · öğretmen/veli CRUD API ✗

---

### Faz C — Ders Programı MVP

> **Amaç:** Program üret, düzenle, yayınla; öğretmen takvimine yansısın.  
> **Epic referansı:** Epic 3  
> **Durum:** ~80% tamamlandı

#### C1. Backend — scheduling engine

- [x] **C1.1** `GET/POST /api/v1/scheduling/requirements`
- [x] **C1.2** `GET/POST /api/v1/scheduling/teacher-availabilities`
- [x] **C1.3** Greedy constraint tabanlı program üretici (MVP — hard constraint temel seviye)
- [x] **C1.4** `POST /api/v1/schedules/generate` → DB'ye taslak yaz
- [x] **C1.5** `GET /api/v1/schedules/{id}`, `PATCH .../lessons/{lessonId}`
- [x] **C1.6** `POST .../validate`, `POST .../publish`
- [x] **C1.7** Teacher ID eşleştirme düzeltmesi (`users.id` vs `teachers.id`)
- [ ] **C1.8** Yayınlama audit log
- [ ] **C1.9** `[P]` Scheduling unit testleri (çakışma senaryoları)

#### C2. Web — program oluşturucu

- [x] **C2.1** `PrincipalSchedulePage` builder → `api.generateSchedule()` kullan
- [x] **C2.2** Taslak kaydet / yayınla butonları → backend publish API
- [x] **C2.3** Manuel hücre düzenleme → lesson PATCH API
- [ ] **C2.4** Çakışma / validation hata mesajları UI (kısmi)
- [ ] **C2.5** Öğretmen müsaitlik ve ders saat ihtiyacı formları (backend hazır, UI kısmi)
- [ ] **C2.6** `[P]` Sürükle-bırak grid (growth; MVP'de select yeterli)

**Faz C tamamlanma kriteri:** Müdür program üretip yayınlar ✓ · öğretmen web takviminde aynı dersleri görür ✓ · çakışma kuralları ihlal edilemez ✓ (temel)

---

### Faz D — Akıllı Yoklama (Web Öğretmen)

> **Amaç:** Yoklama PostgreSQL'de kalıcı; aktif ders programdan bulunur.  
> **Epic referansı:** Epic 4  
> **Durum:** ~90% tamamlandı

#### D1. Backend

- [x] **D1.1** Attendance repository → PostgreSQL
- [x] **D1.2** `main.go`: attendance servisini postgres store'a bağla
- [x] **D1.3** Aktif ders bulma: yayınlanmış program + timezone + tolerans
- [x] **D1.4** `GET /api/v1/attendance/sessions/{id}`
- [x] **D1.5** `POST .../finalize` — kesinleşmiş oturum güncellenemez
- [x] **D1.6** `GET /api/v1/students/{id}/attendance-summary`
- [x] **D1.7** Yoklama değişikliği audit log (`writeOperationalAudit`)
- [x] **D1.8** Devamsızlık bildirim olayı (`notifications`, idempotent)
- [ ] **D1.9** `[P]` Attendance integration testleri

#### D2. Web öğretmen

- [x] **D2.1** Yoklama ekranı: öğrenci listesini API roster'dan al
- [x] **D2.2** "Hepsi geldi" toplu işaretleme
- [x] **D2.3** Kaydedilmemiş çıkış uyarısı (`beforeunload`)
- [x] **D2.4** Aktif ders yok / birden fazla aday UX — ders seçici + boş program uyarısı

#### D3. Web müdür — yoklama raporu

- [x] **D3.1** `PrincipalAttendancePage` → gerçek API verisi
- [x] **D3.2** `GET /api/v1/dashboard/attendance/today` entegrasyonu
- [x] **D3.3** Sınıf bazlı özet: `GET /api/v1/dashboard/classes/{classId}/summary` (backend; FE bağlantısı opsiyonel)

**Faz D tamamlanma kriteri:** Öğretmen yoklama alır → DB'ye yazılır ✓ · müdür raporunda görünür ✓ · veli devamsızlık endpoint'inden okuyabilir ✓

---

### Faz E — Veli Web Konsolu

> **Amaç:** Veli web'de çocuğunun gerçek program/devamsızlık/duyuru verisini görsün.  
> **Epic referansı:** Epic 5  
> **Durum:** ~95% tamamlandı

#### E1. Backend — guardian API

- [x] **E1.1** `GET /api/v1/guardian/me/students`
- [x] **E1.2** `GET /api/v1/guardian/students/{studentId}/schedule`
- [x] **E1.3** `GET /api/v1/guardian/students/{studentId}/attendance`
- [x] **E1.4** `GET /api/v1/guardian/announcements`
- [x] **E1.5** `GET /api/v1/guardian/notifications`
- [x] **E1.6** `PATCH /api/v1/guardian/notifications/{id}/read`

#### E2. Web veli

- [x] **E2.1** Çocuk seçici → API'den çocuk listesi
- [x] **E2.2** `GuardianSchedulePage` → guardian schedule API
- [x] **E2.3** `GuardianAttendancePage` → gerçek devamsızlık kayıtları
- [x] **E2.4** `GuardianAnnouncementsPage` → hedeflenmiş duyurular
- [x] **E2.5** Bildirim listesi + okundu işaretleme
- [x] **E2.6** Overview mock notices kaldırıldı

**Faz E tamamlanma kriteri:** Veli başka öğrenci verisine erişemez ✓ · devamsızlık yoklama kayıtlarından gelir ✓

---

### Faz F — Müdür Dashboard ve Operasyon

> **Epic referansı:** Epic 6  
> **Durum:** ~70% tamamlandı

#### F1. Backend

- [x] **F1.1** Dashboard metriklerini gerçek sorgulardan hesapla
- [x] **F1.2** Kurum timezone'una göre "bugün" hesabı
- [x] **F1.3** Alınmamış yoklamalar: yayınlanmış program vs session karşılaştırması
- [x] **F1.4** `GET /api/v1/dashboard/attendance/today`
- [x] **F1.5** `GET /api/v1/dashboard/classes/{classId}/summary`

#### F2. Web

- [x] **F2.1** `PrincipalOverviewPage` KPI kartları → gerçek metrikler
- [x] **F2.2** `PrincipalOperationsPage` → tıklanabilir operasyon satırları (`targetPath`)
- [x] **F2.3** Program eksik / veri tutarsızlığı uyarı banner'ları (overview)

**Faz F tamamlanma kriteri:** Müdür tek ekranda bugünkü ders, yoklama tamamlanma ve devamsızlık özetini gerçek veriden görür ✓ (operasyon aksiyonları ✗)

---

### Faz G — Öğrenci Gözlemleri ve Rehberlik (Web)

> **Epic referansı:** Epic 7  
> **Durum:** ~65% tamamlandı

#### G1. Backend

- [x] **G1.1** `CreateObservation` PostgreSQL implementasyonu
- [x] **G1.2** `GET/PATCH/DELETE /api/v1/observations/{id}`
- [ ] **G1.3** Öğretmen kapsam kontrolü (yalnızca kendi öğrencileri)
- [ ] **G1.4** Rehberlik görüntüleme audit log

#### G2. Web öğretmen

- [x] **G2.1** Gözlem formu öğrenci listesi → API roster (`TeacherConsole`)
- [ ] **G2.2** Kategori, tarih, ders bağlamı alanları doğrulama (Zod)

#### G3. Web rehberlik

- [x] **G3.1** Gözlem listesi filtreleme (sınıf, kategori, tarih) — UI + API query params
- [ ] **G3.2** Hassas veri görsel ayrımı (mevcut badge genişlet)
- [x] **G3.3** `GuidancePlansPage` → "Faz 2" placeholder
- [ ] **G3.4** Risk sinyalleri → kural tabanlı backend (faz 2 backlog)

**Faz G tamamlanma kriteri:** Öğretmen gözlem girer ✓ · rehberlik listeler ✓ · audit kaydı ✗

---

### Faz H — Duyuru ve Bildirim

> **Epic referansı:** Epic 8  
> **Durum:** ~60% tamamlandı

#### H1. Backend

- [x] **H1.1** `POST/PATCH /api/v1/announcements` (müdür)
- [ ] **H1.2** `announcement_audiences` hedef kitle (rol, sınıf)
- [x] **H1.3** Bildirim oluşturma: devamsızlık olayları (duyuru bildirimi kısmi)
- [x] **H1.4** Kullanıcı bazlı okunma durumu (`notifications` tablosu)

#### H2. Web

- [x] **H2.1** Müdür duyuru oluşturma formu
- [x] **H2.2** Hedef kitle seçici (rol + opsiyonel sınıf)
- [x] **H2.3** Bildirim merkezi bileşeni (`NotificationBell`) — müdür + öğretmen navbar
- [ ] **H2.4** Okundu / okunmadı durumu (veli ✓, diğer roller ✗)

**Faz H tamamlanma kriteri:** Müdür duyuru yayınlar ✓ · veli görür ✓ · devamsızlık bildirimi yoklama sonrası oluşur ✓

---

### Faz I — Frontend Mimarisi (Doküman Uyumu)

> **Referans:** `09-frontend-mobil-mimarisi.md`, `12-teknik-kararlar.md`  
> **Durum:** ~5% — bilinçli olarak MVP sonrasına bırakıldı

- [ ] **I1** `[P]` `frontend/packages/api-client` — `api.ts` taşıma
- [ ] **I2** `[P]` `frontend/packages/domain-types` — paylaşılan tipler
- [ ] **I3** TanStack Query kurulumu; console'lardaki `useEffect` fetch'leri migrate
- [ ] **I4** React Hook Form + Zod — kritik formlar
- [ ] **I5** Ortak UI bileşenleri: DataTable, FormField, Modal
- [ ] **I6** Role-aware navigation paketi

---

### Faz J — Test ve Kabul

> **Durum:** ~25% tamamlandı

- [ ] **J1** Backend: auth tenant izolasyon integration test
- [ ] **J2** Backend: scheduling çakışma testleri
- [ ] **J3** Backend: attendance aktif ders + persist test
- [ ] **J4** Backend: guardian scope test (başka öğrenciye erişim reddi)
- [ ] **J5** Web: kritik akış smoke test (Playwright veya Cypress)
- [ ] **J6** `13-mvp-epik-kabul-kriterleri.md` maddelerinin tek tek checkbox doğrulaması
- [x] **J7** Priente demo senaryo dokümantasyonu (aşağıda)
- [x] **J8** `[P]` CI pipeline (`.github/workflows/ci.yml`)

---

## Öncelik Sırası (Kalan işler)

| Sıra | Faz | Görev | Neden |
|------|-----|-------|-------|
| 1 | **A** | A1.4 şifre sıfırlama | Production öncesi zorunlu |
| 2 | **B** | B1.10 Excel import, B2.3 öğretmen CRUD UI | Okul açılış senaryosu |
| 3 | **H** | H2.2–H2.4 bildirim merkezi | Veli dışı roller |
| 4 | **F** | F2.2–F2.3 operasyon UX | Müdür günlük kullanım |
| 5 | **G** | G1.3–G1.4, G3.1 audit + filtre | Rehberlik güvenliği |
| 6 | **J** | Integration + E2E testler | Regresyon koruması |
| 7 | **I** | FE mimarisi refactor | MVP sonrası teknik borç |

---

## Epic Bazlı Hızlı Durum Matrisi

| Epic | Backend | Web UI | E2E | Not |
|------|---------|--------|-----|-----|
| E1 Auth/Tenant | İyi | İyi | Kısmi | JWT ✓; şifre sıfırlama, user_scopes ✗ |
| E2 Okul tanımları | İyi | İyi | Kısmi | CRUD ✓; import, veli API ✗ |
| E3 Ders programı | İyi | İyi | Kısmi | Generate/publish ✓; audit, test ✗ |
| E4 Yoklama | Tam | İyi | İyi | PG + finalize + bildirim + özet ✓ |
| E5 Veli | Tam | Tam | İyi | 6 endpoint + UI ✓ |
| E6 Müdür dashboard | İyi | Kısmi | Kısmi | Metrikler gerçek ✓; operasyon UX ✗ |
| E7 Gözlemler | İyi | İyi | Kısmi | PG create ✓; audit, filtre ✗ |
| E8 Duyuru/bildirim | Kısmi | Kısmi | Kısmi | Create ✓; audience, global merkez ✗ |

---

## Tanım: "Tam Çalışır Web MVP" Bitti Sayılır When…

Aşağıdaki senaryo hatasız çalıştığında web MVP hedefine ulaşılmış kabul edilir:

| # | Adım | Durum |
|---|------|-------|
| 1 | Süper admin yeni kurum ve müdür hesabı oluşturur | ✓ |
| 2 | Müdür sınıf, öğretmen, öğrenci, veli tanımlar (**API**) | ✓ (veli CRUD API ✗) |
| 3 | Müdür ders programı üretir, düzenler ve **yayınlar** | ✓ |
| 4 | Öğretmen web'de bugünkü dersini görür, **akıllı yoklama** alır | ✓ |
| 5 | Müdür dashboard'da alınan/alınmayan yoklamayı görür | ✓ |
| 6 | Veli web'de çocuğunun programını, devamsızlığını, duyurularını görür | ✓ |
| 7 | Öğretmen gözlem girer; rehberlik listeler | ✓ |
| 8 | Müdür duyuru yayınlar; hedef kitle alır | ✓ (basit audience) |
| 9 | Tüm adımlarda tenant izolasyonu ve rol kontrolü | ✓ (user_scopes ✗) |

**Genel:** 8/9 adım çalışır durumda; production için A1.4 + J testleri önerilir.

---

## Priente Demo Senaryosu (J7)

**Referans:** `PRIENTE_TEST_CREDENTIALS.txt`  
**Tenant:** Priente Test Koleji (`00000000-0000-0000-0000-000000020001`)  
**Veri:** 200 öğrenci, 8 sınıf, 12 öğretmen, 5 veli

### Önkoşul

```bash
# Backend
cd backend && go run ./cmd/api

# Frontend
cd frontend/apps/web && npm run dev

# PostgreSQL seed (sunucu içinden)
docker exec -i ots_postgres psql -U ots -d ots -f - < backend/migrations/000006_priente_test_school.sql
```

### Akış 1 — Müdür okul yönetimi

1. `mudur@priente.k12.tr` / `OtsMudur!2026` ile giriş
2. **Öğrenciler** → listeyi gör, yeni öğrenci ekle veya düzenle
3. **Sınıflar** → sınıf oluştur, öğrenci ata
4. **Ders programı** → "Program üret" → "Yayınla"
5. **Duyurular** → yeni duyuru oluştur

### Akış 2 — Öğretmen yoklama

1. `ogretmen@priente.k12.tr` / `OtsOgretmen!2026` ile giriş
2. **Yoklama** → aktif dersi aç
3. Devamsızlıkları işaretle → **Kaydet ve tamamla**
4. Oturum kilitlenir; veli bildirimi oluşur

### Akış 3 — Müdür rapor

1. Müdür hesabıyla **Yoklama raporu** sayfası
2. Bugünkü finalize edilmiş kayıtları gör
3. Dashboard'da yoklama tamamlanma % gerçek değer

### Akış 4 — Veli

1. `veli@priente.k12.tr` / `OtsVeli!2026` ile giriş
2. Çocuk seç → **Program**, **Devamsızlık**, **Duyurular**
3. Bildirimleri gör, okundu işaretle

### Akış 5 — Rehberlik gözlem

1. `rehberlik@priente.k12.tr` / `OtsRehberlik!2026` ile giriş
2. Gözlem listesini filtrele (UI filtre kısıtlı — API listesi çalışır)

### Bilinen sınırlamalar (demo)

- Şifre sıfırlama e-posta akışı yok
- Excel toplu import frontend-only
- Program builder localStorage cache kullanabilir
- E2E otomasyon henüz yok — manuel doğrulama gerekir

---

## Son Tamamlanan Adımlar (2026-05-20)

1. **Faz A (kısmi):** JWT auth, refresh/logout, `DemoAuth` kaldırıldı, web refresh akışı
2. **Faz B (kısmi):** Okul CRUD API + müdür öğrenci/sınıf UI API'ye bağlandı
3. **Faz C (kısmi):** Scheduling MVP — generate, validate, publish, lesson PATCH
4. **Faz D (tam):** D1.6 öğrenci yoklama özeti + D1.7 audit log + memory repo/test düzeltmeleri
5. **Faz E (tam):** Guardian API (6 endpoint) + veli konsolu gerçek veri
6. **Faz F (kısmi):** Dashboard gerçek metrikler + class summary endpoint
7. **Faz G (kısmi):** Observation PG create + CRUD endpoint'leri
8. **Faz H (kısmi):** Duyuru POST/PATCH + müdür oluşturma formu
## Son Tamamlanan Adımlar (2026-05-20 — devam)

10. **F2.2–F2.3:** Operasyon satırları tıklanabilir; overview uyarı banner'ları; backend operasyonları gerçek veriden üretiliyor.
11. **B2.3–B2.4 / B1.10:** Öğretmen provision API + şifre sıfırlama; toplu öğrenci import API + sınıf seçicili modal.
12. **A1.4:** Şifremi unuttum / sıfırla akışı (demo token önizlemeli).
13. **H2.2–H2.3:** Duyuru hedef kitle UI; paylaşılan `NotificationBell` (müdür/öğretmen).
14. **D2.4 / G3.1:** Öğretmen ders seçici; rehberlik gözlem filtreleri (kategori/sınıf/tarih).

---

## İlgili Dosyalar

| Alan | Konum |
|------|-------|
| API handler kaydı | `backend/internal/http/handlers/handlers.go` |
| Okul CRUD handlers | `backend/internal/http/handlers/handlers_school.go` |
| Auth / JWT | `backend/internal/platform/auth/jwt.go`, `middleware/auth.go` |
| Web API client | `frontend/apps/web/src/lib/api.ts` |
| Yoklama repository | `backend/internal/repository/postgres/store_attendance.go` |
| Scheduling repository | `backend/internal/repository/postgres/store_scheduling.go` |
| Guardian repository | `backend/internal/repository/postgres/store_guardian.go` |
| Müdür konsolu | `frontend/apps/web/src/role-dashboard/principal/PrincipalConsole.tsx` |
| Veli konsolu | `frontend/apps/web/src/role-dashboard/guardian/GuardianConsole.tsx` |
| Öğretmen konsolu | `frontend/apps/web/src/role-dashboard/teacher/TeacherConsole.tsx` |
| Program builder | `frontend/apps/web/src/role-dashboard/principal/pages/PrincipalSchedulePage.tsx` |
| CI pipeline | `.github/workflows/ci.yml` |
| Demo hesapları | `PRIENTE_TEST_CREDENTIALS.txt` |
| Migrasyonlar | `backend/migrations/` |

---

*Son güncelleme: 2026-05-20 — büyük entegrasyon dalgası sonrası tam revizyon.*
