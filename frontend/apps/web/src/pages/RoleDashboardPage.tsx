import { RoleDashboardShell } from "../role-dashboard/RoleDashboardShell";
import { PrincipalConsole } from "../role-dashboard/principal/PrincipalConsole";
import type { AuthSession } from "../lib/api";

export function RoleDashboardPage({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  if (session.principal.role === "principal" || session.principal.role === "system_admin") {
    return <PrincipalConsole session={session} onLogout={onLogout} />;
  }

  return <RoleDashboardShell session={session} onLogout={onLogout} />;
}
