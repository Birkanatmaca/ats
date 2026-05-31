import type { Observation } from "@/shared/api/types";
import { categoryLabel } from "@/shared/utils/labels";

export const riskCategories = ["attention", "absence_risk", "academic_drop", "behavior"];

const guidanceCategoryPriority: Record<string, "low" | "medium" | "high"> = {
  attention: "medium",
  absence_risk: "high",
  academic_drop: "high",
  behavior: "medium"
};

export type GuidanceRiskSignal = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  category: string;
  level: string;
  sourceCount: number;
  summary: string;
  lastSeenAt: string;
};

function levelRank(level: string) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

export function buildGuidanceRiskSignals(observations: Observation[]): GuidanceRiskSignal[] {
  const grouped = new Map<string, Observation[]>();
  for (const o of observations.filter((item) => riskCategories.includes(item.category))) {
    const key = `${o.studentId}:${o.category}`;
    grouped.set(key, [...(grouped.get(key) ?? []), o]);
  }
  return [...grouped.values()]
    .map((items) => {
      const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latest = sorted[0];
      const level = sorted.length > 1 ? "high" : guidanceCategoryPriority[latest.category] ?? "medium";
      return {
        id: `${latest.studentId}-${latest.category}`,
        studentId: latest.studentId,
        studentName: latest.studentName,
        className: latest.className,
        category: latest.category,
        level,
        sourceCount: sorted.length,
        summary: `${categoryLabel(latest.category)} sinyali değerlendirme bekliyor.`,
        lastSeenAt: latest.createdAt
      };
    })
    .sort((a, b) => levelRank(b.level) - levelRank(a.level) || new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
}
