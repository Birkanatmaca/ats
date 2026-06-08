# Akıllı Okul Yönetim Platformu

Bu depo, özel okul, kolej, kreş, kurs ve etüt merkezleri için geliştirilecek web ve mobil tabanlı okul yönetim platformunun ürün, mimari ve geliştirme dokümantasyonunu içerir.

Teknik ana kararlar:

- Backend: Go
- Web frontend: React
- Mobil frontend: React ekosistemi içinde ayrı mobil uygulama; önerilen yön React Native/Expo
- Veritabanı: PostgreSQL
- Mimari yaklaşım: modüler SaaS, kurum bazlı veri izolasyonu, rol ve kapsam bazlı yetkilendirme

Başlangıç noktası için [dokümantasyon indeksi](docs/README.md) dosyasını takip edin.

## Geliştirme

Backend API:

```bash
make backend-dev
```

Web panel:

```bash
cd frontend/apps/web
npm install
make -C ../../.. web-dev
```

PostgreSQL:

```bash
make postgres-up
```

Kalıcı veritabanı şeması [backend/migrations/000001_initial_schema.sql](backend/migrations/000001_initial_schema.sql) ve devam migration dosyaları içinde tutulur. API varsayılan olarak PostgreSQL bağlantısı bekler. Lokal demo için kalıcı olmayan in-memory repository kullanılacaksa `ALLOW_IN_MEMORY_FALLBACK=true` açıkça verilmelidir.

## Geliştirme Süper Admin

İlk migration içinde geliştirme amaçlı süper admin hesabı seed edilir:

- E-posta: `superadmin@ots.local`
- Şifre: `OtsAdmin!2026`

Atlas demo seed'i ayrıca şoför mobil akışı için `sofor@atlas.k12.tr` / `OtsSofor!2026` hesabını ve örnek 5/A servis rotasını ekler.

Bu hesap yalnızca geliştirme başlangıcı içindir; gerçek deployment öncesinde şifre ve parola hash stratejisi production standardına taşınmalıdır.
