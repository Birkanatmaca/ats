import { GraduationCap, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { roleLabel } from "../admin/utils/labels";
import type { AuthSession } from "../lib/api";
import { api } from "../lib/api";
import { SupportContactForm } from "../pages/SupportContactForm";
import { GuidanceDashboard } from "./pages/GuidanceDashboard";
import { GuardianDashboard } from "./pages/GuardianDashboard";
import { PrincipalDashboard } from "./pages/PrincipalDashboard";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import type { DashboardData } from "./types";
import { heroDescription, heroTitle } from "./utils";
import "./RoleDashboardShell.css";

export function RoleDashboardShell({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [data, setData] = useState<DashboardData>({ teacherLessons: [], announcements: [], observations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    const [tenant, summary, schedule, teacherLessons, currentLesson, announcements, observations] = await Promise.allSettled([
      api.tenant(),
      api.dashboard(),
      api.schedule(),
      api.teacherCalendar(),
      api.currentLesson(),
      api.announcements(),
      api.observations()
    ]);

    setData({
      tenant: tenant.status === "fulfilled" ? tenant.value : undefined,
      summary: summary.status === "fulfilled" ? summary.value : undefined,
      schedule: schedule.status === "fulfilled" ? schedule.value : undefined,
      teacherLessons: teacherLessons.status === "fulfilled" ? teacherLessons.value : [],
      currentLesson: currentLesson.status === "fulfilled" ? currentLesson.value : undefined,
      announcements: announcements.status === "fulfilled" ? announcements.value : [],
      observations: observations.status === "fulfilled" ? observations.value : []
    });

    const failed = [tenant, summary, schedule, teacherLessons, currentLesson, announcements, observations].some((result) => result.status === "rejected");
    if (failed) {
      setError("Bazı operasyon verileri alınamadı; erişebildiğin modüller gösteriliyor.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
  }, [session.principal.userId]);

  return (
    <main className={`role-shell role-shell--${session.principal.role}`}>
      <header className="role-topbar">
        <div className="role-brand">
          <span>
            <GraduationCap size={20} />
          </span>
          <div>
            <strong>ÖTS</strong>
            <small>{data.tenant?.name ?? "Okul paneli"}</small>
          </div>
        </div>
        <div className="role-top-actions">
          <div className="role-profile">
            <strong>{session.principal.name}</strong>
            <span>{roleLabel(session.principal.role)}</span>
          </div>
          <button className="ghost-action role-logout" type="button" onClick={onLogout}>
            <LogOut size={16} />
            Çıkış
          </button>
        </div>
      </header>

      <section className="role-hero">
        <div>
          <span className="role-kicker">{roleLabel(session.principal.role)}</span>
          <h1>{heroTitle(session.principal.role)}</h1>
          <p>{heroDescription(session.principal.role)}</p>
        </div>
        <div className="token-card">
          <ShieldCheck size={18} />
          <div>
            <strong>Oturum aktif</strong>
            <span>Token süresi: {new Date(session.expiresAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </section>

      {loading && <div className="role-alert">Veriler hazırlanıyor...</div>}
      {error && <div className="role-alert role-alert--warn">{error}</div>}

      {dashboardForRole(session.principal.role, data, loadDashboard)}

      <section className="role-support-panel">
        <SupportContactForm session={session} />
      </section>
    </main>
  );
}

function dashboardForRole(role: string, data: DashboardData, refresh: () => Promise<void>) {
  switch (role) {
    case "principal":
    case "system_admin":
      return <PrincipalDashboard data={data} />;
    case "guidance":
      return <GuidanceDashboard announcements={data.announcements} observations={data.observations} summary={data.summary} />;
    case "teacher":
      return <TeacherDashboard data={data} onRefresh={refresh} />;
    case "guardian":
      return <GuardianDashboard data={data} />;
    default:
      return <PrincipalDashboard data={data} />;
  }
}
