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
