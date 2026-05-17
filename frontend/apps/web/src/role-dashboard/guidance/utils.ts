import type { Observation } from "../../lib/api";
import { categoryLabel } from "../utils";
import { guidanceCategoryPriority, riskCategories } from "./data";
import type { GuidanceRiskSignal, GuidanceStudentSupport } from "./types";

export function buildGuidanceRiskSignals(observations: Observation[]): GuidanceRiskSignal[] {
  const grouped = new Map<string, Observation[]>();
  for (const observation of observations.filter((item) => riskCategories.includes(item.category))) {
    const key = `${observation.studentId}:${observation.category}`;
    grouped.set(key, [...(grouped.get(key) ?? []), observation]);
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
        summary: `${categoryLabel(latest.category)} sinyali insan değerlendirmesi bekliyor.`,
        lastSeenAt: latest.createdAt
      };
    })
    .sort((a, b) => levelRank(b.level) - levelRank(a.level) || new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
}

export function buildGuidanceStudentSupports(observations: Observation[]): GuidanceStudentSupport[] {
  const grouped = new Map<string, Observation[]>();
  for (const observation of observations) {
    grouped.set(observation.studentId, [...(grouped.get(observation.studentId) ?? []), observation]);
  }

  return [...grouped.values()]
    .map((items) => {
      const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latest = sorted[0];
      const riskCount = sorted.filter((item) => riskCategories.includes(item.category)).length;
      const status: GuidanceStudentSupport["status"] = riskCount > 0 ? "review" : sorted.length > 1 ? "monitoring" : "stable";
      return {
        studentId: latest.studentId,
        studentName: latest.studentName,
        className: latest.className,
        observationCount: sorted.length,
        riskCount,
        lastCategory: latest.category,
        lastSeenAt: latest.createdAt,
        status
      };
    })
    .sort((a, b) => b.riskCount - a.riskCount || new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
}

export function levelLabel(level: string) {
  const labels: Record<string, string> = {
    high: "Yüksek",
    medium: "Orta",
    low: "Düşük"
  };
  return labels[level] ?? level;
}

export function supportStatusLabel(status: string) {
  const labels: Record<string, string> = {
    review: "İncelemede",
    monitoring: "Takipte",
    stable: "Stabil",
    open: "Açık",
    closed: "Kapalı"
  };
  return labels[status] ?? status;
}

export function formatGuidanceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function levelRank(level: string) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}
