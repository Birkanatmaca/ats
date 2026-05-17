import type { Announcement, Observation, PrincipalSummary, Tenant } from "../../lib/api";

export type GuidanceData = {
  tenant?: Tenant;
  summary?: PrincipalSummary;
  observations: Observation[];
  announcements: Announcement[];
};

export type GuidanceRiskLevel = "low" | "medium" | "high";

export type GuidanceRiskSignal = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  category: string;
  level: GuidanceRiskLevel;
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

export type GuidancePlan = {
  id: string;
  studentName: string;
  className: string;
  owner: string;
  title: string;
  status: "open" | "monitoring" | "closed";
  dueDate: string;
};
