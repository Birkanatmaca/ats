# Frontend ve Mobil Mimari

## Uygulama Ayrımı

Platform iki kullanıcı deneyimine ayrılır:

- Web panel: Müdür, yönetici ve rehberlik birimi.
- Mobil uygulama: Öğretmen ve veli.

React web için doğrudan kullanılmalıdır. Mobil tarafta React ekosistemiyle ilerlemek için React Native/Expo önerilir. Eğer mobil strateji daha sonra netleşecekse, API client ve domain type paketleri ortak tutularak karar ertelenebilir.

## Monorepo Önerisi

```text
frontend/
  apps/
    web/
    mobile/
  packages/
    api-client/
    domain-types/
    ui/
    auth/
```

## Web Panel Ana Ekranları

- Giriş
- Kurum dashboard
- Kullanıcı yönetimi
- Sınıf yönetimi
- Öğrenci yönetimi
- Öğretmen yönetimi
- Ders yönetimi
- Ders programı oluşturucu
- Program düzenleme ekranı
- Yoklama raporları
- Duyuru yönetimi
- Öğrenci gözlemleri
- Rehberlik listesi

## Mobil Öğretmen Ekranları

- Giriş
- Bugünkü dersler
- Aktif ders kartı
- Akıllı yoklama
- Yoklama geçmişi
- Öğrenci gözlemi ekleme
- Bildirimler

## Mobil Veli Ekranları

- Giriş
- Çocuk seçimi
- Ders programı
- Devamsızlık durumu
- Duyurular
- Bildirimler

## State Management

MVP için öneri:

- Server state: TanStack Query
- Formlar: React Hook Form
- Validation: Zod
- Auth state: küçük bir auth store
- UI state: lokal component state veya hafif store

## API Client

Ortak API client paketi kullanılmalıdır:

- Token ekleme
- Refresh token akışı
- Standart hata dönüştürme
- Tenant context header yönetimi
- Pagination helper'ları

## UX İlkeleri

Web panel:

- Operasyonel ve yoğun bilgiye uygun tasarım
- Dashboard kartları ölçülü ve okunabilir olmalı
- Ders programı ekranında sürükle-bırak ve çakışma uyarıları net olmalı
- Rehberlik verilerinde hassaslık seviyesi görsel olarak ayrılmalı

Mobil:

- Öğretmen yoklama akışı çok hızlı olmalı
- Günlük ders takvimi ilk ekranda görünmeli
- Veli uygulaması sade ve bilgi odaklı olmalı
- Bildirimler okunma durumu ile ayrılmalı

## Frontend Güvenlik Notları

- Frontend yetki kontrolü yalnızca UX amaçlıdır; asıl kontrol backend'de yapılır.
- Hassas route'lar rol ve permission'a göre gizlenmelidir.
- Token güvenliği mobil ve web için ayrı değerlendirilmelidir.
- Rehberlik notları cache politikası açısından dikkatli ele alınmalıdır.

## MVP Component Öncelikleri

- Auth layout
- Dashboard shell
- Data table
- Form field sistemi
- Role-aware navigation
- Calendar/timetable grid
- Attendance list
- Announcement list
- Observation form
- Notification list

