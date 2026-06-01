import type { Lesson } from "@/shared/api/types";

export const WEEKDAY_LABELS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;

export const SCHOOL_WEEK_DAYS = [1, 2, 3, 4, 5, 6] as const;

const ATTENDANCE_WINDOW_MS = 10 * 60 * 1000;

export function currentWeekday(): number {
  return new Date().getDay();
}

export function weekdayLabel(day: number): string {
  return WEEKDAY_LABELS[day] ?? "Gün";
}

export function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime, "tr-TR");
  });
}

export function formatLessonRange(lesson: Lesson): string {
  return `${lesson.startTime} – ${lesson.endTime}`;
}

export function isLessonInAttendanceWindow(lesson: Lesson, now = new Date()): boolean {
  const start = new Date(lesson.startsAt).getTime() - ATTENDANCE_WINDOW_MS;
  const end = new Date(lesson.endsAt).getTime() + ATTENDANCE_WINDOW_MS;
  const time = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  return time >= start && time <= end;
}

export function attendanceWindowLabel(lesson: Lesson): string {
  const start = new Date(new Date(lesson.startsAt).getTime() - ATTENDANCE_WINDOW_MS);
  const end = new Date(new Date(lesson.endsAt).getTime() + ATTENDANCE_WINDOW_MS);
  const fmt = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function lessonsForDay(lessons: Lesson[], dayOfWeek: number): Lesson[] {
  return sortLessons(lessons.filter((l) => l.dayOfWeek === dayOfWeek));
}

/** Backend greedy engine slotları (40 dk, 08:00–15:00) */
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

export function slotForTime(startTime: string): { start: string; end: string } | null {
  const normalized = startTime.slice(0, 5);
  return SCHEDULE_TIME_SLOTS.find((slot) => slot.start === normalized) ?? null;
}
