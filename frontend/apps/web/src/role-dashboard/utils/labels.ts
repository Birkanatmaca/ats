export const announcementAudienceOptions = [
  { value: "all", label: "Tüm kurum" },
  { value: "teachers", label: "Öğretmenler" },
  { value: "guardians", label: "Veliler" }
] as const;

export function announcementAudienceLabel(value: string) {
  if (value.startsWith("class:")) {
    return "Sınıf hedefli";
  }
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

export const supportTicketStatuses = [
  { value: "all", label: "Tüm durumlar" },
  { value: "open", label: "Açık" },
  { value: "in_review", label: "İnceleniyor" },
  { value: "resolved", label: "Çözüldü" },
  { value: "closed", label: "Kapalı" }
] as const;

export function supportTicketStatusLabel(value: string) {
  const labels: Record<string, string> = {
    open: "Açık",
    in_review: "İnceleniyor",
    resolved: "Çözüldü",
    closed: "Kapalı"
  };
  return labels[value] ?? value;
}

export function supportTicketStatusBadgeClass(status: string) {
  if (status === "open") {
    return "guidance-data-badge guidance-data-badge--amber";
  }
  if (status === "in_review") {
    return "guidance-data-badge guidance-data-badge--violet";
  }
  if (status === "resolved") {
    return "guidance-data-badge guidance-data-badge--emerald";
  }
  return "guidance-data-badge guidance-data-badge--slate";
}

export function notificationKindLabel(kind: string) {
  if (kind.includes("absence") || kind.includes("attendance")) {
    return "Devamsızlık";
  }
  if (kind.includes("announcement")) {
    return "Duyuru";
  }
  if (kind.includes("observation")) {
    return "Gözlem";
  }
  return "Bildirim";
}
