# 08 - Tahsilat Modülü

> Amaç: Okulun öğrenci ödeme planı, taksit, gecikme ve tahsilat raporlarını yönetmek.

## Durum (Haziran 2026)

| Alan | Durum |
|------|-------|
| Veri modeli + migration | Tamam |
| Backend API (tüm endpoint'ler) | Tamam |
| Mobil müdür + veli kartları | Tamam |
| Web müdür tahsilat sayfası | Tamam |
| Web veli özet kartı | Tamam |
| Geciken taksit CSV export | Tamam |
| Bildirimler (yaklaşan/gecikme/ödeme kaydı) | Tamam |
| Paket/lisans modül gating | Tamam (super admin kurum detayı) |

---

## 1. Ürün Kararı

Tahsilat modülü ticari olarak güçlü bir premium modüldür. Okul yönetimlerinin doğrudan maddi operasyonunu çözer. Ancak finansal veri hassas olduğu için güvenlik, audit ve yetki katmanı net kurulmalıdır.

---

## 2. Kapsam

### Dahil

- Öğrenci ödeme planı.
- Taksit tanımlama.
- Ödeme kaydı.
- Gecikme bildirimi.
- Veli ödeme özeti.
- Müdür finans dashboard.
- Tahsilat raporları.
- Paket/lisans entegrasyonu.

### Hariç

- Online ödeme sağlayıcı entegrasyonu ilk sürümde.
- Muhasebe fişi/e-fatura entegrasyonu.
- Banka mutabakat otomasyonu.

---

## 3. Veri Modeli

```sql
billing_accounts
- id
- tenant_id
- student_id
- guardian_user_id nullable
- status              -- active, paused, closed
- created_at
```

```sql
payment_plans
- id
- tenant_id
- billing_account_id
- name
- total_amount
- currency
- start_date
- status              -- active, completed, cancelled
```

```sql
payment_installments
- id
- tenant_id
- payment_plan_id
- due_date
- amount
- paid_amount
- status              -- pending, partial, paid, overdue, cancelled
```

```sql
payments
- id
- tenant_id
- installment_id
- amount
- method              -- cash, bank_transfer, card, other
- paid_at
- recorded_by
- note
```

---

## 4. API Tasarımı

```text
GET    /api/v1/billing/students/{studentId}/account
POST   /api/v1/billing/students/{studentId}/plans
PATCH  /api/v1/billing/plans/{id}
GET    /api/v1/billing/installments
POST   /api/v1/billing/installments/{id}/payments
PATCH  /api/v1/billing/payments/{id}
DELETE /api/v1/billing/payments/{id}

GET    /api/v1/billing/dashboard
GET    /api/v1/billing/reports/overdue
GET    /api/v1/guardian/students/{studentId}/billing
```

---

## 5. Frontend

### Müdür/System Admin

- Tahsilat dashboard.
- Öğrenci ödeme detay.
- Taksit listesi.
- Ödeme kaydı ekleme.
- Geciken ödemeler.
- Rapor export.

### Veli

- Ödeme planı özeti.
- Yaklaşan/geciken taksitler.
- Ödeme geçmişi.

### Super Admin

- Kurum paket modülü aktif/pasif.
- Finansal içerik değil kullanım metrikleri.

---

## 6. Bildirimler

- Taksit yaklaşırken veli bildirimi.
- Gecikme olduğunda veli bildirimi.
- Ödeme kaydı girildiğinde veli bilgilendirme.
- Müdüre geciken ödeme özeti.

Bildirim metinleri hassas olmalı; kilit ekranında aşırı finansal detay verilmemelidir.

---

## 7. Yetki ve Güvenlik

- Finansal veriye sadece principal/system_admin erişir.
- Öğretmen ve rehberlik tahsilat verisi görmez.
- Veli sadece kendi çocuğunun ödeme bilgisini görür.
- Her ödeme create/update/delete audit log'a düşer.
- Silme yerine iptal/void tercih edilir.

---

## 8. Kabul Kriterleri

- Müdür öğrenci için ödeme planı oluşturabilir.
- Taksit ödemesi kaydedilince durum güncellenir.
- Geciken taksit raporu doğru çalışır.
- Veli sadece kendi ödeme özetini görür.
- Finansal işlem audit log'a düşer.

---

## 9. Test Planı

- Payment plan hesaplama unit test.
- Partial payment status test.
- Overdue job test.
- Guardian scope test.
- Audit test.
- Rapor filtre testleri.

---

## 10. İlk Uygulama Sırası

1. Veri modeli ve migration.
2. Ödeme planı backend servisi.
3. Müdür öğrenci ödeme ekranı.
4. Geciken taksit raporu.
5. Veli ödeme özeti.
6. Bildirim entegrasyonu.
7. Paket yetkilendirme.

