# 09 - Servis Modülü

> Amaç: Okul servis rotaları, araç/şoför bilgisi ve öğrenci servis atamalarını yönetmek; veliyi servis bilgileriyle bilgilendirmek.

---

## 1. Ürün Kararı

Servis modülü veli uygulamasının kullanım sıklığını artırır. Canlı araç takibi ilk sürüm için ağır olabilir; önce rota, araç, şoför, öğrenci ataması ve bildirim akışı kurulmalıdır.

---

## 2. Kapsam

### Dahil

- Servis araçları.
- Şoför/rehber personel bilgisi.
- Rota tanımı.
- Öğrenci servis ataması.
- Veliye servis bilgisi gösterimi.
- Servis duyuruları.
- Gecikme/iptal bildirimi.

### Hariç

- Canlı GPS takip ilk sürüm.
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

POST   /api/v1/services/assignments
PATCH  /api/v1/services/assignments/{id}
GET    /api/v1/guardian/students/{studentId}/service
```

---

## 5. Frontend

### Müdür/System Admin

- Rota listesi.
- Araç listesi.
- Şoför/rehber listesi.
- Öğrenci servis atama.
- Rota detayında duraklar.
- Servis duyurusu gönder.

### Veli

- Çocuğunun servis rotası.
- Araç plakası.
- Şoför/rehber iletişim bilgisi.
- Sabah/akşam saatleri.
- Servis duyuruları.

---

## 6. Bildirimler

- Servis gecikmesi.
- Servis iptali.
- Rota değişikliği.
- Araç/şoför değişikliği.

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
- Öğrenci rotaya atanır.
- Veli kendi çocuğunun servis bilgisini görür.
- Rota değişikliğinde veli push bildirimi alır.
- Scope dışı öğrenci servis bilgisi alınamaz.

---

## 9. Test Planı

- Route CRUD test.
- Assignment scope test.
- Guardian service endpoint test.
- Push event test.
- Mobil veli ekranı smoke.
- Capacity warning unit test.

---

## 10. İlk Uygulama Sırası

1. Araç/personel/rota migration.
2. Rota CRUD backend.
3. Öğrenci atama.
4. Veli servis ekranı.
5. Servis bildirimleri.
6. Kapasite ve çakışma uyarıları.
7. İkinci fazda GPS entegrasyonu değerlendirme.

