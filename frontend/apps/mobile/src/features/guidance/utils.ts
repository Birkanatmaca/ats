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

export type GuidanceStudentSupport = {
  studentId: string;
  studentName: string;
  className: string;
  observationCount: number;
  riskCount: number;
  lastCategory: string;
  lastSeenAt: string;
  status: "review" | "monitoring" | "stable";
};

export function supportStatusLabel(status: string) {
  const labels: Record<string, string> = {
    review: "İncelemede",
    monitoring: "İzleniyor",
    stable: "Stabil",
    open: "Açık",
    closed: "Kapalı"
  };
  return labels[status] ?? status;
}

export function caseStatusLabel(status: string) {
  const labels: Record<string, string> = {
    open: "Açık",
    monitoring: "İzleniyor",
    closed: "Kapalı"
  };
  return labels[status] ?? status;
}

export function casePriorityLabel(priority: string) {
  const labels: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    critical: "Kritik"
  };
  return labels[priority] ?? priority;
}

export function caseEventTypeLabel(eventType: string) {
  const labels: Record<string, string> = {
    note: "Not",
    meeting: "Görüşme",
    plan: "Plan",
    risk: "Risk",
    status_change: "Durum",
    file: "Dosya",
    follow_up: "Takip"
  };
  return labels[eventType] ?? eventType;
}

export function caseTimelineSourceLabel(source: string) {
  const labels: Record<string, string> = {
    case_event: "Vaka olayı",
    guidance_note: "Rehberlik notu",
    support_plan: "Destek planı",
    risk_tracking: "Risk takibi"
  };
  return labels[source] ?? source;
}

export function caseTimelineTypeLabel(item: { source: string; eventType: string }) {
  if (item.source === "case_event") {
    return caseEventTypeLabel(item.eventType);
  }
  return caseTimelineSourceLabel(item.source);
}

export function casePriorityTone(priority: string): { bg: string; text: string; border: string } {
  switch (priority) {
    case "critical":
      return { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" };
    case "high":
      return { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" };
    case "low":
      return { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" };
    default:
      return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
  }
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
