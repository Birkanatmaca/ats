import type { ScheduleChangeLog } from "../../../lib/api";

export function scheduleChangeLabel(changeType: string) {
  switch (changeType) {
    case "lesson.update":
      return "Ders güncellendi";
    default:
      return changeType;
  }
}

export function scheduleChangeSummary(item: ScheduleChangeLog) {
  const before = item.before ?? {};
  const after = item.after ?? {};
  const parts: string[] = [];
  if (before.dayOfWeek !== after.dayOfWeek || before.startTime !== after.startTime || before.endTime !== after.endTime) {
    parts.push(`${String(after.dayOfWeek ?? "-")}. gün ${String(after.startTime ?? "-")}-${String(after.endTime ?? "-")}`);
  }
  if (before.teacherId !== after.teacherId) {
    parts.push("öğretmen değişti");
  }
  if (before.room !== after.room) {
    parts.push(`oda: ${String(after.room ?? "belirtilmedi")}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Ders bilgileri güncellendi.";
}

export function formatScheduleChangeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function scheduleConflictTypeLabel(type: string) {
  switch (type) {
    case "teacher":
      return "Öğretmen";
    case "class":
      return "Sınıf";
    case "room":
      return "Derslik";
    case "requirement":
      return "İhtiyaç";
    case "teacher_availability":
      return "Müsaitlik";
    default:
      return "Uyarı";
  }
}
