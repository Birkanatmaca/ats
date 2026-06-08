# Moduller Gelistirme ve Canli Servis Takip Plani

> Tarih: 2026-06-03  
> Guncelleme: 2026-06-05  
> Kapsam: Mevcut backend, web ve mobil modullerin gelistirme oncelikleri; servis modulu icin canli takip mimarisi; operasyon, bildirim, audit ve test plani.  
> Amac: Sistemin bugunku calisan modullerini daha guvenli, daha izlenebilir ve daha kullanisli hale getirecek uygulama plani cikarmak.

---

## 1. Neden Bu Dokuman Var?

Sistem artik temel MVP seviyesini gecmis durumda. Simdi asil sorun yeni bir omurga kurmak degil; mevcut modulleri birbirine daha iyi baglamak, operasyonu gercek zamanli izlemek ve kritik akislarda hata payini azaltmak.

Bu dokumanin ana odagi su 3 alan:

- Mevcut modulleri gelistirme sirasi.
- Servis modulu icin canli takip ve operasyon gorunurlugu.
- Gozlem, rehberlik, bildirim, audit ve destek katmanlarinin guclendirilmesi.

2026-06-05 durum notu:

- Servis modulu icin canli takip altyapisinin ilk backend dilimi uygulandi.
- `backend/migrations/000027_service_live_tracking.sql` ile `service_trips`, `service_trip_locations` ve `service_trip_events` semasi eklendi.
- Driver start/stop paylasimi artik aktif trip acip kapatiyor; driver konum yazma, principal aktif trip listesi ve guardian kendi ogrencisinin aktif trip okuma endpoint'leri var.
- Mobil driver ekranı aktif trip ve son konum bilgisini gosterecek sekilde API'ye baglandi.
- Gercek native GPS izinleri/periyodik konum toplama, ETA, gecikme bildirimi, harita, timeline/event yazimi ve push otomasyonu halen sonraki faz isidir.

---

## 2. Stratejik Hedef

Kisa vade hedefi su olmalidir:

1. Calisan modulleri daha kararlı hale getirmek.
2. Velinin ve yoneticinin anlik bilgi ihtiyacini karsilamak.
3. Operasyon ekiplerinin servis, yoklama, bildirim ve destek olaylarini tek ekrandan izleyebilmesini saglamak.
4. Kritik islemlerde audit ve log verisini kullanilabilir hale getirmek.

Bu nedenle yeni ozellik eklemekten cok, mevcut domainleri su eksende gelistirmek gerekir:

- Canli durum izleme.
- Rol bazli gorunurluk.
- Uyari ve bildirim otomasyonu.
- Geçmis hareketlerin raporlanmasi.
- Test ve gozlemlenebilirlik.

---

## 3. Mevcut Moduller Icin Gelistirme Onceligi

### 3.1 Servis modulu

Servis modulu bu donemin en kritik operasyonel alanlarindan biridir. Cunku hem veli deneyimi hem de okul gunluk operasyonu uzerinde dogrudan etkisi vardir.

Gelismesi gereken basliklar:

- Rota ve durak tanimlari.
- Araç ve sofor atamalari.
- Ogrenci servis eslestirmeleri.
- Sabah / aksam sefer ayrimi.
- Gecikme, iptal ve rota degisikligi bildirimleri.
- Canli konum ve durum takibi.

### 3.2 Yoklama modulu

Yoklama verisi sadece kaydedilen bir form olmamali; okul operasyonunun akis verisi haline gelmeli.

Gelismesi gereken basliklar:

- Oturum bazli izleme.
- Gec kalan / devamsiz ogrenci uyarilari.
- Veliye otomatik bilgilendirme.
- Sinif, ogretmen ve gun bazli trend raporlari.
- Yoklama ile servis ve rehberlik olaylarinin baglantisi.

### 3.3 Rehberlik ve erken uyari

Rehberlik tarafinda veri toplamak kadar veri yorumlamak da onemli.

Gelismesi gereken basliklar:

- Vaka takibi.
- Risk sinyali birikimi.
- Veli gorusme takvimi.
- Gorev ve takip planlari.
- Servis ve yoklama verisinden gelen erken uyari sinyalleri.

### 3.4 Duyuru ve bildirim altyapisi

Duyuru sistemi sadece mesaj yayinlamak icin degil, operasyonel olay yayini icin kullanilmali.

Gelismesi gereken basliklar:

- Hedefli bildirim segmentleri.
- Servis gecikmesi ve rota degisikligi olaylari.
- Yoklama, rehberlik ve destek olaylari icin olay-tabanli bildirim.
- Okunma ve teslim durumlari.

### 3.5 Super admin ve audit izleme

Super admin paneli, sistemin yonetsel hafizasi olmali.

Gelismesi gereken basliklar:

- Operasyonel log gorunurlugu.
- Tenant bazli filtreleme.
- Kritik aksiyonlar icin purge / export.
- Hata, uyarı ve davranis siniflandirmasi.

### 3.6 Destek, tahsilat, akademik gelisim, okul yasantisi

Bu moduller premium ama birbirine bagli calismali.

Gelismesi gereken basliklar:

- Destek taleplerinde SLA takibi.
- Tahsilatta borc / odeme / hatirlatici akislari.
- Akademik gelisimde ogrenci bazli ilerleme grafigi.
- Okul yasantisinda etkinlik, kulup ve katilim takibi.

---

## 4. Servis Modulu Için Canli Takip Gereksinimi

Canli takip sadece harita uzerinde aracin yerini gostermek degildir. Okul servis operasyonu icin asil ihtiyac, aracin o an hangi durumda oldugunu ve yolculugun hangi asamada bulundugunu bilinmesidir.

Bu projede fiziksel GPS cihazı kullanmak yerine sofor cihazina kurulacak mobil uygulama ile konum paylasimi yapilmalidir. Sofer uygulamada "Canli konum paylasmayi baslat" dediginde sistem trip oturumunu acar ve veli tarafinda ilgili servis canli gorunur.

### 4.1 Canli takip ile hedeflenen fayda

- Veliye daha dogru varis tahmini.
- Gecikme durumunda onceden uyarı.
- Servis birimi icin anlik rota gorunurlugu.
- Acil durumlarda arac durumunun hizli bulunmasi.
- Sefer sonu ve baslangicinda kayitli iz.

### 4.2 Canli takip kapsamı

Ilk surum icin kapsam kontrollu tutulmali:

- Sofer cihazindan gelen konum.
- Konum paylasimi basladi / durdu / tamamlandi durumu.
- Durak bazli ilerleme.
- Tahmini varis zamani.
- Gecikme algisi.
- Cihaz baglanti ve konum tazelik durumu.

Ikinci asamada eklenebilecekler:

- Geofence kontrolu.
- Ogrenci bindi / indi olaylari.
- Durak bazli otomatik bildirim.
- Sofer uygulamasindan manuel durum guncelleme.
- Harita uzerinde rota tekrar oynatma.

### 4.3 Canli takipte asil problem

Sorun sadece konum almak degil, veri kalitesini korumaktir.

Bu nedenle sistem su kurallari uygulamali:

- Konum guncellemeleri belirli araliklarla alinmali.
- Ani ziplama / hatali koordinat filtrelenmeli.
- Konum gecikirse son bilinen durum korunmali.
- Cihaz uygulamasi arka planda durursa son aktivite zamani isaretlenmeli.
- Sefer disi konum verisi raporlamaya dahil edilmemeli.

---

## 5. Onerilen Veri Modeli

### 5.1 Servis ana tablolar

```sql
service_vehicles
- id
- tenant_id
- plate
- capacity
- status
- current_lat
- current_lng
- current_speed
- last_location_at
```

```sql
service_driver_devices
- id
- tenant_id
- vehicle_id
- driver_user_id
- device_platform
- push_token
- location_permission_status
- sharing_status
- last_seen_at
```

```sql
service_routes
- id
- tenant_id
- name
- direction           -- morning, evening, both
- status
- eta_policy_json
```

```sql
service_route_stops
- id
- tenant_id
- route_id
- name
- planned_time
- sort_order
- lat
- lng
```

```sql
student_service_assignments
- id
- tenant_id
- student_id
- route_id
- stop_id nullable
- direction
- status
```

### 5.2 Canli takip tabloları

```sql
service_trips
- id
- tenant_id
- route_id
- vehicle_id
- driver_id
- direction
- started_at
- ended_at
- status
```

```sql
service_trip_locations
- id
- tenant_id
- trip_id
- vehicle_id
- lat
- lng
- speed
- heading
- recorded_at
```

```sql
service_trip_events
- id
- tenant_id
- trip_id
- event_type        -- started, stop_reached, student_boarded, student_dropped, delayed, completed
- payload_json
- created_at
```

```sql
service_trip_notifications
- id
- tenant_id
- trip_id
- audience_type     -- guardian, principal, super_admin
- audience_id nullable
- channel           -- push, in_app, sms
- status
```

---

## 6. API Tasarimi

### 6.1 Servis CRUD ve atamalar

```text
GET    /api/v1/services/routes
POST   /api/v1/services/routes
GET    /api/v1/services/routes/{id}
PATCH  /api/v1/services/routes/{id}
DELETE /api/v1/services/routes/{id}

GET    /api/v1/services/vehicles
POST   /api/v1/services/vehicles
PATCH  /api/v1/services/vehicles/{id}

GET    /api/v1/services/staff
POST   /api/v1/services/staff
PATCH  /api/v1/services/staff/{id}

POST   /api/v1/services/assignments
PATCH  /api/v1/services/assignments/{id}
GET    /api/v1/guardian/students/{studentId}/service
```

### 6.2 Uygulanan ilk canli takip endpoint'leri

```text
GET    /api/v1/services/trips/active
GET    /api/v1/driver/me
POST   /api/v1/driver/sharing/start
POST   /api/v1/driver/sharing/stop
POST   /api/v1/driver/trips/{id}/locations
GET    /api/v1/guardian/students/{studentId}/service/trip
```

Bu ilk dilimde sefer oturumu, son konum ve rol bazli gorunurluk calisiyor. Endpoint'ler principal, driver ve guardian scope kurallarina bagli.

### 6.3 Planlanan genisleme endpoint'leri

```text
POST   /api/v1/services/trips/{id}/events
POST   /api/v1/services/trips/{id}/start
POST   /api/v1/services/trips/{id}/complete
GET    /api/v1/services/trips/{id}/live
GET    /api/v1/services/trips/{id}/timeline
GET    /api/v1/guardian/students/{studentId}/service/live
```

### 6.4 Bildirim ve operasyon endpoint'leri

```text
POST   /api/v1/services/trips/{id}/delay
POST   /api/v1/services/trips/{id}/announce
GET    /api/v1/services/trips/{id}/alerts
GET    /api/v1/super-admin/audit-logs
```

---

## 7. Frontend Uygulama Alani

### 7.1 Mudur paneli

- Servis rota listesi.
- Araç ve surucu atama.
- Canli sefer gorunumu.
- Harita uzerinde tum aktif servisler.
- Gecikme ve iptal uyarilari.
- Durak bazli sefer timeline.
- Gunluk servis raporu.

### 7.2 Veli uygulamasi / web

- Cocuk icin aktif servis gorunumu.
- Tahmini varis zamani.
- Harita uzerinde sadece kendi servisi.
- Aracin son konumu.
- Gecikme bildirimi.
- Rota / durak bilgisi.

### 7.3 Super admin paneli

- Tenant bazli servis aktivite ozeti.
- Kritik olay loglari.
- Bildirim dagitim raporu.
- Arac / trip bazli sorun analizi.

### 7.4 Surucu veya saha personeli arayuzu

Ilk asamada tam uygulama olmayabilir; ama minimum bir operasyon ekranı gereklidir. Bu ekran sofor cihazina yüklenecek mobil uygulama olmalidir:

- Sefer baslat / bitir.
- Canli konum paylasmayi baslat / durdur.
- Durak geldi bildirimi.
- Gecikme nedeni girisi.
- Acil durum isareti.

---

## 8. Canli Takip Akisi

### 8.1 Baslangic

1. Surucu seferi baslatir.
2. Sistem `service_trips` kaydi acar.
3. Arac konum guncellemeleri akmaya baslar.
4. Veli ve okul tarafinda aktif sefer gorunur.

### 8.2 Yolculuk sırasında

1. Arac periyodik konum yollar.
2. Sistem son bilinen konumu ve hizi hesaplar.
3. Durak bazli ETA guncellenir.
4. Gecikme tetiklenirse bildirim olusturulur.

### 8.3 Bitis

1. Sefer tamamlanir.
2. Konum akisi kapanir.
3. Timeline arsive yazilir.
4. Rapor ve audit log son haliyle saklanir.

---

## 9. Bildirim Politikasi

Canli takipte bildirim sayisi kontrolsuz olmamalidir. Aksi halde veli tarafinda gurultu olusur.

### 9.1 Bildirim tetikleyicileri

- Sefer basladi.
- Sefer belirli dakika gecikti.
- Durak yaklasildi.
- Ogrenci bindi / indi.
- Sefer tamamlandi.
- Rota degistirildi.

### 9.2 Bildirim kurallari

- Kisa ve net metin kullanilmali.
- Kisisel veri kilit ekrana yazilmamali.
- Tek olay icin tekrar tekrar push atilmamali.
- Kritik olaylar audit ile baglanmali.

---

## 10. Yetki ve Gorunurluk

### 10.1 Principal

- Tum servis operasyonunu gorur.
- Rota, arac, surucu ve gecikme bilgisini yonetir.

### 10.2 Guardian

- Sadece kendi cocugunun servis bilgisini gorur.
- Canli konum ve ETA bilgisi sinirli kapsamda verilir.

### 10.3 Teacher / Guidance

- Varsayilan olarak servis canli takibe erismemeli.
- Gerekirse sadece operasyonel durum bilgisi gorur.

### 10.4 Super admin

- Tenant genelinde olay ve log gorur.
- Sistem sagligini ve operasyon hacmini izler.

---

## 11. Gelistirme Sirasi

### Faz 1 - Temel stabilizasyon

1. Mevcut modullerde eksik kontrolleri temizle.
2. Servis CRUD ile rota / arac / atama akisini tamamla.
3. Audit ve log gorunurlugunu standartlastir.

### Faz 2 - Canli servis takip

1. [x] Trip modeli.
2. [x] Driver role/session ve paylasim baslat/durdur akisi.
3. [x] Konum toplama endpoint'i.
4. [~] Live trip ekranı: mobil driver ozetinde aktif trip/son konum var; principal/guardian harita ve timeline henuz yok.
5. [ ] Veliye ETA ve gecikme bildirimi.

### Faz 3 - Operasyonel zekâ

1. Durak bazli gecikme analizi.
2. Rota performans raporu.
3. Ogrenci biniş/iniş timeline'i.
4. Super admin izleme ekranı.

### Faz 4 - Genişletme

1. Harita tekrar oynatma.
2. Geofence.
3. Akilli gecikme tahmini.
4. Servis ile yoklama ve rehberlik korelasyonu.

---

## 12. Test Plani

Canli takip ve modül gelistirmesi testsiz ilerlememeli.

### Backend testleri

- Rota CRUD testleri.
- Trip baslat / durdur testleri.
- Konum guncelleme testleri.
- Guardian/teacher/principal/driver scope testleri.
- Bildirim tetikleyici testleri.

### Frontend testleri

- Mudur servis ekran smoke.
- Veli servis gorunum smoke.
- Canli durum refresh akisi.
- Gecikme banner testi.

### Operasyon testleri

- Audit log olustu mu.
- Bildirim tekrar etmeden gitti mi.
- Geciken konum veri kaybi yaratmadan isleniyor mu.

---

## 13. Basari Kriterleri

Bu planin basarili oldugu soyle kabul edilir:

- Servis mudur tarafinda rota, arac ve surucu anlik takip ediliyor.
- Veli kendi cocugunun servisini anlik olarak goruyor.
- Gecikme durumunda otomatik uyari calisiyor.
- Sistem konum akisini log ve timeline olarak sakliyor.
- Servis olaylari super admin panelinde izlenebiliyor.
- Moduller arasinda veri tutarsizligi azalıyor.

---

## 14. Kisa Vadeli Uygulama Sirasi

1. [x] Servis veri modelini netlestir.
2. [x] Trip ve location endpoint'lerini ekle.
3. [~] Mudur ve veli servis ekranlarini canli veriyle bagla; API ve mobil tipleri hazir, harita/timeline eksik.
4. [ ] Bildirim ve audit zincirini tamamla.
5. [ ] Rehberlik ve yoklama ile servis olaylarini eslestir.
6. [~] Test ve smoke senaryolarini yaz; backend transport handler smoke var, frontend/native smoke genislemeli.

---

## 15. Sonuc

Bu sistem icin sonraki buyuk adim yeni bir ekran sayisini artirmak degil; var olan modulleri operasyonel olarak gercek zamanli, guvenli ve izlenebilir hale getirmektir.

Servis modulu bunun en iyi baslangic noktasi. Cunku canli takip; veli memnuniyetini, okul operasyonunu ve sistemin premium degerini ayni anda yukari ceker.
