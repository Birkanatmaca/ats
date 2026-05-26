import { Loader2 } from "lucide-react";
import { AppBrand } from "../components/AppBrand";
import { NavbarUserMenu, SidebarFooter } from "../components/ShellChrome";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import type { AuthSession, SystemStatus } from "../lib/api";
import { api } from "../lib/api";
import { navTabs } from "./config/navTabs";
import type { AdminTab, SuperAdminState } from "./types";
import { AiUsagePage } from "./pages/AiUsagePage";
import { BillingPage } from "./pages/BillingPage";
import { InstitutionDetailPage } from "./pages/InstitutionDetailPage";
import { InstitutionsListPage } from "./pages/InstitutionsListPage";
import { LogsPage } from "./pages/LogsPage";
import { ModulesPage } from "./pages/ModulesPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SupportPage } from "./pages/SupportPage";
import { UsersPage } from "./pages/UsersPage";
import "../styles/super-admin-app.css";
import "./SuperAdminConsole.css";
import "./pages/AiUsagePage.css";
import "./pages/BillingPage.css";

export function SuperAdminConsole({
  session,
  onLogout,
  onSystemStatusChange
}: {
  session: AuthSession;
  onLogout: () => void;
  onSystemStatusChange: (status: SystemStatus) => void;
}) {
  const [state, setState] = useState<SuperAdminState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const subPath = location.pathname.replace(/^\/admin\/?/, "");
  const activeTab = (subPath.split("/")[0] || "overview") as AdminTab;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [overview, systemMetrics, institutions, users, auditLogs, settings, supportTickets] = await Promise.all([
        api.superAdminOverview(),
        api.superAdminSystemMetrics(),
        api.superAdminInstitutions(),
        api.superAdminUsers(),
        api.superAdminAuditLogs(),
        api.superAdminSettings(),
        api.superAdminSupportTickets()
      ]);
      setState({ overview, systemMetrics, institutions, users, auditLogs, settings, supportTickets });
      onSystemStatusChange({ maintenance: settings.maintenance });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Süper admin verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshSystemMetrics() {
    try {
      const systemMetrics = await api.superAdminSystemMetrics();
      setState((current) => ({ ...current, systemMetrics }));
    } catch {
      // Overview metrics are refreshed opportunistically; the main load error already covers hard failures.
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (activeTab !== "overview") {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshSystemMetrics();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [activeTab]);

  return (
    <div className="admin-shell super-admin-app">
      <header className="admin-navbar">
        <div className="navbar-brand">
          <AppBrand />
        </div>

        <NavbarUserMenu name={session.principal.name} meta={session.principal.email ?? "Sistem yöneticisi"} showNotifications={false} />
      </header>

      <aside className="admin-sidebar">
        <nav className="admin-nav" aria-label="Süper admin menüsü">
          {navTabs.map((tab) => (
            <NavLink className={({ isActive }) => (isActive ? "nav-button active" : "nav-button")} key={tab.id} to={`/admin/${tab.id}`} end={tab.id === "overview"}>
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <SidebarFooter tenantName="OGTA Platform" tenantSubtitle="Sistem yönetimi" onLogout={onLogout} />
      </aside>

      <main className={`admin-workspace ${activeTab}-workspace`}>
        <div className="sa-main">
          {error && <div className="form-error workspace-error sa-alert">{error}</div>}
          {loading && (
            <div className="loading-line">
              <Loader2 className="spin" size={18} />
              Veriler hazırlanıyor
            </div>
          )}

          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage overview={state.overview} systemMetrics={state.systemMetrics} />} />
            <Route path="institutions" element={<InstitutionsListPage institutions={state.institutions ?? []} onRefresh={load} />} />
            <Route path="institutions/:id" element={<InstitutionDetailPage institutions={state.institutions ?? []} onRefresh={load} />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="users" element={<UsersPage users={state.users ?? []} institutions={state.institutions ?? []} onRefresh={load} />} />
            <Route path="support" element={<SupportPage tickets={state.supportTickets ?? []} onRefresh={load} />} />
            <Route path="logs" element={<LogsPage auditLogs={state.auditLogs ?? []} />} />
            <Route path="ai" element={<AiUsagePage />} />
            <Route path="modules" element={<ModulesPage modules={state.overview?.modules ?? []} />} />
            <Route path="settings" element={<SettingsPage settings={state.settings} onRefresh={load} onSystemStatusChange={onSystemStatusChange} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
