# OGTAŞIS Mobil

Expo / React Native uygulaması. Plan: `docs/18-mobile-dashboard-analizi-ve-ui-plani.md`.

## Geliştirme

```bash
cd frontend/apps/mobile
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://<backend-host>:8080
npm start
```

## Faz 1 (tamamlandı)

- **Öğretmen:** genel, dersler, yoklama (işaretle + finalize), gözlem ekleme
- **Veli:** çocuk seçici, genel, program, devamsızlık
- **Rehberlik:** genel KPI, öğrenci listesi, risk sinyalleri, not ekleme
- **Müdür:** dashboard özeti, öğrenci/sınıf listesi, günlük yoklama şube özeti

## Faz 0 (tamamlandı)

- Expo Router: `(auth)` login / ilk şifre, `(app)` rol kabukları
- SecureStore oturum, API client (login, refresh, logout, me, tenant)
- RoleGate: `principal` + `system_admin`, `teacher`, `guardian`, `guidance`; `super_admin` → web panel uyarısı
- Rol başına 5 bottom tab + Daha Fazla menüsü
- Ortak UI: `Screen`, `StatCard`, `ListCard`, `EmptyState`, `ErrorState`

## Faz 2 (tamamlandı)

- Duyuru, bildirim, destek, profil (tüm roller; müdür duyuru oluşturma)
- Müdür: öğretmen ekleme / şifre sıfırlama, program görüntüleme + oluştur/yayınla
- ogta.ai: FAB + tam ekran sheet, onay kartı (non-stream API)

## Sonraki adım (Faz 3)

Push bildirimleri, EAS build, tablet program builder, öğrenci import.
