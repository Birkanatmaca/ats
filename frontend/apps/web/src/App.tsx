import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { AuthSession, SystemStatus } from "./lib/api";
import { api, readAuthSession } from "./lib/api";
import { handleLogout } from "./auth/handleLogout";
import { SuperAdminConsole } from "./admin/SuperAdminConsole";
import { FirstLoginPasswordPage } from "./pages/FirstLoginPasswordPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RoleDashboardPage } from "./pages/RoleDashboardPage";

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [showAdminLoginOnMaintenance, setShowAdminLoginOnMaintenance] = useState(false);

  useEffect(() => {
    api
      .systemStatus()
      .then(setSystemStatus)
      .catch(() => setSystemStatus(null));
  }, []);

  const homePath = session
    ? session.principal.mustChangePassword
      ? "/first-login"
      : session.principal.role === "super_admin"
        ? "/admin/overview"
        : session.principal.role === "principal" || session.principal.role === "system_admin"
          ? "/dashboard/overview"
          : "/dashboard"
    : "/login";

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session ? (
            <Navigate to={homePath} replace />
          ) : systemStatus?.maintenance.enabled && !showAdminLoginOnMaintenance ? (
            <MaintenancePage status={systemStatus} onAdminLogin={() => setShowAdminLoginOnMaintenance(true)} />
          ) : (
            <LoginPage onLogin={setSession} />
          )
        }
      />

      <Route
        path="/maintenance"
        element={
          systemStatus ? (
            session?.principal.role === "super_admin" && !session.principal.mustChangePassword ? (
              <Navigate to="/admin/overview" replace />
            ) : (
              <MaintenancePage status={systemStatus} onLogout={session ? () => handleLogout(setSession) : undefined} />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/first-login"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : !session.principal.mustChangePassword ? (
            <Navigate to={homePath} replace />
          ) : (
            <FirstLoginPasswordPage session={session} onSessionUpdated={setSession} onLogout={() => handleLogout(setSession)} />
          )
        }
      />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/admin/*"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : session.principal.mustChangePassword ? (
            <Navigate to="/first-login" replace />
          ) : session.principal.role !== "super_admin" ? (
            <Navigate to="/dashboard" replace />
          ) : systemStatus?.maintenance.enabled && session.principal.role !== "super_admin" ? (
            <Navigate to="/maintenance" replace />
          ) : (
            <SuperAdminConsole session={session} onLogout={() => handleLogout(setSession)} onSystemStatusChange={setSystemStatus} />
          )
        }
      />

      <Route
        path="/dashboard/*"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : systemStatus?.maintenance.enabled && session.principal.role !== "super_admin" ? (
            <Navigate to="/maintenance" replace />
          ) : session.principal.mustChangePassword ? (
            <Navigate to="/first-login" replace />
          ) : session.principal.role === "super_admin" ? (
            <Navigate to="/admin/overview" replace />
          ) : (
            <RoleDashboardPage session={session} onLogout={() => handleLogout(setSession)} />
          )
        }
      />

      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  );
}
