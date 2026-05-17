import type { GuidancePlan } from "./types";

export const riskCategories = ["attention", "absence_risk", "academic_drop", "behavior"];

export const guidancePlans: GuidancePlan[] = [
  {
    id: "plan-1",
    studentName: "Efe Demir",
    className: "5/A",
    owner: "Selin Ergin",
    title: "Dikkat gözlemi takip görüşmesi",
    status: "monitoring",
    dueDate: "2026-05-20"
  },
  {
    id: "plan-2",
    studentName: "Elif Aydın",
    className: "6/B",
    owner: "Selin Ergin",
    title: "Devamsızlık eğilimi veli bilgilendirme",
    status: "open",
    dueDate: "2026-05-22"
  },
  {
    id: "plan-3",
    studentName: "Mina Kaya",
    className: "5/A",
    owner: "Rehberlik birimi",
    title: "Sosyal uyum kısa izlem",
    status: "closed",
    dueDate: "2026-05-12"
  }
];

export const guidanceCategoryPriority: Record<string, "low" | "medium" | "high"> = {
  attention: "medium",
  absence_risk: "high",
  academic_drop: "high",
  behavior: "medium",
  social: "low",
  participation: "low",
  teacher_note: "low"
};
