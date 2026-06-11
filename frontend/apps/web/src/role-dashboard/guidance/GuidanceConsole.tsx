import { AlertTriangle, Bell, FileText, FolderOpen, HeartHandshake, Home, LifeBuoy, Loader2, Megaphone, NotebookTabs, UserCircle, UsersRound } from "lucide-react";
import { AppBrand } from "../../components/AppBrand";
import { NavbarUserMenu, SidebarFooter } from "../../components/ShellChrome";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { AuthSession, GuidanceEarlyWarningSignal, GuidanceNote, GuidanceStudent, GuidanceSupportPlan } from "../../lib/api";
import { api } from "../../lib/api";
import { ProfilePage } from "../pages/ProfilePage";
import { RoleNotificationsPage } from "../pages/RoleNotificationsPage";
import { RoleSupportPage } from "../pages/RoleSupportPage";
import { GuidanceAnnouncementsPage } from "./pages/GuidanceAnnouncementsPage";
import { GuidanceCaseDetailPage } from "./pages/GuidanceCaseDetailPage";
import { GuidanceCasesPage } from "./pages/GuidanceCasesPage";
import { GuidanceNotesPage } from "./pages/GuidanceNotesPage";
import { GuidanceObservationsPage } from "./pages/GuidanceObservationsPage";
import { GuidanceOverviewPage } from "./pages/GuidanceOverviewPage";
import { GuidancePlansPage } from "./pages/GuidancePlansPage";
import { GuidanceRisksPage } from "./pages/GuidanceRisksPage";
import { GuidanceStudentsPage } from "./pages/GuidanceStudentsPage";
import type { GuidanceData } from "./types";
import { buildGuidanceRiskSignals, buildGuidanceStudentSupports } from "./utils";
import { OgtaAiDock } from "../ai/OgtaAiDock";
import "../../styles/super-admin-app.css";
import "./GuidanceConsole.css";

const guidanceTabs = [
  { id: "overview", label: "Genel", icon: <Home size={18} /> },
  { id: "observations", label: "Öğretmen gözlemleri", icon: <NotebookTabs size={18} /> },
  { id: "notes", label: "Rehberlik notları", icon: <FileText size={18} /> },
  { id: "students", label: "Öğrenciler", icon: <UsersRound size={18} /> },
  { id: "cases", label: "Vaka dosyaları", icon: <FolderOpen size={18} /> },
  { id: "risks", label: "Riskler", icon: <AlertTriangle size={18} /> },
  { id: "plans", label: "Takip", icon: <HeartHandshake size={18} /> },
  { id: "announcements", label: "Duyurular", icon: <Megaphone size={18} /> },
  { id: "notifications", label: "Bildirimler", icon: <Bell size={18} /> },
  { id: "support", label: "Destek", icon: <LifeBuoy size={18} /> },
  { id: "profile", label: "Profil", icon: <UserCircle size={18} /> }
] as const;

function initialGuidanceData(): GuidanceData {
  return { observations: [], announcements: [], guidanceNotes: [], supportPlans: [], guidanceStudents: [] };
}

export function GuidanceConsole({
  session,
  onLogout,
  onSessionUpdate
}: {
  session: AuthSession;
  onLogout: () => void;
  onSessionUpdate: (session: AuthSession) => void;
}) {
  const [data, setData] = useState<GuidanceData>(() => initialGuidanceData());
  const [earlyWarnings, setEarlyWarnings] = useState<GuidanceEarlyWarningSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const location = useLocation();
  const activePath = location.pathname.replace(/^\/dashboard\/?/, "");
  const activeTab = activePath.split("/")[0] || "overview";
  const risks = useMemo(() => buildGuidanceRiskSignals(data.observations), [data.observations]);
  const students = useMemo(() => buildGuidanceStudentSupports(data.observations), [data.observations]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [tenant, summary, observations, announcements, guidanceStudents, guidanceNotes, supportPlans, warningItems] = await Promise.allSettled([
      api.tenant(),
      api.dashboard(),
      api.observations(),
      api.announcements(),
      api.guidanceStudents(),
      api.guidanceNotes(),
      api.supportPlans(),
      api.guidanceEarlyWarnings()
    ]);

    setData({
      tenant: tenant.status === "fulfilled" ? tenant.value : undefined,
      summary: summary.status === "fulfilled" ? summary.value : undefined,
      observations: observations.status === "fulfilled" ? (observations.value ?? []) : [],
      announcements: announcements.status === "fulfilled" ? (announcements.value ?? []) : [],
      guidanceStudents: guidanceStudents.status === "fulfilled" ? (guidanceStudents.value ?? []) : [],
      guidanceNotes: guidanceNotes.status === "fulfilled" ? (guidanceNotes.value ?? []) : [],
      supportPlans: supportPlans.status === "fulfilled" ? (supportPlans.value ?? []) : []
    });

    setEarlyWarnings(warningItems.status === "fulfilled" ? (warningItems.value ?? []) : []);

    const failed = [tenant, summary, observations, announcements, guidanceStudents, guidanceNotes, supportPlans, warningItems].some(
      (result) => result.status === "rejected"
    );
    if (failed) {
      setError("Bazı rehberlik verileri alınamadı; erişilebilen kayıtlar gösteriliyor.");
    }
    setLoading(false);
  }, []);

  const loadUnreadNotifications = useCallback(async () => {
    try {
      const items = await api.notifications();
      setUnreadNotifications((items ?? []).filter((item) => !item.readAt).length);
    } catch {
      setUnreadNotifications(0);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadUnreadNotifications();
  }, [load, loadUnreadNotifications, session.principal.userId]);

  return (
    <div className="admin-shell principal-console guidance-console">
      <header className="admin-navbar">
        <div className="navbar-brand">
          <AppBrand />
        </div>

        <NavbarUserMenu
          name={session.principal.name}
          meta={roleLabel(session.principal.role)}
          onUnreadNotificationsChange={setUnreadNotifications}
        />
      </header>

      <aside className="admin-sidebar">
        <nav className="admin-nav" aria-label="Rehberlik menüsü">
          {guidanceTabs.map((tab) => (
            <NavLink className={({ isActive }) => (isActive ? "nav-button active" : "nav-button")} key={tab.id} to={`/dashboard/${tab.id}`}>
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === "notifications" && unreadNotifications > 0 ? (
                <span className="nav-unread-badge">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <SidebarFooter tenantName={data.tenant?.name ?? "Kurum"} onLogout={onLogout} />
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
            <Route
              path="overview"
              element={
                <GuidanceOverviewPage
                  data={data}
                  earlyWarnings={earlyWarnings}
                  risks={risks}
                  students={students}
                  notes={data.guidanceNotes}
                  plans={data.supportPlans}
                />
              }
            />
            <Route path="cases" element={<GuidanceCasesPage />} />
            <Route path="cases/:caseId" element={<GuidanceCaseDetailPage />} />
            <Route path="observations" element={<GuidanceObservationsPage observations={data.observations} />} />
            <Route path="notes" element={<GuidanceNotesPage students={data.guidanceStudents} notes={data.guidanceNotes} onReload={() => void load()} />} />
            <Route
              path="students"
              element={
                <GuidanceStudentsPage
                  students={students}
                  guidanceStudents={data.guidanceStudents}
                  notes={data.guidanceNotes}
                  plans={data.supportPlans}
                />
              }
            />
            <Route path="risks" element={<GuidanceRisksPage risks={risks} />} />
            <Route
              path="plans"
              element={<GuidancePlansPage students={data.guidanceStudents} plans={data.supportPlans} onReload={() => void load()} />}
            />
            <Route path="announcements" element={<GuidanceAnnouncementsPage data={data} />} />
            <Route path="notifications" element={<RoleNotificationsPage onUnreadChange={setUnreadNotifications} />} />
            <Route path="support" element={<RoleSupportPage session={session} />} />
            <Route path="profile" element={<ProfilePage session={session} onSessionUpdate={onSessionUpdate} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
      <OgtaAiDock onActionCompleted={() => void load()} />
    </div>
  );
}
