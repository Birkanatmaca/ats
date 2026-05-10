import type { Announcement, CurrentLesson, Lesson, Observation, PrincipalSummary, Schedule, Tenant } from "../lib/api";

export type DashboardData = {
  tenant?: Tenant;
  summary?: PrincipalSummary;
  schedule?: Schedule;
  teacherLessons: Lesson[];
  currentLesson?: CurrentLesson;
  announcements: Announcement[];
  observations: Observation[];
};

export type CompactItem = {
  id: string;
  title: string;
  meta: string;
};
