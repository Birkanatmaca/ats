import type { Announcement, GuardianAttendanceRecord, GuardianNotification, Lesson, Tenant } from "../../lib/api";

export type GuardianChild = {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
  tenantName: string;
  avatarTone: "amber" | "sky" | "emerald";
};

export type GuardianNotice = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warning";
};

export type GuardianData = {
  tenant?: Tenant;
  scheduleLessons: Lesson[];
  announcements: Announcement[];
  attendanceRecords: GuardianAttendanceRecord[];
  notifications: GuardianNotification[];
};

export type { GuardianAttendanceRecord, GuardianNotification };
