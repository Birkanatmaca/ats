import { AlertTriangle, Bell, GraduationCap, HeartHandshake, Home, LifeBuoy, Loader2, LogOut, NotebookTabs, School, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { AuthSession } from "../../lib/api";
import { api } from "../../lib/api";
import { SupportContactForm } from "../../pages/SupportContactForm";
import { GuidanceAnnouncementsPage } from "./pages/GuidanceAnnouncementsPage";
import { GuidanceObservationsPage } from "./pages/GuidanceObservationsPage";
import { GuidanceOverviewPage } from "./pages/GuidanceOverviewPage";
import { GuidancePlansPage } from "./pages/GuidancePlansPage";
import { GuidanceRisksPage } from "./pages/GuidanceRisksPage";
import { GuidanceStudentsPage } from "./pages/GuidanceStudentsPage";
import type { GuidanceData } from "./types";
import { buildGuidanceRiskSignals, buildGuidanceStudentSupports } from "./utils";
import "../../styles/super-admin-app.css";
import "./GuidanceConsole.css";

const guidanceTabs = [
  { id: "overview", label: "Genel", icon: <Home size={18} /> },
  { id: "observations", label: "Gözlemler", icon: <NotebookTabs size={18} /> },
  { id: "students", label: "Öğrenciler", icon: <UsersRound size={18} /> },
  { id: "risks", label: "Riskler", icon: <AlertTriangle size={18} /> },
  { id: "plans", label: "Takip", icon: <HeartHandshake size={18} /> },
  { id: "announcements", label: "Duyurular", icon: <Bell size={18} /> },
  { id: "support", label: "Destek", icon: <LifeBuoy size={18} /> }
] as const;

function initialGuidanceData(): GuidanceData {
  return { observations: [], announcements: [] };
}

export function GuidanceConsole({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [data, setData] = useState<GuidanceData>(() => initialGuidanceData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const activePath = location.pathname.replace(/^\/dashboard\/?/, "");
  const activeTab = activePath.split("/")[0] || "overview";
  const risks = useMemo(() => buildGuidanceRiskSignals(data.observations), [data.observations]);
  const students = useMemo(() => buildGuidanceStudentSupports(data.observations), [data.observations]);

  async function load() {
    setLoading(true);
    setError(null);
    const [tenant, summary, observations, announcements] = await Promise.allSettled([
      api.tenant(),
      api.dashboard(),
      api.observations(),
      api.announcements()
    ]);

    setData({
      tenant: tenant.status === "fulfilled" ? tenant.value : undefined,
      summary: summary.status === "fulfilled" ? summary.value : undefined,
      observations: observations.status === "fulfilled" ? observations.value : [],
      announcements: announcements.status === "fulfilled" ? announcements.value : []
    });

    const failed = [tenant, summary, observations, announcements].some((result) => result.status === "rejected");
    if (failed) {
      setError("Bazı rehberlik verileri alınamadı; erişilebilen kayıtlar gösteriliyor.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [session.principal.userId]);

  return (
    <div className="admin-shell principal-console guidance-console">
      <header className="admin-navbar">
        <div className="navbar-brand">
          <div className="admin-mark">
            <GraduationCap size={22} />
          </div>
          <div>
            <strong>ÖTS</strong>
            <span>{data.tenant?.name ?? "Rehberlik paneli"}</span>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="navbar-profile" aria-label="Profil">
            <div className="profile-avatar">{session.principal.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</div>
            <div className="navbar-profile-text">
              <strong>{session.principal.name}</strong>
              <span>{roleLabel(session.principal.role)}</span>
            </div>
          </div>
          <button className="ghost-action navbar-logout" type="button" onClick={onLogout}>
            <LogOut size={17} />
            Çıkış
          </button>
        </div>
      </header>

      <aside className="admin-sidebar">
        <nav className="admin-nav" aria-label="Rehberlik menüsü">
          {guidanceTabs.map((tab) => (
            <NavLink className={({ isActive }) => (isActive ? "nav-button active" : "nav-button")} key={tab.id} to={`/dashboard/${tab.id}`}>
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="developer-note">
          <School size={18} />
          <div>
            <strong>Rehberlik görünümü</strong>
            <span>Gözlem, risk ve destek takibi.</span>
          </div>
        </div>
      </aside>

      <main className={`admin-workspace guidance-workspace ${activeTab}-workspace`}>
        <div className="sa-main guidance-main">
          {error && <div className="form-error workspace-error sa-alert">{error}</div>}
          {loading && (
            <div className="loading-line">
              <Loader2 className="spin" size={18} />
              Rehberlik paneli hazırlanıyor
            </div>
          )}

          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<GuidanceOverviewPage data={data} risks={risks} students={students} />} />
            <Route path="observations" element={<GuidanceObservationsPage observations={data.observations} />} />
            <Route path="students" element={<GuidanceStudentsPage students={students} />} />
            <Route path="risks" element={<GuidanceRisksPage risks={risks} />} />
            <Route path="plans" element={<GuidancePlansPage />} />
            <Route path="announcements" element={<GuidanceAnnouncementsPage data={data} />} />
            <Route path="support" element={<SupportContactForm session={session} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
