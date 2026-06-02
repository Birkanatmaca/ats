# 10 - Yemek, Etüt ve Kulüp Modülü

> Amaç: Okulun günlük yan hizmetlerini tek bir operasyon modülü altında yönetmek ve veliye görünür hale getirmek.

---

## 1. Ürün Kararı

Yemek, etüt ve kulüp modülleri ana MVP için zorunlu değildir; ancak ürün olgunlaştığında veli uygulamasının günlük kullanımını artırır. Bu üç alan ayrı ayrı büyüyebilir, fakat ilk sürümde tek "Okul yaşamı" modülü olarak ele alınabilir.

---

## 2. Kapsam

### Dahil

- Haftalık yemek listesi.
- Alerjen bilgisi.
- Etüt programı.
- Etüt katılım kaydı.
- Kulüp/aktivite tanımı.
- Öğrenci kulüp katılımı.
- Veli görünümü.
- Duyuru/bildirim entegrasyonu.

### Hariç

- Yemekhane stok yönetimi.
- Diyetisyen entegrasyonu.
- Online kulüp ödeme sistemi.
- Öğrenci sosyal paylaşım alanı.

---

## 3. Veri Modeli

### Yemek

```sql
meal_menus
- id
- tenant_id
- date
- meal_type           -- breakfast, lunch, snack
- title
- description
- allergens jsonb
- created_by
```

### Etüt

```sql
study_sessions
- id
- tenant_id
- subject_id nullable
- teacher_user_id nullable
- class_id nullable
- title
- starts_at
- ends_at
- capacity
- status
```

```sql
study_session_attendance
- id
- tenant_id
- session_id
- student_id
- status              -- attended, absent, excused
```

### Kulüp

```sql
clubs
- id
- tenant_id
- name
- description
- advisor_user_id nullable
- capacity
- status
```

```sql
club_memberships
- id
- tenant_id
- club_id
- student_id
- status              -- active, waitlisted, left
```

---

## 4. API Tasarımı

```text
GET    /api/v1/life/meals
POST   /api/v1/life/meals
PATCH  /api/v1/life/meals/{id}
DELETE /api/v1/life/meals/{id}

GET    /api/v1/life/study-sessions
POST   /api/v1/life/study-sessions
PATCH  /api/v1/life/study-sessions/{id}
POST   /api/v1/life/study-sessions/{id}/attendance

GET    /api/v1/life/clubs
POST   /api/v1/life/clubs
PATCH  /api/v1/life/clubs/{id}
POST   /api/v1/life/clubs/{id}/memberships

GET    /api/v1/guardian/students/{studentId}/life
```

---

## 5. Frontend

### Veli

- Haftalık yemek menüsü.
- Alerjen rozetleri.
- Çocuğunun etüt programı.
- Kulüp üyelikleri.

### Müdür/System Admin

- Yemek menüsü yönetimi.
- Etüt oturumu oluşturma.
- Kulüp yönetimi.
- Katılım raporu.

### Öğretmen

- Kendi etüt oturumlarını görür.
- Etüt katılımı işaretler.
- Kulüp danışmanıysa kulüp listesini yönetir.

---

## 6. Bildirimler

- Yeni haftalık yemek menüsü.
- Etüt saati hatırlatması.
- Kulüp kontenjan/başvuru sonucu.
- Etüt devamsızlık bildirimi.

---

## 7. Yetki

- Yemek yönetimi: principal/system_admin.
- Etüt yönetimi: principal/system_admin, atanmış öğretmen.
- Kulüp yönetimi: principal/system_admin, kulüp danışmanı.
- Veli: sadece kendi çocuğunun okul yaşamı bilgisi.

---

## 8. Kabul Kriterleri

- Müdür haftalık yemek menüsü ekler, veli görür.
- Öğretmen kendi etüt oturumunda katılım işaretler.
- Veli çocuğunun kulüp üyeliğini görür.
- Alerjen bilgisi menü kartında görünür.
- Scope dışı öğrenci bilgisi dönmez.

---

## 9. Test Planı

- Meal CRUD test.
- Guardian life endpoint scope test.
- Study attendance test.
- Club capacity/waitlist test.
- Mobil veli ekranı smoke.
- Push event test.

---

## 10. İlk Uygulama Sırası

1. Yemek menüsü MVP.
2. Veli okul yaşamı ekranı.
3. Etüt oturumu ve katılım.
4. Kulüp tanımı ve üyelik.
5. Bildirim entegrasyonu.
6. Raporlama.

