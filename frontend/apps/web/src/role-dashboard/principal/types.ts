import type { Announcement, PrincipalSummary, Schedule, Tenant } from "../../lib/api";

export type PrincipalConsoleData = {
  tenant?: Tenant;
  summary?: PrincipalSummary;
  schedule?: Schedule;
  announcements: Announcement[];
};

export type SchoolClass = {
  id: string;
  name: string;
  createdAt: string;
};

export type ClassSection = {
  id: string;
  classId: string;
  name: string;
  gradeLevel: string;
  advisor: string;
  capacity: number;
  createdAt: string;
};

export type ClassStudent = {
  id: string;
  classId: string;
  sectionId: string;
  schoolNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  status: "active" | "passive";
  createdAt: string;
  updatedAt?: string;
};

/** Müdür panelinde yönetilen öğretmen kaydı (yerel taslak; API ile eşlenebilir). */
export type PrincipalManagedTeacher = {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  branch: string;
  weeklyLessonHours: number;
  classId: string | null;
  className: string | null;
  username: string;
  /** İlk girişte şifre değişikliği bekleniyor (tek kullanımlık şifre henüz tüketilmedi). */
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt?: string;
};
