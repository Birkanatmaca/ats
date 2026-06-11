import type { GuidanceNote, GuidanceStudent, GuidanceSupportPlan, Observation } from "../../lib/api";
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
    untracked: "Gözlemsiz",
    open: "Açık",
    closed: "Kapalı"
  };
  return labels[status] ?? status;
}

export type GuidanceStudentRow = {
  studentId: string;
  studentName: string;
  className: string;
  schoolNumber: string;
  observationCount: number;
  riskCount: number;
  noteCount: number;
  planCount: number;
  lastCategory: string | null;
  lastSeenAt: string | null;
  status: GuidanceStudentSupport["status"] | "untracked";
};

export function buildGuidanceStudentRows(
  guidanceStudents: GuidanceStudent[],
  supports: GuidanceStudentSupport[],
  notes: GuidanceNote[],
  plans: GuidanceSupportPlan[]
): GuidanceStudentRow[] {
  const supportById = new Map(supports.map((item) => [item.studentId, item]));
  const noteCountById = new Map<string, number>();
  const planCountById = new Map<string, number>();

  for (const note of notes) {
    noteCountById.set(note.studentId, (noteCountById.get(note.studentId) ?? 0) + 1);
  }
  for (const plan of plans) {
    planCountById.set(plan.studentId, (planCountById.get(plan.studentId) ?? 0) + 1);
  }

  const rows = new Map<string, GuidanceStudentRow>();

  for (const student of guidanceStudents) {
    const support = supportById.get(student.id);
    rows.set(student.id, {
      studentId: student.id,
      studentName: student.fullName,
      className: student.className,
      schoolNumber: student.schoolNumber,
      observationCount: support?.observationCount ?? 0,
      riskCount: support?.riskCount ?? 0,
      noteCount: noteCountById.get(student.id) ?? 0,
      planCount: planCountById.get(student.id) ?? 0,
      lastCategory: support?.lastCategory ?? null,
      lastSeenAt: support?.lastSeenAt ?? null,
      status: support?.status ?? "untracked"
    });
  }

  for (const support of supports) {
    if (rows.has(support.studentId)) {
      continue;
    }
    rows.set(support.studentId, {
      studentId: support.studentId,
      studentName: support.studentName,
      className: support.className,
      schoolNumber: "",
      observationCount: support.observationCount,
      riskCount: support.riskCount,
      noteCount: noteCountById.get(support.studentId) ?? 0,
      planCount: planCountById.get(support.studentId) ?? 0,
      lastCategory: support.lastCategory,
      lastSeenAt: support.lastSeenAt,
      status: support.status
    });
  }

  return [...rows.values()].sort(
    (a, b) =>
      statusRank(b.status) - statusRank(a.status) ||
      b.riskCount - a.riskCount ||
      b.observationCount - a.observationCount ||
      a.studentName.localeCompare(b.studentName, "tr")
  );
}

export function riskLevelBadgeClass(level: string) {
  if (level === "high") {
    return "guidance-data-badge guidance-data-badge--rose";
  }
  if (level === "medium") {
    return "guidance-data-badge guidance-data-badge--amber";
  }
  return "guidance-data-badge guidance-data-badge--emerald";
}

export function studentStatusBadgeClass(status: GuidanceStudentRow["status"]) {
  if (status === "review") {
    return "guidance-data-badge guidance-data-badge--amber";
  }
  if (status === "monitoring") {
    return "guidance-data-badge guidance-data-badge--violet";
  }
  if (status === "stable") {
    return "guidance-data-badge guidance-data-badge--emerald";
  }
  return "guidance-data-badge guidance-data-badge--slate";
}

function statusRank(status: GuidanceStudentRow["status"]) {
  if (status === "review") {
    return 4;
  }
  if (status === "monitoring") {
    return 3;
  }
  if (status === "stable") {
    return 2;
  }
  return 1;
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

export function casePriorityBadgeClass(priority: string) {
  switch (priority) {
    case "critical":
      return "guidance-data-badge guidance-data-badge--rose";
    case "high":
      return "guidance-data-badge guidance-data-badge--amber";
    case "low":
      return "guidance-data-badge guidance-data-badge--slate";
    default:
      return "guidance-data-badge guidance-data-badge--sky";
  }
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

export function earlyWarningSeverityLabel(severity: string) {
  return severity === "high" ? "Yüksek" : "Orta";
}

export function earlyWarningSeverityBadgeClass(severity: string) {
  return severity === "high"
    ? "guidance-data-badge guidance-data-badge--rose"
    : "guidance-data-badge guidance-data-badge--amber";
}
