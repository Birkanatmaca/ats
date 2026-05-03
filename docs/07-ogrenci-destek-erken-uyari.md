# Öğrenci Destek ve Erken Uyarı

## Amaç

Bu modül öğrenciyi etiketlemek veya tanı koymak için değildir. Amaç; öğretmen ve rehberlik birimi tarafından girilen verilerden hareketle destek ihtiyacı doğurabilecek sinyalleri daha erken fark etmek ve yetkili kişilere özet bilgi sunmaktır.

## MVP Kapsamı

MVP'de yalnızca basit öğretmen gözlem kayıtları bulunmalıdır:

- Öğrenci seçimi
- Gözlem kategorisi
- Kısa not
- Ders/sınıf bağlamı
- Tarih
- Rehberlik birimi tarafından listeleme

## Gözlem Kategorileri

Başlangıç kategorileri:

- Derse katılım
- Dikkat durumu
- Davranış değişikliği
- Sosyal uyum
- Devamsızlık eğilimi
- Akademik performans düşüşü
- Öğretmen notu

Kategoriler kurum tarafından özelleştirilebilir hale sonraki fazda getirilebilir.

## Rehberlik Fazı

MVP sonrasında eklenecek yetenekler:

- Rehberlik görüşme notları
- Veli görüşmesi kayıtları
- Takip planları
- Müdahale aksiyonları
- Öğrenci destek dosyası
- Gizlilik seviyesi belirleme
- Yetkili personel notları

## Erken Uyarı Yaklaşımı

İlk aşamada kural tabanlı sinyaller yeterlidir:

- Kısa sürede artan devamsızlık
- Aynı kategoride tekrar eden öğretmen gözlemleri
- Birden fazla öğretmenden benzer gözlem gelmesi
- Son haftalarda düşen derse katılım notları
- Rehberlik takibi açılmış öğrencide yeni risk sinyali oluşması

Gelişmiş AI analizleri sonraki fazda eklenmelidir.

## AI Kullanım Sınırları

AI şu çıktıları üretebilir:

- Özet rapor
- Trend açıklaması
- Tekrar eden davranış örüntüsü
- Yetkili personele inceleme önerisi

AI şu çıktıları üretmemelidir:

- Tanı
- Klinik değerlendirme
- Kesin etiket
- Disiplin kararı
- Otomatik yaptırım

Her AI çıktısı insan değerlendirmesine tabi olmalıdır.

## Yetki Kuralları

- Öğretmen yalnızca kendi öğrencileri için gözlem girebilir.
- Öğretmen başka öğretmenlerin gözlem notlarını varsayılan olarak göremez.
- Rehberlik birimi detay kayıtları görebilir.
- Müdür/yönetici özet ve analiz raporlarına erişebilir.
- Hassas rehberlik notları özel izin gerektirir.

## Audit Gereksinimi

Aşağıdaki işlemler loglanmalıdır:

- Gözlem kaydı oluşturma
- Gözlem kaydı güncelleme
- Rehberlik detay kaydı görüntüleme
- Rehberlik notu oluşturma/güncelleme/silme
- Risk sinyali değerlendirme
- Destek planı durumu değiştirme

