import type { Role } from "../lib/api";

const principalSegments = new Set([
  "overview",
  "teachers",
  "students",
  "classes",
  "attendance",
  "schedule",
  "operations",
  "announcements",
  "profile"
]);

const teacherSegments = new Set(["overview", "lessons", "attendance", "observations", "announcements", "notifications", "support", "profile"]);
const guardianSegments = new Set(["overview", "child", "schedule", "attendance", "announcements", "notifications", "support", "profile"]);
const guidanceSegments = new Set(["overview", "observations", "notes", "students", "risks", "plans", "announcements", "notifications", "support", "profile"]);

function allowedSegments(role: Role): Set<string> | null {
  switch (role) {
    case "principal":
    case "system_admin":
      return principalSegments;
    case "teacher":
      return teacherSegments;
    case "guardian":
      return guardianSegments;
    case "guidance":
      return guidanceSegments;
    default:
      return null;
  }
}

/** Returns true when the signed-in role may not access this dashboard path. */
export function isDashboardPathForbidden(role: Role, pathname: string): boolean {
  const allowed = allowedSegments(role);
  if (!allowed) {
    return false;
  }
  const rest = pathname.replace(/^\/dashboard\/?/, "");
  if (!rest) {
    return false;
  }
  const segment = rest.split("/")[0];
  return !allowed.has(segment);
}
