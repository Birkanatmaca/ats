# 02 - Offline Yoklama Modülü

> Amaç: Öğretmenin bağlantı zayıfken veya internet yokken yoklama alabilmesi, bağlantı geldiğinde kayıtların güvenli şekilde senkronize edilmesi.

> Güncelleme (2026-06-08): Öğretmen mobil akışı uçtan uca tamamlandı. AsyncStorage kuyruğu, NetInfo bağlantı takibi, çevrimiçi yedekleme (`draft`), bağlantı kopunca `queued` yükseltme, otomatik replay, çakışma sheet'i, bekleyen kuyruk, çıkış uyarısı, takvim önbelleği ve idempotency key desteği devrede.

---

## 1. Ürün Kararı

Yoklama okulun günlük operasyonunda en kritik mobil akıştır. İnternet kesintisi olduğunda öğretmen yoklama alamazsa mobil uygulamanın güveni düşer. Offline yoklama, öğretmen deneyimini ciddi biçimde güçlendirir.

Bu modül önce öğretmen rolüne eklenmelidir. Müdür sınıf yoklaması için offline destek daha sonra alınabilir.

---

## 2. Kapsam

### Dahil

- Aktif ders/yoklama oturumu için lokal taslak.
- Öğrenci durumlarını offline değiştirme.
- Bağlantı geldiğinde otomatik senkron.
- Çakışma ve hata çözümü.
- Senkron durumu rozeti.
- Öğretmen için "bekleyen yoklama" listesi.

### Hariç

- Tam offline ders programı üretimi.
- Rehberlik/duyuru offline düzenleme.
- Çok kullanıcılı eş zamanlı düzenleme.

---

## 3. Kullanıcı Akışı

1. Öğretmen ders ekranını açar.
2. Uygulama ders ve öğrenci listesini cache'e alır.
3. Bağlantı kesilirse öğretmen yoklamayı işaretlemeye devam eder.
4. Kayıtlar lokal queue'ya yazılır.
5. Bağlantı geri gelince queue replay edilir.
6. Backend başarılı dönerse lokal kayıt temizlenir.
7. Çakışma varsa öğretmene çözüm ekranı gösterilir.

---

## 4. Veri Modeli

Mobil lokal model:

```ts
type OfflineAttendanceDraft = {
  id: string;
  tenantId: string;
  teacherId: string;
  lessonId: string;
  sessionId?: string;
  classId: string;
  className: string;
  subjectName: string;
  records: Array<{
    studentId: string;
    status: "present" | "absent" | "late" | "excused" | "unknown";
    note?: string;
    updatedAt: string;
  }>;
  baseVersion?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: "draft" | "queued" | "syncing" | "synced" | "conflict" | "failed";
  lastError?: string;
};
```

Backend opsiyonel idempotency:

```text
PATCH /api/v1/attendance/sessions/{id}/records
Header: Idempotency-Key
```

---

## 5. API İhtiyaçları

Mevcut API:

```text
POST  /api/v1/attendance/sessions
GET   /api/v1/attendance/sessions/by-lesson/{lessonId}
PATCH /api/v1/attendance/sessions/{id}/records
POST  /api/v1/attendance/sessions/{id}/finalize
POST  /api/v1/attendance/sessions/{id}/reopen
```

Önerilen ekler:

```text
GET   /api/v1/attendance/sessions/{id}/version
PATCH /api/v1/attendance/sessions/{id}/records?mode=draft
POST  /api/v1/attendance/sessions/{id}/sync
```

İlk sürüm için mevcut API yeterli olabilir; ancak idempotency key ve conflict mesajları güçlendirilmelidir.

---

## 6. Mobil Frontend

### Gereken Paketler

- `@react-native-async-storage/async-storage`
- `@react-native-community/netinfo`

### Ekran Bileşenleri

- `OfflineStatusBanner`
- `PendingAttendanceQueue`
- `SyncConflictSheet`
- `SyncFailedCard`

### UI Kuralları

- Öğretmen offline olduğunu açıkça görmelidir.
- "Kaydet" yerine "Senkron bekliyor" durumu gösterilmelidir.
- Finalize offline yapılırsa local olarak "finalize pending" tutulmalıdır.
- Senkron başarısız olursa kayıt kaybolmamalıdır.

---

## 7. Çakışma Kuralları

| Durum | Davranış |
|-------|----------|
| Session finalized | Öğretmene "Oturum kapandı" göster, reopen gerekebilir. |
| Attendance window closed | Queue kalır ama otomatik gönderilmez; müdür/onay gerekebilir. |
| Backend kaydı değişmiş | Öğretmene yerel ve sunucu kayıt farkı gösterilir. |
| Öğrenci listesi değişmiş | Silinen öğrenci kaydı ignored veya uyarı olarak gösterilir. |
| Aynı ders için iki draft | En yeni draft birleştirilir, kullanıcıya bilgi verilir. |

---

## 8. Güvenlik

- Offline cache sadece öğretmenin kendi dersleri için tutulur.
- Logout'ta queue varsa kullanıcı uyarılmalı; hassas veri temizleme politikası belirlenmelidir.
- Queue SecureStore'da değil AsyncStorage'da tutulacaksa hassas veri miktarı azaltılmalıdır.
- Veli/rehberlik notları offline cache'e dahil edilmemelidir.

---

## 9. Kabul Kriterleri

- Öğretmen bağlantı yokken öğrenci durumlarını değiştirebilir.
- Bağlantı gelince kayıtlar otomatik backend'e gider.
- Başarılı sync sonrası queue temizlenir.
- Hatalı sync sonrası öğretmen kayıtları kaybetmez.
- Finalize edilmiş oturumda çakışma doğru gösterilir.
- Uygulama kapanıp açıldığında bekleyen draft görünür.

---

## 10. Test Planı

- Unit: queue merge, status update, conflict detection.
- Mobile integration: NetInfo offline -> queue write.
- Backend integration: idempotent PATCH.
- Manual: uçak modu, uygulama kapanma/açılma, tekrar online.
- Regression: logout, role change, farklı öğretmen oturumu.

---

## 11. İlk Uygulama Sırası

1. Queue data model ve storage helper.
2. Teacher attendance ekranına offline banner.
3. Record update'i lokal draft'a yaz.
4. Online replay worker.
5. Conflict sheet.
6. Idempotency/test.
7. Müdür rapor ekranında pending uyarısı.

---

## 12. Uygulama Durumu (2026-06)

| Alan | Durum |
|------|-------|
| Queue model + AsyncStorage | Tamam |
| NetInfo + otomatik senkron | Tamam |
| TeacherAttendanceScreen offline UI | Tamam |
| Çevrimiçi lokal yedek (`draft`) | Tamam |
| Çakışma sheet + reopen akışı | Tamam |
| Bekleyen kuyruk + çıkış uyarısı | Tamam |
| Takvim önbelleği (offline ders listesi) | Tamam |
| Sabah otomatik prefetch (bugünkü tüm dersler) | Tamam |
| Senkron sonrası offline cache korunması | Tamam |
| Backend idempotency + version API | Tamam |
| Unit test (queue, conflict, sync) | Tamam |
| Müdür pending uyarısı | Tamam (web + mobil overview/yoklama/operasyon) |
| Müdür offline yoklama | Sonraki faz |

