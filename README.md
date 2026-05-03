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

Kalıcı veritabanı şeması [backend/migrations/000001_initial_schema.sql](backend/migrations/000001_initial_schema.sql) içinde tutulur. Mevcut API ilk geliştirme aşamasında demo in-memory repository ile çalışır; domain ve service sınırları PostgreSQL repository'ye geçiş için ayrılmıştır.

