# Mobil Dashboard Analizi ve UI Planı

> Tarih: 2026-05-28  
> Kapsam: Süper admin hariç tüm rol dashboardlarının mobil React Native / Expo uygulamasına taşınması.  
> Roller: `principal`, `system_admin`, `teacher`, `guardian`, `guidance`.  
> Referans kod: `frontend/apps/web/src/role-dashboard`, `frontend/apps/web/src/lib/api.ts`.

---

## 1. Yönetici Özeti

Mobil uygulama web panelin birebir küçültülmüş hali olmamalı. Web tarafında rol konsolları sidebar, geniş tablo, grafik ve modal ağırlıklı. Mobil tarafta aynı işlevleri daha kısa görev akışlarına bölmek gerekiyor:

- **Müdür / system_admin:** okul operasyon özeti, öğrenci-sınıf yönetimi, yoklama raporu, duyuru, program izleme. Ders programı oluşturucu ilk mobil sürümde sınırlı tutulmalı.
- **Öğretmen:** bugünkü ders, hızlı yoklama, gözlem ekleme, duyuru ve bildirim. En kritik akış yoklamadır.
- **Rehberlik:** öğretmen gözlemleri, risk sinyalleri, öğrenci destek durumu, rehberlik notu ve takip planı. Hassas veri cache politikası ayrı ele alınmalı.
- **Veli:** çocuk seçimi, ders programı, devamsızlık, duyuru, bildirim ve destek talebi. En sade bilgi mimarisi burada olmalı.
- **Ortak:** login, ilk giriş şifre değişimi, profil, bildirim, destek talebi, `ogta.ai` asistanı.

Aktif web kaynakları şunlardır:

| Rol | Aktif kaynak | Not |
|-----|--------------|-----|
| Müdür / system_admin | `principal/PrincipalConsole.tsx` | Webde en kapsamlı konsol. Mobilde bazı yönetim ekranları sadeleştirilmeli. |
| Öğretmen | `teacher/TeacherConsole.tsx` | Ana akışlar API'ye bağlı. `TeacherDashboard.tsx` legacy ve demo veri içeriyor. |
| Veli | `guardian/GuardianConsole.tsx` | Çocuk seçici ve veliye özel API kullanıyor. `GuardianDashboard.tsx` legacy ve hardcoded veri içeriyor. |
| Rehberlik | `guidance/GuidanceConsole.tsx` | Not, risk, takip planı ve gözlem akışları aktif kaynak. |

`RoleDashboardShell.tsx` ve `role-dashboard/pages/*Dashboard.tsx` eski/fallback deneyim olarak duruyor. Mobil uygulama için kaynak alınmamalı.

---

## 2. Expo / React Native Kararı

Expo ile başlamak mantıklı. Bu ürün için native donanım ihtiyacı düşük; asıl ihtiyaç güvenli token saklama, push bildirim, hızlı form/list ekranları ve EAS ile dağıtım.

Önerilen temel:

- **Expo Router:** dosya bazlı route yapısı ve nested layout yönetimi için.
- **TanStack Query:** server state, cache, optimistic update ve retry yönetimi için.
- **React Hook Form + Zod:** formlar ve validasyon için.
- **Expo SecureStore:** access/refresh token saklama için.
- **Expo Notifications:** yoklama, duyuru ve destek bildirimleri için.
- **EAS Build:** iOS/Android build ve iç dağıtım için.

Resmi referanslar:

- [Expo Router](https://docs.expo.dev/router/introduction)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications)
- [EAS Build](https://docs.expo.dev/build)

---

## 3. Mobil Bilgi Mimarisi

### 3.1 Genel navigasyon modeli

Webde her rolün sidebar menüsü var. Mobilde her role özel **bottom tab + More ekranı + stack detayları** kullanılmalı.

Ana kabuk:

```text
AppRoot
  AuthStack
    Login
    FirstLoginPassword
    ForgotPassword
    ResetPassword
  AppStack
    RoleGate
    RoleTabs
    ModalSheets
    OgtaAiSheet
```

Önerilen dosya yapısı:

```text
frontend/
  apps/
    mobile/
      app/
        (auth)/
          login.tsx
          first-login.tsx
          forgot-password.tsx
          reset-password.tsx
        (app)/
          _layout.tsx
          index.tsx
          principal/
          teacher/
          guardian/
          guidance/
      src/
        features/
          auth/
          principal/
          teacher/
          guardian/
          guidance/
          announcements/
          notifications/
          support/
          profile/
          ogta-ai/
        shared/
          api/
          auth/
          ui/
          utils/
```

### 3.2 Rol bazlı tab önerisi

| Rol | Bottom tab | More / stack içinde |
|-----|------------|---------------------|
| Müdür / system_admin | Genel, Öğrenciler, Sınıflar, Yoklama, Daha Fazla | Öğretmenler, Program, Operasyon, Duyurular, Bildirimler, Destek, Profil |
| Öğretmen | Genel, Dersler, Yoklama, Gözlemler, Daha Fazla | Duyurular, Bildirimler, Destek, Profil |
| Rehberlik | Genel, Öğrenciler, Riskler, Notlar, Daha Fazla | Gözlemler, Takip planları, Duyurular, Bildirimler, Destek, Profil |
| Veli | Genel, Öğrencim, Program, Devamsızlık, Daha Fazla | Duyurular, Bildirimler, Destek, Profil |

`ogta.ai` her rolde sağ alt FAB yerine mobilde:

- küçük global FAB,
- veya tab bar üstünde floating action,
- açılınca full-height bottom sheet.

---

## 4. Mevcut Web Dashboard Envanteri

### 4.1 Müdür / system_admin

Kaynak: `principal/PrincipalConsole.tsx`  
Tablar: `overview`, `teachers`, `students`, `classes`, `attendance`, `schedule`, `operations`, `announcements`, `profile`

| Ekran | Web işlevi | API / veri | Mobil karşılık | Öncelik |
|-------|------------|------------|----------------|---------|
| Genel | KPI, program uyarısı, yoklama/risk grafikleri, operasyon yoğunluğu | `tenant`, `dashboard`, `schedule`, `announcements` | 2 kolon KPI, program uyarı kartı, sınıf devamsızlık mini barları, öncelikli operasyon listesi | P0 |
| Öğretmenler | öğretmen listesi, branş/sınıf filtresi, ekle/düzenle, şifre sıfırla | `principalTeachers`, `listTeachers`, `provisionTeacher`, `resetTeacherPassword`, `updateTeacher` | öğretmen kart listesi, filtre bottom sheet, ekle/düzenle sheet, geçici şifre sheet | P1 |
| Öğrenciler | öğrenci listesi, filtre, ekle/düzenle, import, devamsızlık özeti | `principalRoster`, `createStudent`, `patchStudent`, `importStudents`, `studentAttendanceSummary` | öğrenci kart listesi, arama, sınıf/durum filtresi, detay sheet, ekle/düzenle sheet | P0 |
| Sınıflar | sınıf kartları, şube kartları, şube/öğrenci detayına geçiş | `principalRoster`, `createClass`, `assignClassStudent` | class stack: sınıflar -> şubeler -> şube öğrencileri | P0 |
| Yoklama | tarihe göre şube tamamlama ve öğrenci durumları | `attendanceToday`, `dashboard` | günlük özet, şube listesi, şube drilldown, durum chipleri | P0 |
| Program | aktif program görünümü, builder, kayıtlı programlar, öğretmen yükü | `schedule`, `generateSchedule`, `validateSchedule`, `publishSchedule`, `updateScheduleLesson` | P0 read-only program, P1 hızlı oluştur/yayınla, P2 tam builder/tablet | P0/P2 |
| Operasyon | öncelikli aksiyon listesi ve hedef route | `dashboard.operations` | aksiyon kartları, ilgili ekrana deep link | P1 |
| Duyurular | duyuru oluşturma, hedef kitle/sınıf seçimi, liste | `announcements`, `createAnnouncement` | duyuru listesi ve oluşturma sheet | P0 |
| Profil | kendi profili + müdür için tenant kullanıcı düzenleme | `profile`, `principalUsers`, `updatePrincipalUser`, `updateProfile` | profil ve görünüm; tenant kullanıcı düzenleme P2 | P1/P2 |

Mobilde dikkat:

- Program builder webde geniş tablo ve local draft kullanıyor. Telefonda tam sürüm zor; ilk sürümde "aktif programı görüntüle", "program oluştur", "validate/publish" yeterli olabilir.
- Öğrenci import mobilde dosya seçimi/Excel parse gerektirir. P2'ye bırakılmalı veya web yönlendirmesi yapılmalı.
- Web `PrincipalConsole` içinde route olarak `notifications` ve `support` yok; fakat ortak navbar bildirim bileşeni `/dashboard/notifications` yoluna gidebiliyor. Mobilde bu tutarsızlık giderilmeli: ya müdüre bildirim/destek ekranı eklenmeli ya da bildirim kısayolu gizlenmeli.

### 4.2 Öğretmen

Kaynak: `teacher/TeacherConsole.tsx`  
Tablar: `overview`, `lessons`, `attendance`, `observations`, `announcements`, `notifications`, `support`, `profile`

| Ekran | Web işlevi | API / veri | Mobil karşılık | Öncelik |
|-------|------------|------------|----------------|---------|
| Genel | bugünkü ders, aktif sınıf, yoklama bekleyen, son gözlem, duyuru | `teacherCalendar`, `currentLesson`, `announcements`, `observations`, `teacherStudents` | günün ilk ekranı; aktif ders ve "Yoklamayı aç" CTA en üstte | P0 |
| Derslerim | haftalık takvim ve günlük tablo | `teacherCalendar` | dikey gün ajandası, gün chipleri, haftalık kompakt görünüm | P0 |
| Yoklama | sınıf/ders seç, liste aç, durum işaretle, hepsi geldi, finalize/reopen | `currentLesson`, `createAttendanceSession`, `getAttendanceSessionByLesson`, `updateAttendanceRecords`, `finalizeAttendanceSession`, `reopenAttendanceSession` | tek elle hızlı işaretleme, öğrenci arama, sticky tamamla butonu, optimistic update | P0 |
| Gözlemler | öğretmenin gözlem listesi, filtre, yeni gözlem formu | `observations`, `teacherStudents`, `createObservation` | öğrenci seç + kategori + not sheet; gözlem listesi kartları | P0 |
| Duyurular | hedef kitle filtreli duyuru listesi | `announcements` | duyuru kart listesi | P1 |
| Bildirimler | okundu/okunmadı, tür filtresi, tümünü okundu yap | `notifications`, `notificationMarkRead` | bildirim inbox | P1 |
| Destek | destek talebi listesi ve yeni talep | `supportTickets`, `createSupportTicket` | destek talebi sheet | P1 |
| Profil | profil görseli/tema, temel hesap bilgisi | `profile`, `updateProfile` | profil düzenleme | P1 |

Mobilde dikkat:

- Yoklama penceresi webde ders başlangıcından 10 dk önce ve bitişinden 10 dk sonrasına bağlı. Mobilde bu bilgi buton durumlarında çok net gösterilmeli.
- Webde `beforeunload` ile kaydedilmemiş yoklama uyarısı var. Mobilde ekran çıkışında `dirty state` kontrolü ve confirmation sheet gerekiyor.
- `TeacherDashboard.tsx` legacy bileşeni `demoStudents` kullanıyor; mobilde kullanılmamalı.

### 4.3 Rehberlik

Kaynak: `guidance/GuidanceConsole.tsx`  
Tablar: `overview`, `observations`, `notes`, `students`, `risks`, `plans`, `announcements`, `notifications`, `support`, `profile`

| Ekran | Web işlevi | API / veri | Mobil karşılık | Öncelik |
|-------|------------|------------|----------------|---------|
| Genel | gözlem, not, risk, destek kapsamı, açık plan KPI'ları | `observations`, `guidanceStudents`, `guidanceNotes`, `supportPlans`, `announcements` | risk ve takip odağı olan dashboard | P0 |
| Öğretmen gözlemleri | kategori/sınıf/tarih/arama filtreleri, hassasiyet | `observations`, `observationsFiltered` | gözlem kart listesi, filtre sheet, hassasiyet rozetleri | P0 |
| Rehberlik notları | not listesi, not ekle, tür/öğrenci/tarih filtreleri, sil | `guidanceNotes`, `createGuidanceNote`, `deleteGuidanceNote` | hassas not kartları, oluşturma sheet, silme confirmation | P0 |
| Öğrenciler | destek durumuna göre öğrenci listesi, not/plan/risk sayıları | `guidanceStudents`, türetilmiş `observations`, `notes`, `plans` | öğrenci destek listesi, öğrenci detay stack | P0 |
| Riskler | risk seviyesi/kategori/sınıf arama, sinyal sayıları | `observations` türetilmiş riskler | risk inbox, yüksek öncelik en üstte | P0 |
| Takip planları | plan listesi, durum güncelle, yeni plan, sil | `supportPlans`, `createSupportPlan`, `updateSupportPlan`, `deleteSupportPlan` | plan kartları, durum segmented control, plan sheet | P0 |
| Duyurular | ortak duyuru listesi | `announcements` | duyuru listesi | P1 |
| Bildirimler | ortak bildirim merkezi | `notifications`, `notificationMarkRead` | bildirim inbox | P1 |
| Destek | destek talebi | `supportTickets`, `createSupportTicket` | destek sheet | P1 |
| Profil | profil | `profile`, `updateProfile` | profil | P1 |

Mobilde dikkat:

- Rehberlik verisi hassas. Notlar ve destek planları için uzun süreli local persist yapılmamalı; query cache kısa tutulmalı ve logout'ta temizlenmeli.
- Tablo yerine öğrenci/risk/not kartları kullanılmalı. Uzun metinler başlangıçta 2-3 satır, detayda tam metin.
- `buildGuidanceRiskSignals` şu an frontendde gözlemlerden risk sinyali türetiyor. Mobilde de aynı helper shared pakete alınmalı veya backend endpoint'e taşınmalı.

### 4.4 Veli

Kaynak: `guardian/GuardianConsole.tsx`  
Tablar: `overview`, `child`, `schedule`, `attendance`, `announcements`, `notifications`, `support`, `profile`

| Ekran | Web işlevi | API / veri | Mobil karşılık | Öncelik |
|-------|------------|------------|----------------|---------|
| Genel | öğrenci, haftalık ders, devamsızlık, bildirim, duyuru | `guardianStudents`, `guardianStudentSchedule`, `guardianStudentAttendance`, `guardianAnnouncements`, `guardianNotifications` | veli ana ekranı, çocuk seçici üstte | P0 |
| Öğrencim | öğrenci profili, katılım oranı, kayıt bilgisi, son bildirimler | aynı guardian API'leri | çocuk detay kartı, çok çocuk için selector | P0 |
| Program | haftalık takvim/liste, indir/yazdır | `guardianStudentSchedule` | günlük/haftalık ajanda; indir/yazdır P2 | P0 |
| Devamsızlık | geldi/gelmedi/geç/izinli dağılımı ve kayıt listesi | `guardianStudentAttendance` | donut + status filter + kayıt listesi | P0 |
| Duyurular | veliye açık duyurular | `guardianAnnouncements` | duyuru kart listesi | P0 |
| Bildirimler | veli bildirimleri, okundu işaretle | `guardianNotifications`, `guardianNotificationMarkRead` | bildirim inbox | P0 |
| Destek | destek talebi | `supportTickets`, `createSupportTicket` | destek sheet | P1 |
| Profil | profil görünümü | `profile`, `updateProfile` | profil | P1 |

Mobilde dikkat:

- Çocuk seçici webde navbar içinde. Mobilde app bar altında segment/dropdown olarak durmalı ve tüm child scoped ekranları otomatik yenilemeli.
- Veli hiçbir rehberlik notu veya ham öğretmen gözlemi görmemeli.
- `GuardianDashboard.tsx` legacy bileşenindeki hardcoded öğrenci/veri kullanılmamalı.

---

## 5. Ortak Ekranlar ve Bileşenler

### 5.1 Auth

Web akışı:

- `/login`
- `/first-login`
- `/forgot-password`
- `/reset-password`
- bakım modu kontrolü

Mobil karşılığı:

- Login formu
- İlk giriş şifre değiştirme zorunluluğu
- Şifremi unuttum / token ile reset
- Maintenance ekranı
- Token refresh akışı

Token saklama:

- Webde `localStorage` kullanılıyor.
- Mobilde `expo-secure-store` kullanılmalı.
- Access token memory + SecureStore, refresh token SecureStore yaklaşımı tercih edilmeli.
- Logout tüm query cache'i ve SecureStore kayıtlarını temizlemeli.

### 5.2 Duyurular

Kaynak: `RoleAnnouncementsPage.tsx` ve `PrincipalAnnouncementsPage.tsx`

Mobil bileşenleri:

- `AnnouncementCard`
- hedef kitle rozeti
- arama
- hedef kitle filtresi
- müdür için "Yeni duyuru" sheet

### 5.3 Bildirimler

Kaynak: `RoleNotificationsPage.tsx`, `NotificationBell.tsx`

Mobil bileşenleri:

- unread badge
- notification inbox
- tür filtresi
- okundu işaretleme
- tümünü okundu yap
- push notification registration

### 5.4 Destek

Kaynak: `RoleSupportPage.tsx`

Mobil bileşenleri:

- ticket status KPI
- ticket kart listesi
- yeni destek talebi sheet
- status/type filtresi

### 5.5 Profil

Kaynak: `ProfilePage.tsx`

Mobil bileşenleri:

- avatar ve tema rengi
- hesap bilgileri
- yöneticiler için kullanıcı seçimi P2
- görsel yükleme için `expo-image-picker` değerlendirmesi

### 5.6 ogta.ai

Kaynak: `OgtaAiDock.tsx`

Mobil bileşenleri:

- `OgtaAiFab`
- `OgtaAiChatSheet`
- suggestion chips
- candidate choice cards
- pending action confirmation card

Dikkat:

- Webde SSE/streaming `fetch` reader ile yapılıyor. React Native tarafında streaming desteği test edilmeli. İlk mobil sürümde non-stream `sendAiMessage` fallback kabul edilebilir.
- Onay bekleyen işlemler her zaman açık, geri alınabilir bir confirmation sheet ile tamamlanmalı.

---

## 6. UI Dönüşüm Kuralları

| Web paterni | Mobil karşılık |
|-------------|----------------|
| Sidebar nav | Bottom tabs + More list |
| Geniş tablo | Kart listesi veya kompakt satır listesi |
| Tablo toolbar | Search input + filter bottom sheet |
| Modal | Bottom sheet veya full-screen form |
| Chart | Mini bar, donut, sparkline veya özet kart |
| Haftalık grid | Gün chipleri + dikey ajanda |
| Çok kolon KPI | 2 kolon grid veya yatay scroll |
| `window.confirm` | Native confirmation sheet/dialog |
| Dosya import / print / download | P2 native dosya/paylaşım akışı veya web yönlendirme |

Tasarım dili:

- Operasyonel, sade, hızlı taranabilir.
- Büyük hero/marketing düzeni yok.
- Kart radius maksimum 8px.
- İkonlar butonlarda metni desteklemeli.
- Kritik CTA'lar tek elle erişilebilir olmalı.
- Uzun listelerde `FlatList` veya yüksek hacimde `FlashList` değerlendirilmeli.

---

## 7. API Eşlemesi

### Ortak

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/password/first-login
POST   /api/v1/auth/password/forgot
POST   /api/v1/auth/password/reset
GET    /api/v1/me
GET    /api/v1/system/status
GET    /api/v1/tenants/current
GET    /api/v1/profile
PATCH  /api/v1/profile
GET    /api/v1/announcements
GET    /api/v1/notifications
PATCH  /api/v1/notifications/{id}/read
GET    /api/v1/support/tickets
POST   /api/v1/support/tickets
```

### Müdür / system_admin

```text
GET    /api/v1/dashboard/principal/summary
GET    /api/v1/principal/school/roster
GET    /api/v1/principal/teachers
POST   /api/v1/principal/teachers
GET    /api/v1/principal/users
PATCH  /api/v1/principal/users/{id}
GET    /api/v1/classes
POST   /api/v1/classes
PATCH  /api/v1/classes/{id}
POST   /api/v1/classes/{id}/students
GET    /api/v1/students
POST   /api/v1/students
PATCH  /api/v1/students/{id}
POST   /api/v1/students/import
GET    /api/v1/students/{id}/attendance-summary
GET    /api/v1/dashboard/attendance/today
GET    /api/v1/dashboard/classes/{classId}/summary
GET    /api/v1/schedules/current
POST   /api/v1/schedules/generate
POST   /api/v1/schedules/{id}/validate
POST   /api/v1/schedules/{id}/publish
PATCH  /api/v1/schedules/{id}/lessons/{lessonId}
POST   /api/v1/announcements
PATCH  /api/v1/announcements/{id}
```

### Öğretmen

```text
GET    /api/v1/teachers/me/calendar
GET    /api/v1/teachers/me/students
GET    /api/v1/attendance/current-lesson
POST   /api/v1/attendance/sessions
GET    /api/v1/attendance/sessions/by-lesson/{lessonId}
GET    /api/v1/attendance/sessions/{id}
PATCH  /api/v1/attendance/sessions/{id}/records
POST   /api/v1/attendance/sessions/{id}/finalize
POST   /api/v1/attendance/sessions/{id}/reopen
GET    /api/v1/observations
POST   /api/v1/observations
```

### Rehberlik

```text
GET    /api/v1/guidance/students
GET    /api/v1/guidance/notes
POST   /api/v1/guidance/notes
PATCH  /api/v1/guidance/notes/{id}
DELETE /api/v1/guidance/notes/{id}
GET    /api/v1/guidance/support-plans
POST   /api/v1/guidance/support-plans
PATCH  /api/v1/guidance/support-plans/{id}
DELETE /api/v1/guidance/support-plans/{id}
GET    /api/v1/observations
```

### Veli

```text
GET   /api/v1/guardian/me/students
GET   /api/v1/guardian/students/{studentId}/schedule
GET   /api/v1/guardian/students/{studentId}/attendance
GET   /api/v1/guardian/announcements
GET   /api/v1/guardian/notifications
PATCH /api/v1/guardian/notifications/{id}/read
```

### ogta.ai

```text
GET   /api/v1/ai/capabilities
POST  /api/v1/ai/conversations
POST  /api/v1/ai/conversations/{id}/messages
POST  /api/v1/ai/conversations/{id}/messages:stream
POST  /api/v1/ai/actions/{id}/confirm
POST  /api/v1/ai/actions/{id}/cancel
```

---

## 8. State ve Cache Planı

Önerilen query key standardı:

```text
auth.session
tenant.current
profile.me
notifications.list
announcements.list
support.tickets
principal.summary
principal.roster
principal.teachers
principal.attendanceToday:{date}
teacher.calendar
teacher.students
teacher.currentLesson
teacher.attendanceSession:{lessonId}
teacher.observations
guidance.students
guidance.observations
guidance.notes:{studentId?}
guidance.plans:{studentId?}
guardian.children
guardian.childSchedule:{studentId}
guardian.childAttendance:{studentId}
guardian.notifications
ai.capabilities
ai.conversation:{id}
```

Cache yaklaşımı:

- Dashboard özetleri: kısa stale time, pull-to-refresh.
- Yoklama oturumu: ekran açıkken canlı ve optimistic update.
- Rehberlik notları: kısa cache, logout ve app background sonrası temizleme opsiyonu.
- Veli program/devamsızlık: childId bazlı cache.
- Bildirimler: app focus olduğunda refetch.

---

## 9. MVP Fazları

### Faz 0: Mobil iskelet

- Expo app oluşturma.
- Auth, SecureStore, API client, refresh token.
- RoleGate ve rol bazlı tab layout.
- Ortak UI kit: `Screen`, `StatCard`, `ListCard`, `BottomSheet`, `EmptyState`, `ErrorState`, `SearchBar`, `FilterSheet`.

Kabul:

- Her rol login sonrası kendi mobil shell'ine düşer.
- Süper admin mobil uygulamada dashboarda alınmaz; açıklayıcı "web panel kullanın" ekranı gösterilir veya login engellenir.

### Faz 1: P0 rol akışları

- Öğretmen: genel, dersler, yoklama, gözlem ekleme.
- Veli: çocuk seçici, genel, program, devamsızlık.
- Rehberlik: genel, gözlem, risk, not.
- Müdür: genel, öğrenci/sınıf, yoklama.

Kabul:

- Webdeki ana P0 görevler telefonda tamamlanabilir.
- Listeler kartlaşır, tablolar doğrudan taşınmaz.
- Pull-to-refresh ve hata/boş durumlar vardır.

### Faz 2: Yönetim derinliği

- Müdür öğretmen yönetimi.
- Müdür program görüntüleme ve hızlı program oluştur/yayınla.
- Profil ve destek tüm rollerde tamamlanır.
- Bildirim merkezi tüm rollerde tutarlı hale gelir.
- ogta.ai mobil sheet eklenir.

Kabul:

- Müdür mobilde günlük operasyonu yönetebilir.
- `ogta.ai` onaylı işlemleri mobilde tamamlayabilir.

### Faz 3: Gelişmiş / tablet

- Ders programı builder'ın tablet/full-screen sürümü.
- Öğrenci import.
- Veli program indir/yazdır/paylaş.
- Rehberlik öğrenci detay dosyası.
- Push notification production entegrasyonu.

Kabul:

- Telefon ve tablet layoutları ayrışır.
- Webde kalan ağır yönetim işlerinin mobil karşılığı kontrollü şekilde eklenir.

---

## 10. Açık Riskler ve Kararlar

| Konu | Risk | Karar önerisi |
|------|------|---------------|
| Müdür bildirim route'u | Webde navbar bildirim yolu var ama principal route guard içinde `notifications` yok | Mobilde bildirim ekranı müdüre de eklensin; web de sonra hizalansın |
| Ders programı builder | Telefon ekranında geniş grid ve çok input yönetilemez | P0 read-only, P1 generate/publish, P2 tablet builder |
| SSE streaming | React Native ortamında webdeki reader akışı birebir çalışmayabilir | İlk sürüm non-stream fallback, sonra streaming test |
| Rehberlik cache | Hassas verinin cihazda uzun kalması | Kısa cache, persist yok, logout/focus policy |
| Excel import | Mobil dosya izinleri ve parse karmaşıklığı | P2 veya web-only |
| Yazdır/indir | Web API'leri native'de farklı | P2 native share/export |
| Legacy dashboardlar | Demo/hardcoded veri içeriyor | Mobilde sadece aktif konsollar kaynak alınsın |

---

## 11. İlk Tasarım Checklist'i

- [x] Her rol için 5 ana tab sınırı belirlendi (`src/shared/navigation/roleTabs.ts`).
- [x] Web tabloları kart/list şemasına çevrildi (`ListCard`, `StatCard`, `PlaceholderTab`).
- [x] P0 ekranların API query key'leri çıkarıldı (Bölüm 8).
- [x] Yoklama akışı için optimistic update ve dirty state tasarlandı (Bölüm 4.2, Faz 1).
- [x] Rehberlik hassas veri cache politikası yazıldı (Bölüm 8, Faz 1 notları).
- [x] Veli child selector tüm child scoped ekranlara bağlandı (`GuardianProvider` + `ChildSelector`).
- [x] Müdür program builder kapsamı P0/P1/P2 olarak ayrıldı (Bölüm 4.1, Faz 3).
- [x] Ortak bildirim/destek/profil ekranları rol bazında netleşti (`more` tab, Faz 2 API).
- [x] `ogta.ai` mobil sheet ve onay kartı davranışı tasarlandı (`OgtaAiFab`).

---

## 12. Önerilen İlk Uygulama Sırası

1. [x] `frontend/apps/mobile` Expo app iskeleti.
2. [x] Ortak API client ve domain type'ların webden ayrıştırılması (`src/shared/api`, `src/shared/auth`).
3. [x] Auth + RoleGate + SecureStore.
4. [x] Öğretmen P0: genel, dersler, yoklama, gözlem ekleme.
5. [x] Veli P0: çocuk seçici, genel, program, devamsızlık.
6. [x] Rehberlik P0: genel, öğrenci, risk, not ekleme.
7. [x] Müdür P0: genel, öğrenci/sınıf, yoklama özeti.
8. [x] Duyuru, bildirim, destek, profil ortak ekranları.
9. [x] ogta.ai mobil entegrasyonu (non-stream + onay kartı).
10. [ ] Push notifications ve EAS dağıtım (Faz 3).
