# Roadmap ve Uygulama Planı

## Faz 0: Proje Temeli

Hedef: Kod tabanını sürdürülebilir şekilde başlatmak.

Teslimatlar:

- Repo yapısı
- Go API iskeleti
- React web iskeleti
- Mobil uygulama iskeleti
- PostgreSQL bağlantısı
- Migrasyon altyapısı
- Config ve logging
- Auth temel altyapısı
- CI başlangıcı

## Faz 1: Kurum, Kullanıcı ve Yetki

Hedef: SaaS yapısının güvenli temeli.

Teslimatlar:

- Tenant modeli
- User modeli
- Tenant membership
- Role/permission sistemi
- Login/refresh/logout
- Tenant scope middleware
- Audit log altyapısı

## Faz 2: Okul Temel Verileri

Hedef: Ders programı ve yoklama için gerekli domain verilerini girmek.

Teslimatlar:

- Akademik yıl/dönem
- Sınıf/şube
- Öğrenci
- Veli
- Öğretmen
- Ders
- Öğretmen-ders eşleştirme
- Sınıf-ders haftalık saat ihtiyacı

## Faz 3: Ders Programı MVP

Hedef: Program üretme, düzenleme ve yayınlama.

Teslimatlar:

- Öğretmen müsaitlikleri
- Scheduling input ekranları
- Program üretim servisi
- Çakışma kontrolü
- Taslak program
- Manuel düzenleme
- Yayınlama
- Öğretmen takvim API'si

## Faz 4: Öğretmen Mobil ve Akıllı Yoklama

Hedef: Öğretmenin günlük operasyonunu çalışır hale getirmek.

Teslimatlar:

- Öğretmen mobil giriş
- Günlük ders listesi
- Aktif ders tespiti
- Yoklama oturumu
- Yoklama kaydetme
- Yoklama güncelleme
- Devamsızlık olay üretimi

## Faz 5: Veli Bilgilendirme

Hedef: Veliye düzenli ve doğru bilgi akışı sağlamak.

Teslimatlar:

- Veli mobil giriş
- Çocuk listesi
- Ders programı görüntüleme
- Devamsızlık görüntüleme
- Duyuru görüntüleme
- Bildirim merkezi

## Faz 6: Yönetici Dashboard ve Gözlem

Hedef: Yönetici görünürlüğü ve öğrenci destek verisinin başlangıcı.

Teslimatlar:

- Müdür dashboard
- Günlük yoklama özeti
- Sınıf bazlı durum
- Öğretmen gözlem formu
- Gözlem listeleme
- Rehberlik temel görüntüleme

## Faz 7: Rehberlik ve Erken Uyarı

Hedef: Öğrenci destek süreçlerini sistematik hale getirmek.

Teslimatlar:

- Rehberlik vaka dosyası
- Görüşme notları
- Veli görüşmeleri
- Takip planları
- Kural tabanlı risk sinyalleri
- AI özet raporları

## Faz 8: Premium Modüller

Hedef: Ürün gelir modelini genişletmek.

Potansiyel modüller:

- Gelişmiş AI analizleri
- Detaylı raporlar
- Tahsilat
- Servis
- Yemek
- Etüt
- Akademik gelişim
- Sınav ve ölçme değerlendirme

## Geliştirme Prensibi

Her faz şu sırayla tamamlanmalıdır:

1. Backend domain modeli
2. Migrasyon
3. API use-case
4. Yetki kontrolü
5. Frontend ekranı
6. Test
7. Audit/log kontrolü
8. Dokümantasyon güncellemesi

