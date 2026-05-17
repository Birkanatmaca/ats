import type { Announcement, Lesson, PrincipalSummary, Tenant } from "../../lib/api";

export type GuardianChild = {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
  tenantName: string;
  avatarTone: "amber" | "sky" | "emerald";
};

export type GuardianAttendanceRecord = {
  id: string;
  date: string;
  lesson: string;
  status: "present" | "absent" | "late" | "excused";
  note: string;
};

export type GuardianNotice = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warning";
};

export type GuardianData = {
  tenant?: Tenant;
  summary?: PrincipalSummary;
  scheduleLessons: Lesson[];
  announcements: Announcement[];
};
