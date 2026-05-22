import { useLocation } from "react-router-dom";
import { isDashboardPathForbidden } from "../auth/rolePathGuard";
import { RoleDashboardShell } from "../role-dashboard/RoleDashboardShell";
import { GuidanceConsole } from "../role-dashboard/guidance/GuidanceConsole";
import { GuardianConsole } from "../role-dashboard/guardian/GuardianConsole";
import { PrincipalConsole } from "../role-dashboard/principal/PrincipalConsole";
import { TeacherConsole } from "../role-dashboard/teacher/TeacherConsole";
import type { AuthSession } from "../lib/api";
import { ForbiddenPage } from "./ForbiddenPage";

export function RoleDashboardPage({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const location = useLocation();
  if (isDashboardPathForbidden(session.principal.role, location.pathname)) {
    return <ForbiddenPage session={session} />;
  }
  if (session.principal.role === "principal" || session.principal.role === "system_admin") {
    return <PrincipalConsole session={session} onLogout={onLogout} />;
  }

  if (session.principal.role === "teacher") {
    return <TeacherConsole session={session} onLogout={onLogout} />;
  }

  if (session.principal.role === "guardian") {
    return <GuardianConsole session={session} onLogout={onLogout} />;
  }

  if (session.principal.role === "guidance") {
    return <GuidanceConsole session={session} onLogout={onLogout} />;
  }

  return <RoleDashboardShell session={session} onLogout={onLogout} />;
}
