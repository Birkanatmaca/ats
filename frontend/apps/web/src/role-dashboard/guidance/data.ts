import type { GuidancePlan } from "./types";

export const riskCategories = ["attention", "absence_risk", "academic_drop", "behavior"];

export const guidanceNoteTypes = [
  { value: "meeting", label: "Görüşme notu" },
  { value: "parent_contact", label: "Veli görüşmesi" },
  { value: "follow_up", label: "Takip kaydı" },
  { value: "observation", label: "Rehberlik gözlemi" },
  { value: "report", label: "İzleme raporu" }
] as const;

export const guidanceCategoryPriority: Record<string, "low" | "medium" | "high"> = {
  attention: "medium",
  absence_risk: "high",
  academic_drop: "high",
  behavior: "medium",
  social: "low",
  participation: "low",
  teacher_note: "low"
};

/** @deprecated Use API supportPlans */
export const guidancePlans: GuidancePlan[] = [];

export function noteTypeLabel(value: string) {
  return guidanceNoteTypes.find((item) => item.value === value)?.label ?? value;
}
