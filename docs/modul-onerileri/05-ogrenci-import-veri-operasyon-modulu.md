# 05 - Öğrenci Import ve Veri Operasyon Modülü

> Amaç: Okul dönem başı kurulumunu hızlandırmak; öğrenci, veli ve sınıf/şube verilerini toplu ve kontrollü şekilde içe aktarmak.

---

## 1. Ürün Kararı

Okul sistemlerinde en maliyetli ilk kurulum işi veri girişidir. Öğrenci import modülü, satış sonrası onboarding süresini kısaltır ve müdür/system admin için ürün değerini artırır.

Bu modül önce webde güçlü, mobilde ise ön izleme/onay odaklı düşünülmelidir.

---

## 2. Kapsam

### Dahil

- Excel/CSV öğrenci import.
- Dosya ön izleme.
- Hata ve uyarı listesi.
- Sınıf/şube eşleme.
- Veli bilgisi oluşturma/eşleme.
- Toplu veli daveti.
- Import geçmişi.
- Geri alma veya pasifleştirme planı.

### Hariç

- Muhasebe/tahsilat import'u.
- Sınav sonuç import'u.
- Otomatik veri temizleme AI kararları.

---

## 3. Veri Modeli

```sql
student_import_jobs
- id
- tenant_id
- status              -- draft, validating, ready, importing, completed, failed, cancelled
- file_name
- uploaded_by
- total_rows
- valid_rows
- error_rows
- created_at
- completed_at nullable
```

```sql
student_import_rows
- id
- tenant_id
- job_id
- row_number
- raw_data jsonb
- normalized_data jsonb
- status              -- valid, warning, error, imported
- error_messages jsonb
- created_student_id nullable
- created_guardian_user_id nullable
```

---

## 4. API Tasarımı

```text
POST   /api/v1/imports/students
GET    /api/v1/imports/students/{jobId}
GET    /api/v1/imports/students/{jobId}/rows
PATCH  /api/v1/imports/students/{jobId}/rows/{rowId}
POST   /api/v1/imports/students/{jobId}/validate
POST   /api/v1/imports/students/{jobId}/commit
POST   /api/v1/imports/students/{jobId}/cancel
```

Upload ilk sürümde JSON payload olabilir. Daha sonra multipart file upload eklenir.

---

## 5. Dosya Şeması

Minimum kolonlar:

```text
school_number
first_name
last_name
class_name
section_name
guardian_name
guardian_phone
guardian_email
```

Opsiyonel:

```text
gender
birth_date
guardian_relation
student_status
```

---

## 6. Validasyon Kuralları

- Okul numarası boş olamaz.
- Aynı tenant içinde okul numarası benzersiz olmalıdır.
- Ad/soyad boş olamaz.
- Sınıf/şube bulunamazsa uyarı veya create önerisi verilir.
- Veli e-posta varsa format kontrolü yapılır.
- Aynı veli birden çok öğrenciye bağlanabilir.
- Telefon normalize edilir.

---

## 7. Frontend

### Web

- Dosya seç.
- Kolon eşleme.
- Ön izleme tablo.
- Hata/uyarı paneli.
- Commit onayı.

### Mobil

- Import geçmişi.
- Dosya seç + ön izleme.
- Hata satırlarını kart listesi.
- Commit onayı.
- Ağır kolon eşleme webde kalabilir.

---

## 8. Yetki

- Import sadece principal/system_admin.
- Super admin tenant adına destek amaçlı import yapabilir.
- Öğretmen, veli, rehberlik import yapamaz.
- Her import audit log'a yazılır.

---

## 9. Kabul Kriterleri

- Geçerli dosya öğrencileri oluşturur.
- Hatalı satırlar import edilmez.
- Kullanıcı commit öncesi kaç öğrenci/veli oluşacağını görür.
- Aynı dosya ikinci kez çalıştırıldığında duplicate kontrolü yapılır.
- Import sonrası sınıf/şube listesi güncellenir.

---

## 10. Test Planı

- Parser unit testleri.
- Duplicate okul numarası testi.
- Veli eşleme testi.
- Hatalı satır commit dışı kalır testi.
- Tenant izolasyon testi.
- Büyük dosya performans testi.

---

## 11. İlk Uygulama Sırası

1. Import job/row migration.
2. Backend parser/validator.
3. Web upload ve preview.
4. Commit işlemi.
5. Mobil import geçmişi ve preview.
6. Toplu veli daveti.
7. Import rollback/pasifleştirme stratejisi.

