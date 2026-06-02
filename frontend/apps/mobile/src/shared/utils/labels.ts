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

export function announcementAudienceLabel(value: string, audiences?: Array<{ type: string; id?: string; role?: string }>) {
  if (audiences?.length) {
    if (audiences.length > 1) return "Karma hedef";
    const target = audiences[0];
    if (target.type === "all") return "Tüm kurum";
    if (target.type === "role") {
      if (target.role === "teacher") return "Öğretmenler";
      if (target.role === "guardian") return "Veliler";
      return target.role ?? "Rol";
    }
    if (target.type === "class" || target.type === "section") return "Sınıf / şube";
    if (target.type === "student") return "Belirli öğrenci velileri";
  }
  if (value.startsWith("class:")) return "Sınıf hedefli";
  if (value === "mixed") return "Karma hedef";
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

export function sensitivityLabel(value: string) {
  const labels: Record<string, string> = {
    guidance_confidential: "Rehberlik gizli",
    sensitive_student: "Hassas öğrenci",
    standard: "Standart"
  };
  return labels[value] ?? value;
}
