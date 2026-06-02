import type { Href } from "expo-router";
import type { MobileRoleShell } from "@/shared/auth/roleRoutes";

export type PushRouteData = {
  category?: string;
  studentId?: string;
  caseId?: string;
  announcementId?: string;
  ticketId?: string;
  planId?: string;
  sessionId?: string;
};

export function resolvePushRoute(shell: MobileRoleShell, data: PushRouteData): Href | null {
  const category = data.category ?? "";
  switch (category) {
    case "attendance":
      if (shell === "guardian") {
        return "/(app)/guardian/attendance" as Href;
      }
      if (shell === "teacher") {
        return "/(app)/teacher/attendance" as Href;
      }
      return "/(app)/principal/attendance" as Href;
    case "announcements":
      return `/(app)/${shell}/announcements` as Href;
    case "support":
      return `/(app)/${shell}/support` as Href;
    case "guidance":
      if (shell === "guidance" && data.caseId) {
        return `/(app)/guidance/cases/${data.caseId}` as Href;
      }
      if (shell === "guidance" && data.studentId) {
        return `/(app)/guidance/students/${data.studentId}` as Href;
      }
      if (shell === "guidance") {
        return "/(app)/guidance/cases" as Href;
      }
      if (shell === "principal") {
        return "/(app)/principal/guidance-cases" as Href;
      }
      return `/(app)/${shell}/notifications` as Href;
    case "schedule":
      if (shell === "guardian") {
        return "/(app)/guardian/schedule" as Href;
      }
      if (shell === "teacher") {
        return "/(app)/teacher/lessons" as Href;
      }
      return "/(app)/principal/schedule" as Href;
    default:
      return `/(app)/${shell}/notifications` as Href;
  }
}

export function parsePushData(raw: Record<string, unknown> | undefined): PushRouteData {
  if (!raw) return {};
  return {
    category: typeof raw.category === "string" ? raw.category : undefined,
    studentId: typeof raw.studentId === "string" ? raw.studentId : undefined,
    caseId: typeof raw.caseId === "string" ? raw.caseId : undefined,
    announcementId: typeof raw.announcementId === "string" ? raw.announcementId : undefined,
    ticketId: typeof raw.ticketId === "string" ? raw.ticketId : undefined,
    planId: typeof raw.planId === "string" ? raw.planId : undefined,
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : undefined
  };
}
