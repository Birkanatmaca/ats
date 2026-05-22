import type { Lesson } from "../../../lib/api";

export const WEEKDAY_LABELS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;

/** Okul haftası: Pazartesi–Cumartesi */
export const SCHOOL_WEEK_DAYS = [1, 2, 3, 4, 5, 6] as const;

export function currentWeekday(): number {
  return new Date().getDay();
}

export function weekdayLabel(day: number): string {
  return WEEKDAY_LABELS[day] ?? "Gün";
}

export function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }
    return a.startTime.localeCompare(b.startTime, "tr-TR");
  });
}

export function formatLessonRange(lesson: Lesson): string {
  return `${lesson.startTime} – ${lesson.endTime}`;
}

const ATTENDANCE_WINDOW_MS = 10 * 60 * 1000;

export function isLessonInAttendanceWindow(lesson: Lesson, now = new Date()): boolean {
  const start = new Date(lesson.startsAt).getTime() - ATTENDANCE_WINDOW_MS;
  const end = new Date(lesson.endsAt).getTime() + ATTENDANCE_WINDOW_MS;
  const time = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return false;
  }
  return time >= start && time <= end;
}

export function attendanceWindowLabel(lesson: Lesson): string {
  const start = new Date(new Date(lesson.startsAt).getTime() - ATTENDANCE_WINDOW_MS);
  const end = new Date(new Date(lesson.endsAt).getTime() + ATTENDANCE_WINDOW_MS);
  const fmt = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function buildTimeSlots(lessons: Lesson[]): string[] {
  const slots = new Set<string>();
  for (const lesson of lessons) {
    if (lesson.startTime.trim()) {
      slots.add(lesson.startTime);
    }
  }
  return [...slots].sort((a, b) => a.localeCompare(b, "tr-TR"));
}

export function lessonsForDay(lessons: Lesson[], dayOfWeek: number): Lesson[] {
  return sortLessons(lessons.filter((lesson) => lesson.dayOfWeek === dayOfWeek));
}

export function lessonAtSlot(lessons: Lesson[], dayOfWeek: number, startTime: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.dayOfWeek === dayOfWeek && lesson.startTime === startTime);
}
