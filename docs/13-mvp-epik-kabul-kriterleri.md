# MVP Epik ve Kabul Kriterleri

Bu dosya, ilk geliştirme sürecinde issue veya task sistemine aktarılabilecek epik seviyesinde iş listesidir.

## Epic 1: Auth, Tenant ve Yetki Altyapısı

Amaç: Her kullanıcının doğru kurum, rol ve kapsam içinde çalışmasını sağlamak.

Kullanıcı hikayeleri:

- Sistem yöneticisi olarak yeni bir kurum oluşturabilmek istiyorum.
- Yönetici olarak kurumuma kullanıcı ekleyebilmek istiyorum.
- Yönetici olarak kullanıcıya rol atayabilmek istiyorum.
- Kullanıcı olarak güvenli şekilde giriş yapabilmek istiyorum.

Kabul kriterleri:

- Kullanıcı başka tenant verisine erişemez.
- Token süresi dolduğunda refresh akışı çalışır.
- Rolü olmayan kullanıcı korumalı endpoint'lere erişemez.
- Yetki değişiklikleri audit log'a yazılır.

## Epic 2: Okul Temel Tanımları

Amaç: Ders programı ve yoklama için gerekli kurum verilerini yönetmek.

Kullanıcı hikayeleri:

- Yönetici olarak sınıf oluşturabilmek istiyorum.
- Yönetici olarak öğrenci ve veli kaydı oluşturabilmek istiyorum.
- Yönetici olarak öğretmen ve ders tanımlayabilmek istiyorum.
- Yönetici olarak öğretmeni dersle eşleştirebilmek istiyorum.

Kabul kriterleri:

- Öğrenci bir veya daha fazla veli ile ilişkilendirilebilir.
- Veli yalnızca ilişkili olduğu öğrenciyi görebilir.
- Öğretmen yalnızca tenant içindeki derslerle eşleştirilebilir.
- Liste ekranlarında arama ve pagination bulunur.

## Epic 3: AI Destekli Ders Programı MVP

Amaç: Yöneticiye uygulanabilir bir ders programı önerisi üretmek ve bunu yayınlamak.

Kullanıcı hikayeleri:

- Yönetici olarak sınıfın haftalık ders saatlerini tanımlayabilmek istiyorum.
- Yönetici olarak öğretmen müsaitliklerini girebilmek istiyorum.
- Yönetici olarak sistemden ders programı önerisi alabilmek istiyorum.
- Yönetici olarak önerilen programı düzenleyip yayınlayabilmek istiyorum.

Kabul kriterleri:

- Öğretmen aynı zaman diliminde iki derse atanamaz.
- Sınıf aynı zaman diliminde iki ders alamaz.
- Eksik veri varsa program üretimi anlaşılır hata verir.
- Yayınlanan program öğretmen takviminde görünür.
- Yayınlama işlemi audit log'a yazılır.

## Epic 4: Öğretmen Takvimi ve Akıllı Yoklama

Amaç: Öğretmenin günlük dersini hızlı görmesini ve doğru yoklamayı almasını sağlamak.

Kullanıcı hikayeleri:

- Öğretmen olarak bugünkü derslerimi görebilmek istiyorum.
- Öğretmen olarak "yoklama al" dediğimde aktif dersin otomatik açılmasını istiyorum.
- Öğretmen olarak öğrencileri geldi/gelmedi/geç kaldı/izinli şeklinde işaretleyebilmek istiyorum.

Kabul kriterleri:

- Aktif ders yayınlanmış programa göre bulunur.
- Aktif ders yoksa öğretmene açık bilgi verilir.
- Yoklama kaydı öğrenci bazında tekil tutulur.
- Sonradan değişiklik audit log'a yazılır.
- Yoklama tamamlandığında devamsızlık bildirimi için event oluşur.

## Epic 5: Veli Bilgilendirme

Amaç: Velinin çocuğuna ait operasyonel bilgileri güvenli şekilde görmesini sağlamak.

Kullanıcı hikayeleri:

- Veli olarak çocuğumun ders programını görebilmek istiyorum.
- Veli olarak devamsızlık bilgisini görebilmek istiyorum.
- Veli olarak okul duyurularını takip edebilmek istiyorum.
- Veli olarak bildirimlerimi okuyabilmek istiyorum.

Kabul kriterleri:

- Veli başka öğrenci verisine erişemez.
- Devamsızlık verisi yoklama kayıtlarından gelir.
- Duyurular hedef kitleye göre filtrelenir.
- Okunan bildirim tekrar okunmamış görünmez.

## Epic 6: Müdür Dashboard

Amaç: Yöneticiye kurumun günlük operasyonunu hızlı özetlemek.

Kullanıcı hikayeleri:

- Müdür olarak bugünkü ders ve yoklama durumunu görebilmek istiyorum.
- Müdür olarak sınıf bazlı devamsızlık özetini görebilmek istiyorum.
- Müdür olarak alınmamış yoklamaları fark edebilmek istiyorum.

Kabul kriterleri:

- Dashboard tenant scope ile çalışır.
- Bugünün metrikleri kurum timezone'una göre hesaplanır.
- Alınmamış yoklamalar yayınlanmış programa göre belirlenir.
- Hassas rehberlik notları dashboard'da ham metin olarak gösterilmez.

## Epic 7: Basit Öğrenci Gözlemleri

Amaç: Öğretmenlerin öğrenciyle ilgili yapılandırılmış gözlem kaydı girmesini sağlamak.

Kullanıcı hikayeleri:

- Öğretmen olarak kendi öğrencim için gözlem girebilmek istiyorum.
- Rehberlik personeli olarak gözlem kayıtlarını listeleyebilmek istiyorum.
- Yönetici olarak öğrenci destek süreci için özet veri görebilmek istiyorum.

Kabul kriterleri:

- Öğretmen yalnızca kendi kapsamındaki öğrenciye gözlem girebilir.
- Gözlem kaydı kategori, tarih ve not içerir.
- Gözlem kayıtları hassas veri olarak işaretlenir.
- Rehberlik görüntülemeleri audit log'a yazılır.

## Epic 8: Bildirim ve Duyuru Altyapısı

Amaç: Kurum duyurularını ve operasyonel bildirimleri doğru hedeflere ulaştırmak.

Kullanıcı hikayeleri:

- Yönetici olarak duyuru oluşturabilmek istiyorum.
- Veli olarak bana gönderilen duyuruları görebilmek istiyorum.
- Öğretmen olarak ders programı değişikliklerinden haberdar olmak istiyorum.

Kabul kriterleri:

- Duyuru hedef kitlesi rol, sınıf veya kullanıcı bazında seçilebilir.
- Bildirimler kullanıcı bazında okunma durumu tutar.
- Devamsızlık bildirimi yoklama kaydına bağlıdır.
- Başarısız push gönderimi uygulama içi bildirimi silmez.

