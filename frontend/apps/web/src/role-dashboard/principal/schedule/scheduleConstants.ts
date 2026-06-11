export const WEEKDAY_LABELS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;

export const SCHOOL_WEEK_DAYS = [1, 2, 3, 4, 5, 6] as const;

export const SCHEDULE_TIME_SLOTS: Array<{ start: string; end: string; label: string }> = [
  { start: "08:00", end: "08:40", label: "08:00" },
  { start: "08:40", end: "09:20", label: "08:40" },
  { start: "09:20", end: "10:00", label: "09:20" },
  { start: "10:00", end: "10:40", label: "10:00" },
  { start: "10:40", end: "11:20", label: "10:40" },
  { start: "11:20", end: "12:00", label: "11:20" },
  { start: "12:00", end: "12:40", label: "12:00" },
  { start: "12:40", end: "13:20", label: "12:40" },
  { start: "13:20", end: "14:00", label: "13:20" },
  { start: "14:00", end: "14:40", label: "14:00" },
  { start: "14:20", end: "15:00", label: "14:20" }
];

export function weekdayLabel(day: number) {
  return WEEKDAY_LABELS[day] ?? "Gün";
}

export function availabilitySlotKey(day: number, start: string) {
  return `${day}-${start}`;
}
