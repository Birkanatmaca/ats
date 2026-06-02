# 07 - Akademik Gelişim Modülü

> Amaç: Öğrenci akademik performansını sınav, kazanım ve gelişim grafikleriyle takip etmek; veli ve okul yönetimine anlamlı raporlar sunmak.

---

## 1. Ürün Kararı

Bu modül operasyonel MVP'den sonra ürünü akademik değer katmanına taşır. Premium paket için güçlü adaydır. Rehberlik ve AI analizleriyle birleştiğinde öğrenci destek kararlarını daha veriye dayalı hale getirir.

---

## 2. Kapsam

### Dahil

- Sınav tanımlama.
- Sınav sonucu girişi/import.
- Ders bazlı notlar.
- Kazanım takibi.
- Öğrenci gelişim grafiği.
- Sınıf/şube karşılaştırması.
- Veli akademik raporu.
- AI destekli haftalık akademik özet.

### Hariç

- Resmi e-okul entegrasyonu ilk sürümde.
- Öğrenciye otomatik tanı/etiket.
- Açık sıralama/rekabet sosyal ekranları.

---

## 3. Veri Modeli

```sql
academic_assessments
- id
- tenant_id
- name
- subject_id
- class_id nullable
- assessment_type     -- exam, quiz, homework, project
- max_score
- assessment_date
- created_by
```

```sql
academic_results
- id
- tenant_id
- assessment_id
- student_id
- score
- percentile nullable
- note nullable
- created_at
```

```sql
learning_outcomes
- id
- tenant_id
- subject_id
- code
- title
- grade_level
```

```sql
student_outcome_progress
- id
- tenant_id
- student_id
- outcome_id
- status              -- not_started, developing, mastered, needs_support
- evidence
- updated_by
```

---

## 4. API Tasarımı

```text
GET    /api/v1/academic/assessments
POST   /api/v1/academic/assessments
GET    /api/v1/academic/assessments/{id}
PATCH  /api/v1/academic/assessments/{id}
DELETE /api/v1/academic/assessments/{id}

GET    /api/v1/academic/assessments/{id}/results
POST   /api/v1/academic/assessments/{id}/results
POST   /api/v1/academic/results/import

GET    /api/v1/students/{id}/academic-summary
GET    /api/v1/classes/{id}/academic-summary
GET    /api/v1/guardian/students/{id}/academic-report
```

---

## 5. Frontend

### Öğretmen

- Kendi dersleri için sınav/ödev sonucu girer.
- Sınıf kazanım durumunu görür.
- Destek ihtiyacı olan öğrencileri listeler.

### Müdür

- Sınıf/şube akademik dashboard.
- Ders bazlı performans trendi.
- Öğretmen/sınıf karşılaştırması.

### Veli

- Çocuğunun akademik gelişim grafiği.
- Ders bazlı özet.
- Kazanım desteği önerileri.

### Rehberlik

- Akademik düşüş sinyalleri.
- Rehberlik vaka dosyasıyla ilişkili akademik özet.

---

## 6. AI Entegrasyonu

Örnekler:

- "Bu öğrencinin son 3 sınavdaki düşüşünü özetle."
- "5-A için matematik kazanım desteği gereken öğrencileri çıkar."
- "Veli görüşmesi için akademik özet hazırla."

AI çıktısı karar destek olmalı, otomatik etiket veya tanı üretmemelidir.

---

## 7. Yetki

- Öğretmen sadece kendi ders/sınıf sonuçlarını yönetir.
- Müdür tüm okul akademik özetini görür.
- Veli sadece kendi çocuğunu görür.
- Rehberlik scope kapsamındaki öğrencilerin akademik özetini görür.

---

## 8. Kabul Kriterleri

- Öğretmen sınav sonucu girebilir.
- Müdür sınıf bazlı akademik trend görür.
- Veli kendi çocuğunun akademik raporunu görür.
- Scope dışı öğrenci raporu alınamaz.
- Import hatalı satırları ayırır.

---

## 9. Test Planı

- Assessment CRUD testleri.
- Result import duplicate test.
- Guardian scope test.
- Teacher scope test.
- Summary hesaplama unit test.
- Mobil grafik rendering smoke.

---

## 10. İlk Uygulama Sırası

1. Assessment/result veri modeli.
2. Öğretmen sonuç giriş ekranı.
3. Öğrenci akademik summary endpoint.
4. Veli akademik rapor.
5. Müdür dashboard.
6. Kazanım takibi.
7. AI akademik özet.

