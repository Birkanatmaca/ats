export const observationCategories = [
  { value: "participation", label: "Derse katılım" },
  { value: "attention", label: "Dikkat durumu" },
  { value: "behavior", label: "Davranış değişikliği" },
  { value: "social", label: "Sosyal uyum" },
  { value: "absence_risk", label: "Devamsızlık eğilimi" },
  { value: "academic_drop", label: "Akademik düşüş" },
  { value: "teacher_note", label: "Öğretmen notu" }
] as const;

export function categoryLabel(value: string) {
  return observationCategories.find((c) => c.value === value)?.label ?? value;
}

export function attendanceLabel(value: string) {
  const labels: Record<string, string> = {
    present: "Geldi",
    absent: "Gelmedi",
    late: "Geç",
    excused: "İzinli",
    unknown: "Bekliyor"
  };
  return labels[value] ?? value;
}

export function riskLevelLabel(level: string) {
  const labels: Record<string, string> = { high: "Yüksek", medium: "Orta", low: "Düşük" };
  return labels[level] ?? level;
}

export const announcementAudienceOptions = [
  { value: "all", label: "Tüm kurum" },
  { value: "teachers", label: "Öğretmenler" },
  { value: "guardians", label: "Veliler" }
] as const;

export function announcementAudienceLabel(value: string) {
  if (value.startsWith("class:")) return "Sınıf hedefli";
  return announcementAudienceOptions.find((item) => item.value === value)?.label ?? value;
}

export const supportTicketTypes = [
  { value: "support", label: "Destek talebi" },
  { value: "complaint", label: "Şikayet" },
  { value: "suggestion", label: "Öneri" },
  { value: "report", label: "Rapor / hata" }
] as const;

export function supportTicketTypeLabel(value: string) {
  return supportTicketTypes.find((item) => item.value === value)?.label ?? value;
}

export function supportTicketStatusLabel(value: string) {
  const labels: Record<string, string> = {
    open: "Açık",
    in_review: "İnceleniyor",
    resolved: "Çözüldü",
    closed: "Kapalı"
  };
  return labels[value] ?? value;
}

export function notificationKindLabel(kind: string) {
  if (kind.includes("absence") || kind.includes("attendance")) return "Devamsızlık";
  if (kind.includes("announcement")) return "Duyuru";
  if (kind.includes("observation")) return "Gözlem";
  return "Bildirim";
}

export function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}
