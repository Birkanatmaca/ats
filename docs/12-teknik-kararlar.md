# Teknik Kararlar

## Backend

Karar: Go ile modüler monolit.

Gerekçe:

- Performanslı ve sade deployment.
- Güçlü concurrency modeli.
- API ve background job işlerini aynı kod tabanında yönetebilme.
- MVP için mikroservis maliyetinden kaçınma.

## Frontend

Karar: React web panel.

Gerekçe:

- Yönetim paneli ve yoğun veri ekranları için güçlü ekosistem.
- Calendar, table, form ve dashboard bileşenleri için geniş kütüphane desteği.
- API client ve domain type paylaşımı kolay.

## Mobil

Karar önerisi: React Native/Expo.

Gerekçe:

- React bilgisi mobil tarafa taşınabilir.
- Öğretmen ve veli akışları için hızlı geliştirme sağlar.
- Push notification, cihaz oturumu ve mobil dağıtım süreçleri daha pratiktir.

## Veritabanı

Karar: PostgreSQL.

Gerekçe:

- İlişkisel okul verisi için uygun.
- Transaction desteği güçlü.
- Raporlama ve veri bütünlüğü için yeterli.
- JSONB gibi esnek alanlarla bazı ayar verileri taşınabilir.

## Dosya Depolama

Karar: İlk canlı dilim için lokal disk + PostgreSQL `file_uploads` registry.

Gerekçe:

- Mevcut deploy tek sunucu üzerinde çalıştığı için S3/MinIO bağımlılığı eklemeden hızlı ve kontrollü canlıya alınabilir.
- Dosyanın binary içeriği `FILE_STORAGE_PATH` altında, metadata ve kaynak bağlantısı PostgreSQL `file_uploads` tablosunda tutulur.
- `FILE_STORAGE_BASE_URL` ve `FILE_UPLOAD_MAX_MB` ile ortam bazlı ayar yapılabilir.
- Profil görselleri kontrollü public endpoint ile, rehberlik/duyuru/öğrenci belgeleri Bearer token ve kaynak bazlı yetki kontrolüyle servis edilir.

Sonraki faz: Birden fazla API instance'ı, CDN ihtiyacı veya yedekleme/retention politikası büyüdüğünde aynı storage interface arkasına MinIO/S3 adaptörü eklenmelidir.

## API

Karar: REST API ile başlamak.

Gerekçe:

- Web ve mobil client'lar için basit entegrasyon.
- MVP hızını artırır.
- Yetki ve audit middleware yapısı net kurulur.

GraphQL ancak çok karmaşık client veri ihtiyaçları ortaya çıkarsa değerlendirilmelidir.

## PDF ve Rapor Üretimi

Karar: İlk canlı dilim için PDF raporlar backend içinde üretilir ve dosya servisine `report` kategorisiyle kaydedilir.

Gerekçe:

- Devamsızlık, tahsilat makbuzu, rehberlik vaka özeti, öğrenci gelişim ve servis raporu aynı yetki modeliyle indirilebilir.
- PDF binary içeriği mevcut `FILE_STORAGE_PATH` altında tutulur; metadata PostgreSQL `file_uploads` registry üzerinden ilgili öğrenci, vaka, tahsilat hesabı veya servis seferine bağlanır.
- Web ve mobil client'lar rapor üretiminde aynı REST endpointlerini kullanır; web paneli üretilen PDF'leri ilgili kaynak ekranında listeler.

## Ders Programı Motoru

Karar: İlk aşamada backend içinde constraint tabanlı scheduling engine.

Gerekçe:

- Hard constraint'ler deterministik doğrulanmalıdır.
- AI/LLM yalnızca öneri, açıklama ve soft constraint desteği vermelidir.
- Ayrı servis ihtiyacı performans veya optimizasyon karmaşıklığı büyüdüğünde ele alınmalıdır.

## Test Stratejisi

Öncelikler:

- Backend unit test: domain kuralları
- Backend integration test: repository ve API
- Scheduling test: çakışma ve program doğrulama senaryoları
- Attendance test: aktif ders bulma ve yoklama kaydetme
- Auth test: role/scope kontrolü
- Frontend test: kritik form ve akışlar

## Observability

MVP için:

- Structured logging
- Request ID
- Error tracking
- Audit log
- Basic metrics

Sonraki faz:

- Distributed tracing
- Queue metrics
- AI job metrics
- Tenant bazlı kullanım analitiği

## Deployment

MVP için önerilen basit yapı:

- Go API container
- Web frontend static build
- PostgreSQL managed database
- Background job worker aynı image içinde ayrı process
- Object storage sonraki ihtiyaçlar için ayrılabilir

## Riskler

- Tenant izolasyonu zayıf tasarlanırsa güvenlik riski büyür.
- Ders programı motoru fazla erken karmaşıklaştırılırsa MVP yavaşlar.
- Rehberlik verileri yeterince ayrılmazsa hassas veri riski oluşur.
- Mobil yoklama akışı hızlı değilse ürünün temel değeri zayıflar.
- AI özellikleri karar verici gibi konumlandırılırsa hukuki ve etik risk doğar.

## Mimari Kural

Yeni özellik eklenirken şu sorular cevaplanmadan geliştirme başlamamalıdır:

- Hangi kullanıcı rolü kullanacak?
- Hangi tenant/sınıf/öğrenci kapsamına bağlı?
- Hangi veri hassasiyet seviyesinde?
- Audit log gerekli mi?
- MVP için zorunlu mu, sonraki faza bırakılabilir mi?
- Web mi mobil mi, yoksa ikisi de mi etkilenecek?
