import type { SchedulingRequirement, TeacherAvailability } from "../../../lib/api";
import type { PrincipalManagedTeacher, SchoolClass } from "../types";

export type ScheduleReadinessItem = {
  id: string;
  ok: boolean;
  label: string;
  detail?: string;
};

export function evaluateScheduleReadiness({
  classes,
  teachers,
  requirements,
  availabilities
}: {
  classes: SchoolClass[];
  teachers: PrincipalManagedTeacher[];
  requirements: SchedulingRequirement[];
  availabilities: TeacherAvailability[];
}): ScheduleReadinessItem[] {
  const activeRequirements = requirements.filter((item) => item.weeklyHours > 0);
  const classIdsWithRequirements = new Set(activeRequirements.map((item) => item.classId));
  const classesMissingRequirements = classes.filter((item) => !classIdsWithRequirements.has(item.id));

  const availabilityByTeacher = new Map<string, number>();
  for (const item of availabilities) {
    const key = item.teacherId || item.teacherUserId;
    availabilityByTeacher.set(key, (availabilityByTeacher.get(key) ?? 0) + 1);
  }

  const teachersWithoutAvailability = teachers.filter((teacher) => (availabilityByTeacher.get(teacher.id) ?? 0) === 0);
  const totalWeeklyHours = activeRequirements.reduce((sum, item) => sum + item.weeklyHours, 0);

  return [
    {
      id: "classes",
      ok: classes.length > 0,
      label: "Sınıf tanımı",
      detail: classes.length > 0 ? `${classes.length} sınıf` : "En az bir sınıf gerekli"
    },
    {
      id: "teachers",
      ok: teachers.length > 0,
      label: "Öğretmen tanımı",
      detail: teachers.length > 0 ? `${teachers.length} öğretmen` : "Öğretmen kaydı gerekli"
    },
    {
      id: "requirements",
      ok: activeRequirements.length > 0,
      label: "Ders saat ihtiyacı",
      detail:
        activeRequirements.length > 0
          ? `${activeRequirements.length} kural · ${totalWeeklyHours} saat/hafta`
          : "Sınıf-ders haftalık saatleri girilmeli"
    },
    {
      id: "requirements-per-class",
      ok: classes.length === 0 || classesMissingRequirements.length === 0,
      label: "Sınıf bazlı ihtiyaç kapsamı",
      detail:
        classesMissingRequirements.length === 0
          ? "Tüm sınıflar kapsanıyor"
          : `${classesMissingRequirements.length} sınıfta ihtiyaç eksik`
    },
    {
      id: "availability",
      ok: teachers.length === 0 || teachersWithoutAvailability.length === 0,
      label: "Öğretmen müsaitliği",
      detail:
        teachersWithoutAvailability.length === 0
          ? `${availabilities.length} müsaitlik slotu`
          : `${teachersWithoutAvailability.length} öğretmende müsaitlik yok`
    }
  ];
}

export function scheduleReadinessReady(items: ScheduleReadinessItem[]) {
  return items.every((item) => item.ok);
}
