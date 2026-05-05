import { GraduationCap, Loader2, LogOut, ServerCog } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import type { AuthSession, SystemStatus } from "../lib/api";
import { api } from "../lib/api";
import { navTabs } from "./config/navTabs";
import type { AdminTab, SuperAdminState } from "./types";
import { pageDescription, pageTitle } from "./utils/pageMeta";
import { InstitutionDetailPage } from "./pages/InstitutionDetailPage";
import { InstitutionsListPage } from "./pages/InstitutionsListPage";
import { LogsPage } from "./pages/LogsPage";
import { ModulesPage } from "./pages/ModulesPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SupportPage } from "./pages/SupportPage";
import { UsersPage } from "./pages/UsersPage";
import "./SuperAdminConsole.css";

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
  const isInstitutionDetail = /^institutions\/[^/]+/.test(subPath);

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

  const showHeader = activeTab !== "overview" && activeTab !== "institutions" && activeTab !== "users" && !isInstitutionDetail;

  return (
    <div className="admin-shell">
      <header className="admin-navbar">
        <div className="navbar-brand">
          <div className="admin-mark">
            <GraduationCap size={22} />
          </div>
          <div>
            <strong>ÖTS</strong>
            <span>Platform Admin</span>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="navbar-profile" aria-label="Profil">
            <div className="profile-avatar">{session.principal.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</div>
            <div className="navbar-profile-text">
              <strong>{session.principal.name}</strong>
              <span>{session.principal.email}</span>
            </div>
          </div>
          <button className="ghost-action navbar-logout" type="button" onClick={onLogout}>
            <LogOut size={17} />
            Çıkış
          </button>
        </div>
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

        <div className="developer-note">
          <ServerCog size={18} />
          <div>
            <strong>Yazılımcı alanı</strong>
            <span>Tenant, rol, log ve modül denetimi.</span>
          </div>
        </div>
      </aside>

      <main className={`admin-workspace ${activeTab}-workspace`}>
        <div className="sa-main">
          {showHeader && (
            <header className="sa-page-header">
              <div>
                <span className="sa-kicker">Süper admin</span>
                <h1>{pageTitle(activeTab)}</h1>
                <p>{pageDescription(activeTab)}</p>
              </div>
            </header>
          )}

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
            <Route path="users" element={<UsersPage users={state.users ?? []} institutions={state.institutions ?? []} onRefresh={load} />} />
            <Route path="support" element={<SupportPage tickets={state.supportTickets ?? []} onRefresh={load} />} />
            <Route path="logs" element={<LogsPage auditLogs={state.auditLogs ?? []} />} />
            <Route path="modules" element={<ModulesPage modules={state.overview?.modules ?? []} />} />
            <Route path="settings" element={<SettingsPage settings={state.settings} onRefresh={load} onSystemStatusChange={onSystemStatusChange} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
