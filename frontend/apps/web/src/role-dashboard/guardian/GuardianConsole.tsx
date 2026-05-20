import { Bell, CalendarDays, ClipboardCheck, GraduationCap, Home, LifeBuoy, Loader2, LogOut, School, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { AuthSession } from "../../lib/api";
import { api } from "../../lib/api";
import { SupportContactForm } from "../../pages/SupportContactForm";
import { guardianChildren } from "./data";
import { GuardianAnnouncementsPage } from "./pages/GuardianAnnouncementsPage";
import { GuardianAttendancePage } from "./pages/GuardianAttendancePage";
import { GuardianChildPage } from "./pages/GuardianChildPage";
import { GuardianOverviewPage } from "./pages/GuardianOverviewPage";
import { GuardianSchedulePage } from "./pages/GuardianSchedulePage";
import type { GuardianData } from "./types";
import "../../styles/super-admin-app.css";
import "./GuardianConsole.css";

const guardianTabs = [
  { id: "overview", label: "Genel", icon: <Home size={18} /> },
  { id: "child", label: "Çocuğum", icon: <UserRound size={18} /> },
  { id: "schedule", label: "Program", icon: <CalendarDays size={18} /> },
  { id: "attendance", label: "Devamsızlık", icon: <ClipboardCheck size={18} /> },
  { id: "announcements", label: "Duyurular", icon: <Bell size={18} /> },
  { id: "support", label: "Destek", icon: <LifeBuoy size={18} /> }
] as const;

function initialGuardianData(): GuardianData {
  return { scheduleLessons: [], announcements: [] };
}

export function GuardianConsole({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [data, setData] = useState<GuardianData>(() => initialGuardianData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const child = guardianChildren[0];
  const activePath = location.pathname.replace(/^\/dashboard\/?/, "");
  const activeTab = activePath.split("/")[0] || "overview";
  const childLessons = useMemo(
    () =>
      [...data.scheduleLessons]
        .filter((lesson) => lesson.className === child.className)
        .sort((a, b) => `${a.dayOfWeek}-${a.startTime}`.localeCompare(`${b.dayOfWeek}-${b.startTime}`, "tr-TR")),
    [child.className, data.scheduleLessons]
  );

  async function load() {
    setLoading(true);
    setError(null);
    const [tenant, summary, schedule, announcements] = await Promise.allSettled([
      api.tenant(),
      api.dashboard(),
      api.schedule(),
      api.announcements()
    ]);

    setData({
      tenant: tenant.status === "fulfilled" ? tenant.value : undefined,
      summary: summary.status === "fulfilled" ? summary.value : undefined,
      scheduleLessons: schedule.status === "fulfilled" ? schedule.value.lessons : [],
      announcements: announcements.status === "fulfilled" ? (announcements.value ?? []) : []
    });

    const failed = [tenant, summary, schedule, announcements].some((result) => result.status === "rejected");
    if (failed) {
      setError("Bazı veli paneli verileri alınamadı; erişilebilen bilgiler gösteriliyor.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [session.principal.userId]);

  return (
    <div className="admin-shell principal-console guardian-console">
      <header className="admin-navbar">
        <div className="navbar-brand">
          <div className="admin-mark">
            <GraduationCap size={22} />
          </div>
          <div>
            <strong>ÖTS</strong>
            <span>{data.tenant?.name ?? "Veli paneli"}</span>
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
        <nav className="admin-nav" aria-label="Veli menüsü">
          {guardianTabs.map((tab) => (
            <NavLink className={({ isActive }) => (isActive ? "nav-button active" : "nav-button")} key={tab.id} to={`/dashboard/${tab.id}`}>
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="developer-note">
          <School size={18} />
          <div>
            <strong>Veli görünümü</strong>
            <span>Çocuk, program ve devamsızlık takibi.</span>
          </div>
        </div>
      </aside>

      <main className={`admin-workspace guardian-workspace ${activeTab}-workspace`}>
        <div className="sa-main guardian-main">
          {error && <div className="form-error workspace-error sa-alert">{error}</div>}
          {loading && (
            <div className="loading-line">
              <Loader2 className="spin" size={18} />
              Veli paneli hazırlanıyor
            </div>
          )}

          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<GuardianOverviewPage child={child} data={data} lessons={childLessons} />} />
            <Route path="child" element={<GuardianChildPage child={child} />} />
            <Route path="schedule" element={<GuardianSchedulePage child={child} lessons={childLessons} />} />
            <Route path="attendance" element={<GuardianAttendancePage child={child} />} />
            <Route path="announcements" element={<GuardianAnnouncementsPage data={data} />} />
            <Route path="support" element={<SupportContactForm session={session} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
