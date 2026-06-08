# Mobil, Frontend ve Backend Guncel Analizi

> Tarih: 2026-06-03  
> Guncelleme: 2026-06-05  
> Kapsam: `backend`, `frontend/apps/mobile`, `frontend/apps/web`, mevcut `docs` seti ve calisma agacindaki guncel durum.  
> Amac: Sistemin bugunku teknik durumunu, onceki analizlerden kapanan basliklari, halen risk olusturan alanlari ve yakin vadeli oncelikleri netlestirmek.

---

## 1. Yonetici Ozeti

Sistem artik "eksik MVP" evresinden cikmis durumda. Backend tarafinda auth, scope, rehberlik, yoklama, duyuru, push, schedule builder, ogrenci import ve ogta.ai entegrasyonlari calisiyor. Mobil uygulama tarafinda rol bazli shell, auth akislari, push registration ve vitest testleri mevcut. Web panel tarafinda Playwright altyapisi ve en az bir gercek smoke senaryosu bulunuyor.

Bugun icin en onemli sonuc su:

- Eski analizlerde P0 olarak gecen bazi basliklar kapanmis durumda. Ornegin sifre sifirlama public path'leri, mobil forgot/reset ekranlari, observation RBAC sertlestirmesi ve rehberlik scope filtreleri artik kodda var.
- Buna karsin sistem tamamen release-hardening seviyesinde degil. 2026-06-05 itibariyla operasyonel fallback davranisi explicit flag'e baglandi, `jwt/v5` dogrudan bagimlilik uyarisi temizlendi ve servis/ulasim, auth reset, observation, guidance ve push icin handler testleri eklendi. Kalan kritik riskler PostgreSQL gercek entegrasyon testi, native E2E, tum hassas handler yuzeyinin daha genis kapsami, aktif calisma agacinin buyuk olcude degisken olmasi ve yeni modullerin release disiplini tarafindadir.

Bu nedenle mevcut durum icin dogru ifade su olur:

**Urun omurgasi ve ana akislari calisiyor; ancak bugunku ana sorun "feature yoklugu" degil, "guvence ve release disiplini" eksigi.**

---

## 2. Bu Analizde Dogrudan Dogrulananlar

Asagidaki kontroller bu analiz sirasinda tekrar dogrulandi:

### 2.1 Mobil saglik durumu

Calistirilan komutlar:

```bash
cd frontend/apps/mobile && npm run typecheck
cd frontend/apps/mobile && npm test
```

Sonuc:

- `typecheck` gecti.
- `vitest` gecti: 5 test dosyasi, 16 test.
- Forgot/reset route'lari ve push katmani typecheck zincirinde derlendi.

Anlamı:

- `docs/19-mobile-frontend-devam-analizi.md` icindeki "mobil typecheck gecmiyor" ve "forgot/reset eksik" bulgulari bugun icin artik gecerli degil.

### 2.2 Backend saglik durumu

Calistirilan komutlar:

```bash
cd backend && go test ./...
cd backend && go test ./internal/app/transport ./internal/repository/memory ./internal/repository/postgres ./internal/http/handlers
```

Sonuc:

- Tum Go testleri gecti.
- Ozellikle `internal/app/ai`, `internal/app/guidance`, `internal/app/push`, `internal/app/scheduling`, `internal/app/studentimport`, `internal/http/middleware`, `internal/repository/memory`, `internal/app/transport`, `internal/repository/postgres` ve `internal/http/handlers` paketleri yesil.
- Servis/ulasim handler smoke testleri eklendi: principal servis gorunumu, teacher yasagi, driver login/paylasim/trip, guardian scope ve unknown JSON field reddi otomatik korunuyor.
- Auth reset, observation RBAC, guidance note role guard ve push device token sanitizasyonu icin ek HTTP testleri eklendi.

Anlamı:

- Backend servis katmani islevsel olarak ciddi olgunlasmis.
- Ancak handler seviyesi ve PostgreSQL repository seviyesi test guvencesi halen genisletilmeli; yeni handler testleri baslangic kapsami sagliyor, fakat tum hassas endpoint yuzeyini kapatmiyor.

### 2.3 Web durum sinyali

Web panelde su andaki gorunen durum:

- `frontend/apps/web/playwright.config.ts` mevcut.
- `frontend/apps/web/e2e/ogta-ai-teacher.spec.ts` mevcut.
- `package.json` icinde `test:e2e` script'i tanimli.

Anlamı:

- Web icin "hic E2E yok" ifadesi artik teknik olarak yanlis.
- Dogru ifade: **yalnizca ilk smoke seviyesi var, kapsam dar.**

---

## 3. Onceki Raporlardan Kapanan Basliklar

Bu bolum ozellikle eski dokumanlardaki artik gecerli olmayan P0/P1 maddelerini ayiklamak icin var.

### 3.1 Auth forgot/reset akisi kapanmis durumda

Bugun kodda bulunanlar:

- Backend public path listesinde `POST /api/v1/auth/password/forgot` ve `POST /api/v1/auth/password/reset` var.
- Mobil `(auth)` stack icinde `forgot-password` ve `reset-password` ekranlari var.
- Mobil API client icinde `passwordForgot` ve `passwordReset` wrapper'lari var.
- Middleware seviyesi icin test de var: `backend/internal/http/middleware/auth_test.go`.

Sonuc:

- Bu alan artik eksik degil.
- Bundan sonraki is ihtiyaci daha cok UX polish ve E2E kapsami tarafinda.

### 3.2 Observation RBAC onceki rapora gore daha sert

Bugun handler seviyesinde gorulenler:

- Guardian kullanicisi `GET /api/v1/observations` ile bloklaniyor.
- Listeleme role gore filtreleniyor.
- `get`, `update`, `delete` akislarinda `canReadObservation` / `canModifyObservation` benzeri policy kontrolu var.
- `createObservation` icinde teacher ve guidance icin `student scope` kontrolu uygulanmis.

Sonuc:

- `docs/16-eksik-kalan-kisimlar-analizi.md` icindeki observation tarafindaki aciklarin en azindan ana bolumu kapatilmis.

### 3.3 Rehberlik scope tarafinda anlamli ilerleme var

`backend/internal/app/guidance/service.go` icinde:

- `ListNotes`, `ListPlans`, `ListRiskTrackings` artik `userID` aliyor ve ogrenci bazli scope filtreliyor.
- `UpdateNote`, `DeleteNote`, `UpdatePlan`, `DeletePlan`, `DeleteRiskTracking` scope disi ogrenci icin hata donuyor.
- Buna dair testler de eklenmis.

Sonuc:

- Rehberlik alaninda eski rapordaki en kritik scope bosluklari kapanmis.
- Bundan sonraki odak, bu korumalarin handler/E2E tarafinda da daha genis guvenceye alinmasi olmali.

### 3.4 Mobil push artik plan degil, uygulanmis katman

Bugun mobil tarafta bulunanlar:

- `expo-notifications` ve `expo-device` kullanimi mevcut.
- `PushNotificationsProvider`, `PushPermissionPrompt`, `registerPushNotifications.ts` var.
- Backend'de device token, notification preferences ve `push/test` endpoint'leri var.

Sonuc:

- Push tarafi artik backlog fikri olmaktan cikmis; uygulama seviyesi bir capability haline gelmis.
- Kalan konu daha cok native release, environment dogrulamasi ve gercek cihaz operasyonu.

---

## 4. Guncel Durum Tablosu

| Alan | Guncel durum | Not |
|------|--------------|-----|
| Backend servis katmani | Guclu | Ana domain servisleri var, testler geciyor |
| Backend handler/RBAC | Orta-Iyi | Kritik alanlarda policy var; transport/auth/observation/guidance/push handler smoke eklendi, diger alanlar genislemeli |
| PostgreSQL entegrasyonu | Orta | Kod var; driver rol normalizasyonu testli, fakat gercek DB integration halen zayif |
| Mobil uygulama | Iyi | Typecheck ve vitest geciyor; web export smoke ayrica periyodik kosulmali |
| Mobil native release hazirligi | Orta | Expo tabani var, ama native smoke/E2E ve release checklist'i sinirli |
| Web panel | Iyi | Buyuk yuzey aktif, en az bir Playwright smoke mevcut |
| Test guvencesi | Orta | Unit/integration var; handler kapsami ve native E2E halen zayif |
| Operasyonel sertlik | Orta | Memory fallback artik explicit flag; calisma agaci oynakligi risk yaratıyor |

---

## 5. Guncel Problemli ve Riskli Alanlar

Bu bolum bugun icin gercekten takip edilmesi gereken riskleri listeler.

### 5.1 Kapanan P0 - Non-production ortamda sessiz memory fallback riski

2026-06-05 itibariyla `backend/cmd/api/main.go` icinde PostgreSQL baglantisi kurulamazsa uygulama varsayilan olarak fail-fast davraniyor. Kalici olmayan demo repository ancak `ALLOW_IN_MEMORY_FALLBACK=true` acikca verildiginde devreye giriyor.

Kapanan risk:

- Staging benzeri ortamlarda yanlis PostgreSQL konfigurasyonunun sessizce memory store'a dusmesi engellendi.
- `README.md` ve `backend/.env.example` explicit fallback davranisini anlatiyor.

Kalan takip:

- Deploy ortamlarinda `ALLOW_IN_MEMORY_FALLBACK=false` veya tanimsiz kalmali.
- Lokal demo ihtiyaci varsa flag bilincli sekilde acilmali.

### 5.2 P0 - Calisma agaci cok hareketli, rapor snapshot'i stabil degil

`git status --short` ciktisina gore backend ve mobil tarafta cok sayida degismis ve yeni dosya bulunuyor. Ozellikle su alanlarda aktif gelisim var:

- billing
- transport
- school life
- mobil principal / teacher life ve services ekranlari
- API client ve tipler

Neden riskli:

- Bugun cikarilan durum raporu bir release tag'ine degil, aktif gelisim snapshot'ina dayanıyor.
- Testler yesil olsa bile kapsam buyuk bir degisim dalgasi icinde oldugu icin regresyon riski yuksek.

Oneri:

- Yeni moduller icin merge oncesi ayri checklist kullanilsin.
- Docs raporlari release branch veya en azindan stabil milestone commit'i baz alinarak yenilensin.

### 5.3 P1 - Handler seviyesi test guvencesi halen genislemeli

`go test ./...` yesil ve `internal/http/handlers` paketine servis/ulasim, auth reset, observation, guidance ve push odakli testler eklendi. Bu testler driver, principal, teacher, guardian, guidance ve public auth reset akisini koruyor.

Neden hala riskli:

- Yeni testler kritik bir ilk HTTP guvence katmani sagliyor, fakat tum endpoint varyasyonlarini kapsamiyor.
- Scheduling, announcement, academic, billing, life, AI ve super admin gibi hassas HTTP yuzeylerinde genis negatif senaryo kapsami halen gerekli.

Oncelikli test adaylari:

- observation delete ve filtre varyasyonlari
- guidance plan/risk/case HTTP scope akislari
- push preference, revoke ve super-admin push health/log endpoint'leri
- principal scheduling publish / validate akislari

### 5.4 P1 - PostgreSQL gercek davranisi memory store'a gore daha az guvence altinda

Repository memory testleri mevcut, fakat PostgreSQL tarafinda kapsam daha dar.

Neden riskli:

- SQL sorgulari, join filtreleri, migration etkileri ve tenant/scope ayrimi memory store ile bire bir ayni riski tasimaz.
- Ozellikle yeni billing, life ve transport modullerinde bu fark buyuyebilir.

Oneri:

- En azindan smoke seviyesinde migration + PG integration suite eklenmeli.
- Kritik query'ler icin repository integration testleri ayrilmali.

### 5.5 P1 - Mobil test kapsami iyi ama hala dar

Mobil `typecheck` ve `vitest` yesil. Ancak mevcut test yuzeyi hala sinirli:

- Offline queue ve role route gibi utility alanlari testli.
- Ekran akislari, auth form davranislari, push registration happy-path'i ve role bazli navigation akislari otomatik testli degil.

Neden riskli:

- Expo Router tabanli uygulamalarda route regressions ve parametre bozulmalari utility testleriyle yakalanmaz.
- Push ve auth gibi kritik alanlar agirlikla typecheck ve dar unit testlerle korunuyor.

Oneri:

- En azindan Expo web uzerinden smoke senaryolari eklenmeli.
- Native icin Maestro veya Detox secimi netlestirilmeli.

### 5.6 P1 - Web E2E var, fakat tek smoke senaryosu sistem olcegine gore yetersiz

Bugun depoda gercekten bir Playwright testi var: ogta.ai teacher smoke.

Neden hala risk:

- Principal CRUD, attendance finalize, student import, guidance case, push preferences, forgot/reset ve super admin akislari korunmuyor.
- Tek senaryo olması, genis uygulama yuzeyi icin yeterli regresyon kalkanı degil.

Oneri:

- Minimum 5-7 kritik smoke akisa cikilmali.

### 5.7 Kapanan P2 - `go.mod` arac zinciri borcu

`backend/go.mod` icinde `github.com/golang-jwt/jwt/v5` artik dogrudan bagimlilik olarak siniflandirildi.

Sonuc:

- `go test ./...` sonrasi dependency siniflandirmasi temiz.
- Bu baslik artik aktif risk degil.

---

## 6. Backend Analizi

### 6.1 Guclu yanlar

- Domain ayrimi net: app/domain/http/repository/platform katmanlari korunmus.
- Auth, scope, push, scheduling, AI, guidance, student import ve announcement alanlari tek bir monolit icinde ama moduler sekilde ilerliyor.
- Middleware katmaninda auth, rate limit, user scopes ve operational audit zinciri var.
- Push ve AI gibi yeni capability'ler dogrudan handler'a degil servis katmanina yerlestirilmis.

### 6.2 Dikkat edilmesi gerekenler

- `main.go` agir bir composition root haline gelmis; yeni modul eklemeleriyle buyumeye devam ediyor.
- DB baglantisi, background job'lar ve servis wiring ayni dosyada toplandigi icin operasyonel karmasa artabilir.
- Handler sayisi buyumus durumda; route bazli ownership net ama test eksigi nedeniyle bu buyuk yuzey regression'a acik.

### 6.3 Sonuc

Backend artik "MVP backend" degil, "buyuyen urun backend'i" seviyesinde. Bundan sonraki dogru odak yeni endpoint eklemekten cok:

- PG ve handler testleri,
- release environment sertligi,
- config/fallback disiplinidir.

---

## 7. Mobil Frontend Analizi

### 7.1 Guclu yanlar

- Expo Router yapisi oturmus.
- Auth, role shell, API client, push, offline utility, AI modal ve ana rol ekranlari mevcut.
- `typecheck + vitest` zinciri calisiyor; `export:web` ayrica smoke script'i icinde periyodik kosulmali.
- Forgot/reset, push provider ve notification preference capability'leri artik uygulamada var.

### 7.2 Acik alanlar

- Test kapsami utility agirlikli; ekran ve route smoke seviyesi dusuk.
- Native release davranisi bu analizde dogrulanmadi; bu turda TypeScript sagligi ve vitest dogrulandi.
- Principal tarafinda yeni life/services ekranlari ve ilgili API tipleri aktif gelisimde; bu alan daha oynak.

### 7.3 Sonuc

Mobil uygulama "devam edilmeli mi?" asamasini gecmis. Simdi konu yon secmek degil, kalite setini yukari cekmek.

Dogru kisa vadeli hedef:

- ekran smoke testleri,
- native build smoke,
- aktif gelisen principal/teacher modullerinin stabilize edilmesi.

---

## 8. Web Frontend Notu

Bu raporun ana odagi mobil ve backend olsa da, web panel sistemin operasyon merkezidir ve bugunku tabloyu dogrudan etkiliyor.

Bugunku kisa durum:

- Web panel buyuk ve islevsel bir yuzeye sahip.
- E2E altyapisi ve ilk smoke senaryosu var.
- Auth forgot/reset ekranlari ve role dashboard yuzeyleri mevcut.

Kalan problem:

- Test kapsami uygulama olcegine gore halen dar.

Yani web icin bugunku problem "ekran yoklugu" degil, "otomatik guvence kapsami"dir.

---

## 9. Oncelikli Aksiyon Listesi

### Sprint 1

1. [x] In-memory fallback davranisini explicit flag'e bagla.
2. [x] `go.mod` bagimlilik duzenini temizle.
3. [x] Servis/ulasim endpoint'leri icin handler smoke testleri ekle.
4. [x] Observation, guidance, auth reset ve push endpoint'leri icin ilk handler testlerini ekle.
5. [ ] Scheduling, announcement, academic, billing, life ve super admin endpoint'leri icin handler testlerini genislet.

### Sprint 2

1. PostgreSQL smoke/integration suite ekle.
2. Web Playwright smoke kapsamını principal, guidance ve auth akislarina genislet.
3. Mobil icin Expo web smoke veya Maestro tabanli temel senaryolari ekle.

### Sprint 3

1. Aktif gelisimdeki billing, transport ve life modullerini stabil milestone'a bagla.
2. Release checklist ve dokuman snapshot surecini branch/tag bazli hale getir.

---

## 10. Son Karar

Bugunku analizle en dogru durum ifadesi su:

- Sistem teknik olarak ciddi mesafe almis durumda.
- Eski analizlerdeki bircok "kritik eksik" kapanmis.
- Kalan ana riskler artik feature eksigi degil; test guvencesi, aktif gelisim oynakligi, gercek PostgreSQL entegrasyon kapsami ve release sertligidir.

Bu nedenle bir sonraki teknik hedef yeni buyuk modul acmaktan once **guvence katmanini kalinlastirmak** olmalidir.
