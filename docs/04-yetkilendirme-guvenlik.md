# Yetkilendirme ve Güvenlik

## Model

Sistem rol bazlı ve kapsam bazlı erişim modelini birlikte kullanmalıdır.

- Rol bazlı yetki: Kullanıcının hangi işlemleri yapabileceğini belirler.
- Kapsam bazlı yetki: Kullanıcının hangi kurum, sınıf veya öğrenci verisine erişebileceğini belirler.

Örnek:

- Öğretmen gözlem ekleme yetkisine sahip olabilir.
- Ancak yalnızca kendi ders verdiği sınıflardaki öğrenciler için gözlem ekleyebilir.

## Roller

### Sistem Yöneticisi

- Kurumları yönetir.
- Lisans ve planları yönetir.
- Sistem genelindeki teknik ayarları yönetir.
- Kurum içi hassas öğrenci kayıtlarını varsayılan olarak görmemelidir.

### Müdür/Yönetici

- Kurum verilerini yönetir.
- Kullanıcı, sınıf, öğrenci ve öğretmen tanımlayabilir.
- Ders programını oluşturabilir ve yayınlayabilir.
- Dashboard ve özet raporları görebilir.
- Hassas rehberlik verilerine erişimi kurum politikasıyla sınırlandırılmalıdır.

### Rehberlik Birimi

- Öğrenci gözlemlerini görebilir.
- Rehberlik notu, görüşme kaydı ve takip planı oluşturabilir.
- Risk sinyallerini değerlendirebilir.
- Hassas kayıtları yönetebilir.

### Öğretmen

- Kendi ders programını görebilir.
- Kendi dersleri için yoklama alabilir.
- Kendi öğrencileri için gözlem girebilir.
- Rehberlik detay kayıtlarını göremez.

### Veli

- Yalnızca kendi çocuğunun bilgilerini görür.
- Ders programı, devamsızlık ve duyuruları görüntüler.
- Başka öğrenci veya sınıf verisine erişemez.

## Yetki Seviyeleri

Önerilen veri güvenlik seviyeleri:

- `public_school`: Kurum içi genel duyuru ve görünür bilgiler.
- `operational`: Ders programı, yoklama, sınıf listesi gibi operasyonel veriler.
- `sensitive_student`: Öğrenci gözlemleri ve davranış notları.
- `guidance_confidential`: Rehberlik görüşmeleri, takip planları ve özel notlar.
- `system_confidential`: Sistem, lisans ve güvenlik kayıtları.

## Audit Log Gerektiren İşlemler

- Kullanıcı rol değişikliği
- Yetki kapsamı değişikliği
- Ders programı yayınlama
- Yayınlanmış ders programını değiştirme
- Yoklama kaydını sonradan değiştirme
- Öğrenci gözlemi oluşturma/güncelleme/silme
- Rehberlik kaydı görüntüleme
- Rehberlik kaydı oluşturma/güncelleme/silme
- Veli erişimi ekleme veya kaldırma

## API Güvenlik Kuralları

- Her API isteği tenant bağlamı ile değerlendirilmelidir.
- Kullanıcı role sahip olsa bile tenant scope olmadan veri alamamalıdır.
- ID üzerinden erişimlerde mutlaka `tenant_id` kontrolü yapılmalıdır.
- Hassas endpoint'lerde audit log otomatik yazılmalıdır.
- Mobil cihaz token'ları kullanıcı ve tenant ile ilişkilendirilmelidir.

## Kimlik Doğrulama

MVP için öneri:

- Email/telefon + şifre ile giriş
- Access token + refresh token
- Şifre sıfırlama
- Mobil cihaz oturum yönetimi

Sonraki faz:

- Çok faktörlü giriş
- SSO
- Kurum bazlı parola politikası
- Oturum risk analizi

## Veri Koruma İlkeleri

- Hassas öğrenci notları genel raporlarda ham metin olarak gösterilmemelidir.
- AI analizlerinde gereksiz kişisel veri kullanılmamalıdır.
- Raporlar mümkün olduğunca özetlenmiş ve yetkiye göre maskelemiş veri sunmalıdır.
- Her kullanıcı yalnızca işi için gerekli minimum veriye erişmelidir.

