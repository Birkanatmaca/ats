# Mobil Frontend Devam Analizi ve Future Yol Haritasi

> Tarih: 2026-06-02  
> Kapsam: `frontend/apps/mobile`, mobil web deploy dosyalari, ilgili web/backend API bagimliliklari ve `docs/18` sonrasi durum.  
> Hedef: Mobil frontend icin "devam mi?", hangi eksikler once kapanmali ve Faz 3/future ozellikleri hangi sirayla alinmali sorularini netlestirmek.

---

## 1. Kisa Karar

**Devam edilmeli, fakat dogrudan yeni future ozelliklerine gecilmemeli.** Mobil uygulama artik prototip degil; Expo Router, rol bazli shell, API client, SecureStore oturum, ogta.ai sheet ve dort ana rol icin gercek API'ye bagli ekranlar var. Ancak su an release karari icin uc temel kosul eksik:

1. Mobil TypeScript derlemesi gecmiyor.
2. Auth reset akisi mobilde ve backend public path tarafinda tamam degil.
3. Push/EAS/test altyapisi olmadan Faz 3'e gecmek riskli.

Onerilen karar:

- **Kisa vadede:** 1 stabilizasyon sprint'i.
- **Sonra:** Faz 3'e kontrollu gecis: push bildirimleri, EAS build, ogrenci import, tablet program builder.
- **Daha sonra:** offline yoklama, native share/export, gelismis rehberlik vaka dosyasi, paketlenebilir premium mobile moduller.

---

## 2. Mevcut Durum Ozeti

Mobil uygulama `frontend/apps/mobile` altinda Expo / React Native uygulamasi olarak konumlanmis.

| Alan | Durum | Kanit |
|------|-------|-------|
| Framework | Expo 56, React Native 0.85, React 19 | `frontend/apps/mobile/package.json` |
| Routing | Expo Router, `(auth)` ve `(app)` gruplari | `frontend/apps/mobile/app` |
| Rol shell | `principal`, `teacher`, `guardian`, `guidance`, `super_admin_blocked` | `src/shared/auth/roleRoutes.ts` |
| State/API | TanStack Query + merkezi `api` client | `src/shared/api/client.ts` |
| Oturum | SecureStore/native, localStorage/web fallback | `src/shared/auth/session.ts` |
| UI kit | `Screen`, `BottomSheet`, `StatCard`, `ListCard`, `SearchBar` | `src/shared/ui` |
| Mobil web deploy | Docker + nginx + `mobile.ogtasis.com` deploy script'i | `frontend/apps/mobile/Dockerfile`, `deploy/scripts/deploy-mobile-and-ssl.mjs` |
| Native release | Eksik | `eas.json` bulunmuyor |
| Test | Eksik | Mobil test/spec dosyasi ve test script'i yok |

---

## 3. Rol Bazli Feature Envanteri

### 3.1 Auth

Tamamlanan:

- Login.
- Ilk giris sifre degistirme.
- RoleGate: `principal/system_admin`, `teacher`, `guardian`, `guidance`.
- `super_admin` icin mobil bloklama/web panel yonlendirmesi.
- Access token otomatik refresh denemesi.

Eksik:

- Mobil `forgot-password` ve `reset-password` ekranlari yok.
- Mobil `api` client icinde forgot/reset wrapper'i yok.
- Backend handler var ama `middleware.JWTAuth` public path listesi `forgot/reset` icermiyor; anonim kullanici bu endpoint'lere erisemez.

Karar:

- Faz 3'e gecmeden once auth akisi tamamlanmali. Sifre reset eksigi release kalitesini direkt etkiler.

### 3.2 Mudur / System Admin

Tamamlanan:

- Genel dashboard: KPI, okul ozeti, operasyon kartlari.
- Ogrenci listesi, arama, filtre, ogrenci ekleme/guncelleme/pasiflestirme.
- Sinif ve sube listesi, drilldown.
- Gunluk yoklama ozeti ve sinif yoklama kaydi.
- Ogretmen listesi, ogretmen provision, sifre reset.
- Program goruntuleme, ders saat ihtiyaclari, generate/validate/publish, ders guncelleme.
- Duyuru olusturma.
- Bildirim, destek, profil.

Eksik/kismi:

- Sinif/sube olusturma veya duzenleme mobilde yok.
- Ogrenci import endpoint'i var, mobil UI yok.
- Ogretmen guncelleme/brans/ders yetkinligi UI yok.
- Teacher availability UI yok; `listTeacherAvailabilities` var ama mobilde save wrapper/UI yok.
- Duyuru hedefleme sadece `all`, `teachers`, `guardians`; sinif/ogrenci hedefleme yok.
- Tam program builder telefon icin uygun degil; tablet/full-screen ayrimi henuz yok.

Karar:

- Mudur mobil operasyon icin yeterli seviyeye gelmis.
- Agir yonetim isleri icin iki kanal ayrilmali: telefon = hizli operasyon, tablet/web = builder/import/toplu isler.

### 3.3 Ogretmen

Tamamlanan:

- Genel ekran, bugunku ders ve aktif ders karti.
- Derslerim/haftalik ajanda.
- Yoklama oturumu acma, kayit guncelleme, finalize, reopen.
- Ogrenci arama ve durum isaretleme.
- Gozlem listesi ve yeni gozlem ekleme.
- Duyuru, bildirim, destek, profil.
- ogta.ai prompt strip ve global sheet.

Eksik/kismi:

- Offline yoklama kuyrugu yok.
- Kirli yoklama state'i icin route exit/back prevention gorunmuyor.
- Yoklama kaydi optimistic UX var, fakat network kopmasi/kismi basarisizlik icin kalici kuyruk yok.
- Ders penceresi disinda buton state'i var; bunun test guvencesi yok.

Karar:

- Ogretmen P0 akisi iyi yonde. En buyuk future degeri offline yoklama ve push hatirlatmalaridir.

### 3.4 Veli

Tamamlanan:

- Cocuk secici.
- Genel ekran.
- Ogrencim detayi.
- Program.
- Devamsizlik.
- Veli duyuru ve bildirimleri.
- Destek ve profil.

Eksik/kismi:

- Programi indir/yazdir/paylas yok.
- Veli CRUD, veli-ogrenci iliski yonetimi ve toplu veli daveti mobilde yok.
- Push bildirim kaydi yok; veli icin devamsizlik anlik bildirimi mobil future olarak duruyor.

Karar:

- Veli mobil bilgi mimarisi sade ve dogru. Bir sonraki degerli artis push + native share/export.

### 3.5 Rehberlik

Tamamlanan:

- Genel KPI ekranlari.
- Ogrenci listesi ve ogrenci detay stack'i.
- Gozlem listesi.
- Rehberlik notu ekleme/guncelleme/silme.
- Destek plani ekleme, durum guncelleme, silme.
- Risk takipleri.
- ogta.ai rehberlik ve ogrenci analiz promptlari.

Kritik eksik/risk:

- `GuidanceService.ListNotes/ListPlans/ListRiskTrackings` `userID` almiyor; mobil ekranlar genel liste cagiriyor. Eger rehberlik personeli kapsamli calisacaksa bu hassas veriyi fazla genis gosterebilir.
- `UpdateNote/DeleteNote/UpdatePlan/DeletePlan/DeleteRiskTracking` scope/owner kontrolu yapmiyor; handler sadece rehberlik/principal/system_admin rolunu kontrol ediyor.
- Rehberlik query cache'i persist edilmiyor, bu iyi; ancak app background/focus degisiminde hassas cache temizleme politikasi yok.
- Vaka dosyasi/tekil case modeli yok; not, plan, risk ve gorusme kayitlari bir arada vaka akisi olarak modellenmemis.

Karar:

- Rehberlik future'larina gecmeden once scope/owner policy ve testler kapatilmali.

### 3.6 Ortak Moduller

Tamamlanan:

- Duyurular.
- Bildirim inbox, okundu isaretleme, silme.
- Destek talebi olusturma.
- Profil, avatar secme/cekme, tema aksani.
- ogta.ai modal/sheet, candidate cards, pending action confirm/cancel.

Eksik/kismi:

- Push notification registration yok.
- Device token API wrapper'i yok.
- Bildirimler sadece uygulama ici inbox seviyesinde.
- Test kapsami yok.
- Erişilebilirlik etiketleri bazi ortak butonlarda var, ancak tum pressable/form kontrollerinde tutarli degil.

---

## 4. P0 Blokerler

### P0.1 TypeScript derlemesi gecmiyor

Calistirilan komut:

```bash
cd frontend/apps/mobile
npm exec tsc -- --noEmit
```

Sonuc: basarisiz.

Hatalar:

- `app/(auth)/first-login.tsx`: `router.replace(shellHref(shell))` typed route ile uyumsuz.
- `app/(auth)/login.tsx`: `router.replace(shellHref(shell))` typed route ile uyumsuz.
- `app/index.tsx`: `Redirect href={shellHref(shell)}` typed route ile uyumsuz.
- `app/(auth)/login.tsx`: `StyleSheet.absoluteFillObject` TypeScript tarafinda yok; mevcut RN tipinde `absoluteFill` oneriliyor.
- `src/features/ai/OgtaAiContext.tsx`: `pendingAction` prop'u `undefined` olabilir, component tipi `AiPendingActionSummary | null` bekliyor.

Karar:

- Yeni feature'a gecmeden once typecheck yesile alinmali.
- `package.json` icine `typecheck` script'i eklenmeli.
- CI veya en azindan deploy script'i typecheck'i zorunlu kosmali.

### P0.2 Sifre reset akisi uc uca tamam degil

Backend:

- `POST /api/v1/auth/password/forgot` ve `POST /api/v1/auth/password/reset` route olarak var.
- `backend/internal/http/middleware/auth.go` public path listesi bunlari icermiyor.

Mobil:

- `(auth)` altinda sadece `login` ve `first-login` var.
- Client wrapper yok.

Karar:

- Public path listesi guncellenmeli.
- Mobil forgot/reset ekranlari eklenmeli.
- Web ve mobile icin smoke test eklenmeli.

### P0.3 Rehberlik hassas veri scope politikasi net degil

Observation tarafinda role filter/policy eklenmis gorunuyor. Ancak rehberlik notlari, planlari ve risk takipleri icin list/update/delete yollarinda kullanici scope'u net uygulanmiyor.

Risk:

- Kapsamli calisan rehberlik personeli kendi ogrenci kapsamindan fazlasini gorebilir veya degistirebilir.
- ogta.ai future tool'lari bu endpoint'lere baglaninca risk buyur.

Karar:

- `ListNotes/ListPlans/ListRiskTrackings` imzalarina principal/user scope eklenmeli.
- Update/delete icin `CanAccessStudent` veya owner/policy kontrolu uygulanmali.
- Integration test olmadan rehberlik AI/future genisletmesi yapilmamali.

---

## 5. P1 Eksikler

### 5.1 Push notification

Mevcut:

- Dokumanlarda push planli.
- Mobil `package.json` icinde `expo-notifications` yok.
- Device token kayit akisi ve API wrapper yok.

Gereken:

- `expo-notifications` kurulumu.
- iOS/Android izin akisi.
- Device token register/unregister endpoint'i.
- Devamsizlik, duyuru, destek, ogta.ai aksiyon sonuc event'leri.

### 5.2 EAS/native release

Mevcut:

- `app.json` var.
- Docker web export var.
- `eas.json` yok.

Gereken:

- `eas.json` profiles: development, preview, production.
- bundle identifier / package name.
- env ayrimi: local, staging, production.
- app store/internal distribution karar dokumani.

### 5.3 Test ve kalite kapisi

Mevcut:

- Mobil test dosyasi yok.
- `test`, `typecheck`, `lint` script'i yok.
- Web tarafinda Playwright var, mobile icin yok.

Gereken:

- Minimum unit/component testleri: auth redirect, role shell, query error state, attendance status reducer.
- E2E secimi: Expo web icin Playwright smoke + native icin Maestro veya Detox.
- Deploy oncesi: `npm exec tsc -- --noEmit`, `npm run export:web`, temel route smoke.

### 5.4 Offline yoklama

Mevcut:

- TanStack Query var, persist/offline queue yok.
- `AsyncStorage`, `NetInfo` veya queue altyapisi gorunmuyor.

Gereken:

- Yoklama draft'ini lesson/session bazinda local queue'ya yazma.
- Online olunca replay.
- Conflict kuralı: finalized session, reopen, window closed durumlari.
- UI: "senkron bekliyor", "cakisma var", "tekrar dene".

### 5.5 Tablet program builder

Mevcut:

- `ios.supportsTablet = true`.
- Program ekrani telefonda generate/validate/publish ve lesson modal tasiyor.

Eksik:

- Tablet icin split layout/full-screen grid yok.
- Teacher availability editor yok.
- Subject/class requirement full editor sinirli.

Karar:

- Telefon builder'i daha fazla sisirilmemeli.
- Tablet route veya responsive variant eklenmeli.

### 5.6 Toplu import/export/share

Eksik:

- Ogrenci import UI.
- Veli programini paylas/export.
- Yoklama/rapor export.
- Native document picker/share entegrasyonu.

Karar:

- Import agir operasyon oldugu icin once webde kalabilir.
- Mobilde sadece "dosya sec + preview + hata listesi" seklinde P2 alinmali.

---

## 6. Future Ozellik Sirasi

### Faz 3A - Stabilizasyon ve release hazirligi

1. TypeScript hatalarini kapat.
2. `typecheck` script'i ekle.
3. Auth forgot/reset mobil + backend public path fix.
4. Rehberlik scope/update/delete policy testleri.
5. Expo web export smoke.
6. EAS config ve preview build.

### Faz 3B - Bildirim ve dagitim

1. `expo-notifications`.
2. Device token kaydi.
3. Devamsizlik push.
4. Duyuru push.
5. Destek talebi durum push.
6. Bildirim tercihleri.

### Faz 3C - Operasyon derinligi

1. Offline yoklama kuyrugu.
2. Ogrenci import mobil preview.
3. Ogretmen availability editor.
4. Sinif/sube create/update.
5. Veli iliski yonetimi.

### Faz 3D - Tablet ve premium future

1. Tablet program builder.
2. Rehberlik vaka dosyasi.
3. Haftalik mudur AI raporu.
4. Veli program share/export.
5. Akademik gelisim, yemek, servis, etut gibi premium modullerin mobil okuyucu ekranlari.

---

## 7. Oncelikli Gorev Listesi

| Oncelik | Gorev | Neden |
|---------|-------|-------|
| P0 | Mobil typecheck hatalarini kapat | Derleme kalitesi olmadan release/future riskli |
| P0 | Auth forgot/reset public + mobil ekran | Kullanici hesap kurtarma temel urun ihtiyaci |
| P0 | Rehberlik note/plan/risk scope policy | Hassas veri ve AI tool genisletmesi icin zorunlu |
| P1 | `typecheck`/`export:web` kalite kapisi | Deploy oncesi regresyon yakalamak icin |
| P1 | Push notification altyapisi | Mobilin asil degeri anlik bildirim |
| P1 | EAS preview build | Native dagitim stratejisi icin |
| P1 | Offline yoklama tasarimi | Ogretmen akisini gercek okul ortaminda guclendirir |
| P2 | Tablet program builder | Telefon yerine uygun ekran form factor |
| P2 | Ogrenci import mobil preview | Mudur operasyonunu tamamlar |
| P2 | Veli share/export | Veli deneyimini tamamlar |

---

## 8. Devam Kriterleri

Faz 3'e gecmek icin minimum kabul:

- `npm exec tsc -- --noEmit` basarili.
- Login, first-login, forgot, reset mobilde calisir.
- Rehberlik hassas endpoint'leri scope testlerinden gecer.
- En az bir mobil smoke test seti vardir.
- EAS preview build alinabilir.
- Push notification icin mimari karar ve device token endpoint'i hazirdir.

Bu kriterler saglanmadan ek future ozelligi acmak teknik borcu buyutur.

---

## 9. Sonuc

Mobil frontend **devam etmeye deger** ve Faz 0-2 hedeflerinin buyuk bolumu uygulanmis. Ancak sonraki is "daha cok ekran eklemek" degil, once mobil uygulamayi release edilebilir hale getirmek olmali. En dogru siralama:

1. Derleme/auth/security scope blokerlerini kapat.
2. Test ve EAS kalite kapisini kur.
3. Push bildirimleri ekle.
4. Offline yoklama ve tablet builder gibi future ozelliklere gec.

