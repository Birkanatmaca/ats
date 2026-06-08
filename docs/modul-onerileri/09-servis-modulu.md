# 09 - Servis Modülü

> Amaç: Okul servis rotaları, araç/şoför bilgisi ve öğrenci servis atamalarını yönetmek; veliyi servis bilgileriyle bilgilendirmek.

> Güncelleme (2026-06-05): İlk canlı takip backend dilimi uygulandı. Rota/araç/personel/atama altyapısına ek olarak aktif sefer (`service_trips`), konum kaydı (`service_trip_locations`), driver paylaşım başlat/durdur, principal aktif sefer listesi ve guardian kendi öğrencisinin aktif sefer okuma akışı var. Native GPS toplama, harita, ETA, otomatik bildirim ve sefer event timeline'ı sonraki fazdır.

---

## 1. Ürün Kararı

Servis modülü veli uygulamasının kullanım sıklığını artırır. Bu sürümde fiziksel GPS cihazı hedeflenmez; şoför cihazına yüklenecek mobil uygulama ile canlı konum paylaşımı yapılır. Önce rota, araç, şoför, öğrenci ataması, canlı paylaşım ve bildirim akışı kurulmalıdır.

---

## 2. Kapsam

### Dahil

- Servis araçları.
- Şoför/rehber personel bilgisi.
- Rota tanımı.
- Öğrenci servis ataması.
- Veliye servis bilgisi gösterimi.
- Şoför cihazı üzerinden canlı konum paylaşımı.
- Servis duyuruları.
- Gecikme/iptal bildirimi.

### Hariç

- Harici GPS cihazı entegrasyonu.
- Yakıt/bakım muhasebesi.
- Harita optimizasyonu.

---

## 3. Veri Modeli

```sql
service_vehicles
- id
- tenant_id
- plate
- capacity
- brand
- model
- status
```

```sql
service_driver_devices
- id
- tenant_id
- vehicle_id
- driver_user_id
- platform
- push_token
- location_permission_status
- sharing_status
- last_seen_at
```

```sql
service_staff
- id
- tenant_id
- full_name
- phone
- role                -- driver, attendant
- status
```

```sql
service_routes
- id
- tenant_id
- name
- direction           -- morning, evening, both
- vehicle_id nullable
- driver_id nullable
- attendant_id nullable
- status
```

```sql
service_route_stops
- id
- tenant_id
- route_id
- name
- planned_time
- sort_order
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

```sql
service_trips
- id
- tenant_id
- route_id
- driver_user_id
- driver_staff_id
- direction
- status              -- active, completed, canceled
- started_at
- ended_at nullable
```

```sql
service_trip_locations
- id
- tenant_id
- trip_id
- driver_user_id
- lat
- lng
- speed nullable
- heading nullable
- accuracy nullable
- recorded_at
```

```sql
service_trip_events
- id
- tenant_id
- trip_id
- event_type
- payload_json
- created_at
```

---

## 4. API Tasarımı

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

GET    /api/v1/services/trips/active
GET    /api/v1/driver/me
POST   /api/v1/driver/sharing/start
POST   /api/v1/driver/sharing/stop
POST   /api/v1/driver/trips/{id}/locations

POST   /api/v1/services/assignments
PATCH  /api/v1/services/assignments/{id}
GET    /api/v1/guardian/students/{studentId}/service
GET    /api/v1/guardian/students/{studentId}/service/trip
```

---

## 5. Frontend

### Müdür/System Admin

- Rota listesi.
- Araç listesi.
- Şoför/rehber listesi.
- Öğrenci servis atama.
- Rota detayında duraklar.
- Harita üzerinde tüm servisler ve aktif seferler.
- Servis duyurusu gönder.

### Veli

- Çocuğunun servis rotası.
- Araç plakası.
- Şoför/rehber iletişim bilgisi.
- Sabah/akşam saatleri.
- Canlı servis durumu ve ETA.
- Harita üzerinde yalnızca kendi servisi.
- Servis duyuruları.

---

## 6. Bildirimler

- Servis gecikmesi.
- Servis iptali.
- Rota değişikliği.
- Araç/şoför değişikliği.
- Şoför cihazı bağlantı kaybı.

Push payload sadece kategori ve route id taşımalı; kişisel telefon bilgileri kilit ekranına yazılmamalıdır.

---

## 7. Yetki

- Yönetim: principal/system_admin.
- Veli: sadece kendi çocuğunun servis bilgisi.
- Öğretmen/rehberlik: varsayılan erişim yok.
- Super admin: modül aktivasyonu ve genel metrik.

---

## 8. Kabul Kriterleri

- Müdür rota ve araç tanımlar.
- Şoför uygulamasından canlı paylaşım başlatılınca aktif sefer açılır.
- Şoför konum gönderdiğinde son konum sefer üzerinde saklanır.
- Öğrenci rotaya atanır.
- Veli kendi çocuğunun servis bilgisini görür.
- Veli sadece kendi çocuğunun aktif servis seferini okuyabilir.
- Rota değişikliğinde veli push bildirimi alır.
- Scope dışı öğrenci servis bilgisi alınamaz.

---

## 9. Test Planı

- Route CRUD test.
- Assignment scope test.
- Guardian service endpoint test.
- Guardian active trip endpoint test.
- Driver sharing start/stop test.
- Driver location record test.
- Push event test.
- Mobil veli ekranı smoke.
- Capacity warning unit test.

---

## 10. İlk Uygulama Sırası

1. Araç/personel/rota migration.
2. Rota CRUD backend.
3. Öğrenci atama.
4. Veli servis ekranı.
5. Driver aktif sefer ve konum endpoint'leri.
6. Servis bildirimleri.
7. Kapasite ve çakışma uyarıları.
8. İkinci fazda canlı takip kalitesi, harita/ETA ve cihaz dayanıklılığı iyileştirme.
