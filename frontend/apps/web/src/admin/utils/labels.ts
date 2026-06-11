export function roleLabel(value: string) {
  const labels: Record<string, string> = {
    super_admin: "Süper Admin",
    system_admin: "Sistem Yöneticisi",
    principal: "Müdür",
    guidance: "Rehberlik",
    teacher: "Öğretmen",
    guardian: "Veli",
    driver: "Şoför"
  };
  return labels[value] ?? value;
}

export function statusLabel(value: string) {
  const labels: Record<string, string> = {
    active: "Aktif",
    trial: "Deneme",
    review: "İncelemede",
    invited: "Davetli",
    first_login: "İlk giriş bekliyor",
    passive: "Pasif",
    configured: "Tanımlı",
    missing: "Eksik",
    operational: "Çalışıyor",
    limited: "Sınırlı",
    planned: "Planlandı",
    healthy: "Sağlıklı",
    warning: "Uyarı",
    critical: "Kritik",
    loading: "Yükleniyor",
    open: "Açık",
    in_review: "İncelemede",
    resolved: "Çözüldü",
    closed: "Kapalı",
    support: "Destek",
    complaint: "Şikayet",
    suggestion: "Öneri",
    report: "Rapor",
    low: "Düşük",
    normal: "Normal",
    high: "Yüksek",
    urgent: "Acil"
  };
  return labels[value] ?? value;
}

export function formatTRY(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(value);
}
