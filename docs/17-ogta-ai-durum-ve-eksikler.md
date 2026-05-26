# ogta.ai Uygulama Durumu ve Eksikler

> Tarih: 2026-05-25  
> İlgili dokümanlar: [15-ogta-ai-komut-asistani.md](./15-ogta-ai-komut-asistani.md), [16-eksik-kalan-kisimlar-analizi.md](./16-eksik-kalan-kisimlar-analizi.md)  
> Amaç: ogta.ai modülünün bugünkü gerçek durumunu, tamamlanan fazları ve hâlâ açık kalan işleri tek yerde özetlemek.

---

## 1. Yönetici Özeti

ogta.ai artık **çalışan bir modül**. Tasarım dokümanındaki Faz 1–5'in büyük kısmı kod tabanına işlendi. Asistan dört rol konsolunda (öğretmen, rehberlik, müdür, veli) sağ alt `ogta.ai` paneli üzerinden erişilebilir.

**Temel mimari korunuyor:** Model yalnızca öneri üretir; gerçek yazma işlemleri Go backend'de, pending action + kullanıcı onayı + audit ile yapılır.

**Önemli sınırlama:** OpenAI API key tanımlı ve `OGTA_AI_USE_LLM=true` iken model **tool loop** ile devreye girer; hata/başarısızlıkta **rule-engine fallback** kullanılır.

| Alan | Durum | Tahmini |
|------|--------|---------|
| ogta.ai çekirdek altyapı | Tamamlandı | %98 |
| Rol bazlı MVP akışları | Tamamlandı | %95 |
| Güvenlik sertleştirme (Faz 5) | Tamamlandı | %85 |
| OpenAI agentic entegrasyon | Tamamlandı (tool loop + fallback) | %75 |
| Web E2E (Playwright) | İlk smoke eklendi | %40 |
| Platform geneli P0 scope açıkları | Kapatıldı | — |

---

## 2. Tamamlanan İşler

### 2.1 Backend altyapı

| Bileşen | Konum |
|---------|--------|
| Migrasyon | `backend/migrations/000010_ogta_ai.sql` |
| Domain modelleri | `backend/internal/domain/ai/` |
| Orkestrasyon servisi | `backend/internal/app/ai/` |
| OpenAI HTTP client | `backend/internal/platform/openai/` |
| Repository | `backend/internal/repository/postgres/store_ai.go`, `memory/store_ai.go` |
| HTTP handler | `backend/internal/http/handlers/handlers_ai.go` |

**Tablolar:** `ai_conversations`, `ai_messages`, `ai_tool_calls`, `ai_pending_actions`

**API uçları:**

```text
GET    /api/v1/ai/capabilities
GET    /api/v1/ai/usage
POST   /api/v1/ai/conversations
GET    /api/v1/ai/conversations
GET    /api/v1/ai/conversations/{id}
POST   /api/v1/ai/conversations/{id}/messages
GET    /api/v1/ai/actions/{id}
POST   /api/v1/ai/actions/{id}/confirm
POST   /api/v1/ai/actions/{id}/cancel
```

**Ortam değişkenleri:**

```text
OGTA_AI_PROVIDER=openai
OGTA_AI_MODEL=gpt-4o-mini
OGTA_AI_STORE_RESPONSES=false
OGTA_AI_TIMEOUT_SECONDS=30
OGTA_AI_MESSAGES_PER_MINUTE=20
OGTA_AI_DAILY_MESSAGE_LIMIT=200
OGTA_AI_RETENTION_DAYS=90
OGTA_AI_USE_LLM=true
OPENAI_API_KEY=...
```

**Yeni API uçları:**

```text
POST   /api/v1/ai/conversations/{id}/messages:stream
PATCH  /api/v1/super-admin/institutions/{id}/ai-quota
GET    /api/v1/super-admin/ai/overview
PATCH  /api/v1/super-admin/ai/cost-settings
POST   /api/v1/super-admin/ai/retention/run
```

### 2.2 Rol bazlı yetenekler

#### Öğretmen
- Yetkili öğrenci arama (scope kontrollü)
- Gözlem kaydı taslağı + onay kartı + `create_observation` pending action
- Klinik ifade yumuşatma (DEHB vb. → gözlem dili)

#### Rehberlik
- Öğrenci arama
- Rehberlik notu oluşturma (onaylı)
- Destek planı oluşturma (onaylı)
- Risk sinyali özeti (gözlemlerden türetilmiş, ham not dökülmez)
- Öğrenci bazlı gözlem özeti (kategori sayımları)

#### Müdür / system_admin
- Dashboard operasyon özeti
- Günlük yoklama durumu
- Program üretimi eksik veri kontrolü
- Duyuru taslağı + onaylı yayınlama
- Öğrenci arama

#### Veli (guardian)
- Çocuğun ders programı özeti
- Devamsızlık özeti (ham gözlem/rehberlik notu yok)
- Son duyurular listesi
- Destek talebi taslağı + onay

### 2.3 Frontend

| Bileşen | Konum |
|---------|--------|
| AI panel | `frontend/apps/web/src/role-dashboard/ai/OgtaAiDock.tsx` |
| Stil | `frontend/apps/web/src/role-dashboard/ai/OgtaAiDock.css` |
| API client | `frontend/apps/web/src/lib/api.ts` (`aiCapabilities`, `sendAiMessage`, `confirmAiAction`, …) |

**Entegrasyon:** `TeacherConsole`, `GuidanceConsole`, `PrincipalConsole`, `GuardianConsole`

### 2.4 Faz 5 — Sertleştirme (yapılanlar)

| Madde | Durum | Detay |
|-------|--------|--------|
| Prompt injection filtreleri | ✅ | `backend/internal/app/ai/security.go` |
| Prompt injection testleri | ✅ | `security_test.go`, `security_integration_test.go` |
| Role/scope negatif testleri | ✅ | Veli başkasının action'ını onaylayamaz; scope dışı öğrenci reddedilir |
| Dakikalık rate limit | ✅ | `middleware/ai_ratelimit.go` — POST `/api/v1/ai/*` |
| Günlük mesaj limiti | ✅ | `OGTA_AI_DAILY_MESSAGE_LIMIT`, `GET /api/v1/ai/usage` |
| Audit | ✅ | `ai.action.confirm`, `ai.prompt.blocked` |
| Retention job | ✅ | 24 saatte bir `RunRetentionAll`; varsayılan 90 gün |
| Integration test suite | ✅ | 11 test — `go test ./internal/app/ai/...` |

---

## 3. Kabul Kriterleri Durumu

| Kriter | Durum |
|--------|--------|
| Öğretmen yalnızca yetkili öğrenciyi arar | ✅ |
| Çoklu adayda seçim ister | ✅ |
| Onay kartı olmadan kayıt oluşmaz | ✅ |
| Onay sonrası audit log | ✅ |
| Klinik tanı üretmez / yumuşatır | ✅ |
| Rehberlik notu/plan onaylı action | ✅ |
| Veli başka öğrenci/ham gözlem görmez | ✅ |
| Müdür hassas rehberlik notunu varsayılan özetlere almaz | ✅ |
| Duyuru yayınlama açık onay ister | ✅ |

---

## 4. Bilinçli Sapmalar (Tasarım vs Uygulama)

1. **OpenAI Responses API + tool loop** — Chat Completions tool loop eklendi; Responses API henüz yok.
2. **Streaming** — `POST .../messages:stream` SSE ile eklendi.
3. **Ayrı tool registry dosyası yok** — Davranış `tools.go` + `llm_orchestrator.go` içinde.
4. **Structured outputs / JSON schema** — Model çıktısı şemaya bağlı değil; Go tarafında regex + kurallar.
5. **Veli rol kodu** — Dokümanda "veli", kodda `guardian`.

---

## 5. Hâlâ Eksik Olan ogta.ai Maddeleri

### P1 — ogta.ai içi

| Eksik | Açıklama | Önerilen iş |
|-------|----------|-------------|
| OpenAI tool loop | ✅ | `tools.go`, `llm_orchestrator.go`; rule-engine fallback |
| Mesaj streaming | ✅ | SSE handler + `OgtaAiDock` stream client |
| Token / maliyet kaydı | ✅ | `token_input/output` + süper admin panel |
| Tenant bazlı AI kotası | ✅ | `tenants.ai_*` + super-admin kota PATCH |
| Super-admin AI retention tetikleme | ✅ | `POST /super-admin/ai/retention/run` |
| `redacted_content` kullanımı | Alan var, doldurulmuyor | Hassas metin maskeleme pipeline |
| Öğretmen ek yetenekler | Aktif ders, yoklama, ders özeti | Doc §7.1 kalan maddeler |

### P2 — Test

| Eksik | Açıklama |
|-------|----------|
| Playwright / Cypress E2E | İlk smoke: `e2e/ogta-ai-teacher.spec.ts` |
| HTTP handler seviyesi test | `httptest` ile tam auth zinciri yok (servis testleri var) |
| Yük / concurrency testi | Rate limiter çoklu instance'ta paylaşımsız (in-memory) |

### P3 — Üretim

| Eksik | Açıklama |
|-------|----------|
| Rate limit Redis | Çok instance deploy'da dakikalık limit instance başına |
| Secret encryption at rest | `ai_provider_key` düz metin |
| AI usage dashboard | Super-admin `/admin/ai` ekranı |

---

## 6. Platform Geneli Eksikler (ogta.ai Dışı, Doküman 16'dan)

ogta.ai modülü tamamlansa bile **docs/16** içindeki şu maddeler hâlâ geçerli ve ogta.ai güvenliği için önemli:

### P0 — Güvenlik / scope (öncelikli)

| # | Konu | Risk |
|---|------|------|
| 3.1 | `GET /api/v1/observations` tenant geneli dönüyor | Hassas gözlem sızıntısı |
| 3.2 | Gözlem get/update/delete author/scope kontrolsüz | Yetkisiz düzenleme |
| 3.3 | `GET /students/{id}/attendance-summary` scope eksik | Veli dışı erişim |
| 3.4 | `GET /dashboard/attendance/today` role sınırı yok | ✅ Kapatıldı |

> **Not:** P0 scope maddeleri REST katmanında kapatıldı (`handlers_scope.go`).

### P1 — Ürün

- `teacher_subjects` yönetim endpoint'i
- `announcement_audiences` hedefli duyuru tablosu
- Veli CRUD tam seti
- Ders programı input UI (requirements / availability grid)
- Rehberlik vaka dosyası (`guidance_cases`)
- Kalıcı `risk_signals` tablosu
- Rehberlik okuma audit genişletmesi

### P2 — Frontend / operasyon

- TanStack Query
- React Hook Form + Zod
- Shared packages (`api-client`, `domain-types`)
- Legacy `TeacherDashboard.tsx` demo verisi
- OpenAPI / endpoint envanteri
- Background job altyapısı (bildirim fan-out vb.)

---

## 7. Test Komutları

```bash
# Backend AI testleri
cd backend && go test ./internal/app/ai/...

# Backend tam build
cd backend && go build ./...

# Frontend build
cd frontend/apps/web && npm run build

# Playwright (backend + frontend ayakta olmalı)
cd frontend/apps/web && npx playwright install chromium && npm run test:e2e
```

**Mevcut integration test senaryoları:**

1. Öğretmen gözlem akışı + onay
2. Scope dışı öğrenci reddi
3. Onaysız kayıt oluşmaması
4. Rehberlik notu onay akışı
5. Müdür dashboard özeti
6. Veli program / destek talebi
7. Prompt injection engelleme
8. Veli başkasının action'ını onaylayamaz
9. Günlük mesaj limiti
10. Retention eski mesaj temizliği

---

## 8. Önerilen Sonraki Adımlar

### Hemen (1 sprint)

1. **P0 scope düzeltmeleri** — observation ve attendance endpoint policy (doc 16 §3)
2. **OpenAI tool loop** — rule-engine'i fallback bırak, API key varken LLM devreye girsin
3. **Playwright smoke** — tek senaryo: öğretmen ogta.ai gözlem + onay

### Kısa vade (2–3 sprint)

4. Mesaj streaming
5. Token/maliyet metrikleri + super-admin usage ekranı
6. Rehberlik vaka dosyası + kalıcı risk sinyalleri
7. Hedefli duyuru (`announcement_audiences`)

### Orta vade

8. Redis rate limit
9. Shared frontend packages + TanStack Query
10. OpenAPI envanteri

---

## 9. Dosya Haritası (ogta.ai)

```text
backend/
  migrations/000010_ogta_ai.sql
  internal/
    domain/ai/models.go
    app/ai/
      service.go
      orchestrator.go
      orchestrator_guidance.go
      orchestrator_principal.go
      orchestrator_guardian.go
      orchestrator_helpers.go
      security.go
      retention.go
      tools.go
      llm_orchestrator.go
      stream.go
      llm_integration_test.go
      security_test.go
      security_integration_test.go
    platform/openai/client.go
    http/
      handlers/handlers_ai.go
      middleware/ai_ratelimit.go
frontend/apps/web/src/
  role-dashboard/ai/OgtaAiDock.tsx
  role-dashboard/ai/OgtaAiDock.css
  lib/api.ts
```

---

## 10. Sonuç

ogta.ai **MVP+ seviyesinde çalışır durumda**: dört rol, onaylı yazma işlemleri, temel güvenlik filtreleri, rate limit, retention ve test coverage mevcut.

En büyük kalan boşluklar:

1. **Responses API / structured outputs** — Chat Completions tool loop var; JSON schema bağlı değil
2. **Playwright kapsamı genişletme** — tek smoke senaryo mevcut
3. **`redacted_content` pipeline** — hassas metin maskeleme

Bu doküman, [16-eksik-kalan-kisimlar-analizi.md](./16-eksik-kalan-kisimlar-analizi.md) içindeki ogta.ai maddelerini günceller; §10 checklist artık büyük ölçüde tamamlanmış sayılmalı, §3–§9 platform eksikleri ise ayrı sprint backlog'u olarak açık kalmalıdır.
