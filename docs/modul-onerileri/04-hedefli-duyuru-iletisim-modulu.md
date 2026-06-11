# 04 - Hedefli Duyuru ve İletişim Modülü

> Amaç: Duyuruları ve operasyonel bildirimleri doğru hedef kitleye, ölçülebilir ve denetlenebilir şekilde ulaştırmak.

---

## 1. Ürün Kararı

Bu modül iki katmandan oluşur:

1. **Manuel hedefli duyuru** — müdürün rol/sınıf/şube/öğrenci bazlı mesaj yayınlaması.
2. **Olay-tabanlı bildirim** — yoklama, servis, destek, program ve rehberlik olaylarının push + in-app olarak iletilmesi.

İkinci katman ürün değerini tamamlar; servis ve yoklama olayları kilit ekrandan görünmelidir.

---

## 2. Güncel Durum (2026-06)

### Tamamlanan

- `announcement_audiences`, `announcement_reads`, `announcement_templates` şeması.
- Backend audience resolver: `all`, `role`, `class`, `section`, `student`, `user`.
- Listeleme güvenlik filtresi (`UserMatchesAudience`).
- Duyuru publish + planlı yayın cron + push tetikleme.
- Yoklama finalize → veli push.
- Push tercihleri (mobil profil), delivery log, Expo sender.
- Müdür paneli: çoklu hedef, teslim/okundu metrikleri.
- Mobil müdür duyuru sheet: çoklu rol + sınıf + şube + öğrenci, taslak/yayınla.

### Bu sprintte tamamlanan

- **Tek bildirim boru hattı:** servis gecikme, trip başladı/bitti → `push.Service` (in-app + push + log + tercih).
- **`transport` bildirim kategorisi** ve mobil tercih anahtarı.
- Servis push deep link (veli → çocuk/servis ekranı).
- Gerçek `section` hedefleme (şube ID çözümü).
- Web veli/rehberlik duyuru okundu işaretleme.
- Aynı `kind` için tekrar push engeli.

### Sonraki faz

- Rehberlik/yoklama olaylarının aynı dispatcher üzerinden standardizasyonu.
- Harita/koordinat tabanlı gerçek ETA (durak lat/lng).
- Web şablon CRUD ekranı (şu an sadece seçici var).

---

## 3. Kapsam

### Dahil

- Rol, sınıf, şube, öğrenci/veli hedefleme.
- Okundu ve teslim metrikleri.
- Push + uygulama içi bildirim.
- Servis, yoklama, duyuru, destek, program, rehberlik kategorileri.
- Bildirim tercihleri ve delivery log.

### Hariç

- İki yönlü sohbet.
- SMS / e-posta kampanya motoru.

---

## 4. Bildirim Boru Hattı

```text
Domain olayı (duyuru publish, yoklama, servis trip, gecikme)
  → push.Service.sendToUser
    → tercih kontrolü
    → in-app notification (kind dedup)
    → Expo push
    → delivery log
```

Transport olayları artık repository'den doğrudan `notifications` tablosuna yazılmaz.

---

## 5. Servis Bildirim Tetikleyicileri

| Olay | Tetikleyici | Alıcı |
|------|-------------|-------|
| Trip başladı | `POST /driver/sharing/start` | Rota velileri |
| Trip bitti | `POST /driver/sharing/stop` | Rota velileri |
| Gecikme | `POST /services/routes/{id}/delay` | Rota velileri |

Gürültü kuralları:

- Rota PATCH otomatik bildirim göndermez.
- Aynı `kind` tekrarlanmaz.
- Gecikme bildirimi 5 dk bucket ile sınırlıdır.

---

## 6. API (özet)

Duyuru API'leri değişmedi. Push tercihlerine `transport` alanı eklendi.

```json
{
  "attendance": true,
  "announcements": true,
  "support": true,
  "guidance": true,
  "schedule": true,
  "transport": true
}
```

---

## 7. Kabul Kriterleri

- Müdür şube hedefli duyuru gönderdiğinde yalnızca ilgili veliler görür.
- Şoför paylaşım başlattığında rota velileri push + in-app alır.
- Gecikme bildirimi tercih kapalıysa `dropped` loglanır, tekrar spam yapmaz.
- Veli/rehberlik duyuruyu açınca okundu kaydı oluşur.
- Push tıklanınca guardian servis/çocuk ekranına gider.

---

## 8. Test Planı

- `UserMatchesAudience` section/class unit test.
- `NotifyTransportRouteGuardians` preference + push test.
- Transport handler: start/stop/delay smoke.
- Tenant izolasyonu ve hedeflenmeyen kullanıcı 403 testi.

---

## 9. Uygulama Sırası (güncel)

1. [x] Hedefli duyuru şeması ve resolver.
2. [x] Push altyapısı ve tercihler.
3. [x] Servis olaylarını push boru hattına bağlama.
4. [x] Şube hedefleme + mobil çoklu hedef.
5. [x] Teslim raporu (sent/dropped) ve şablon seçici + planlı yayın UI (web).
6. [x] Trip yaklaşıyor otomasyonu (planlı durak zamanı penceresi).
