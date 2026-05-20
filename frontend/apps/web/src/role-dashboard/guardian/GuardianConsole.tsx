import { Bell, CalendarDays, ClipboardCheck, GraduationCap, Home, LifeBuoy, Loader2, LogOut, School, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { AuthSession, GuardianStudent } from "../../lib/api";
import { api } from "../../lib/api";
import { SupportContactForm } from "../../pages/SupportContactForm";
import { GuardianAnnouncementsPage } from "./pages/GuardianAnnouncementsPage";
import { GuardianAttendancePage } from "./pages/GuardianAttendancePage";
import { GuardianChildPage } from "./pages/GuardianChildPage";
import { GuardianOverviewPage } from "./pages/GuardianOverviewPage";
import { GuardianSchedulePage } from "./pages/GuardianSchedulePage";
import type { GuardianChild, GuardianData } from "./types";
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

const avatarTones: GuardianChild["avatarTone"][] = ["amber", "sky", "emerald"];

function mapGuardianStudent(student: GuardianStudent, tenantName: string, index: number): GuardianChild {
  return {
    id: student.id,
    fullName: student.fullName,
    className: student.className,
    schoolNumber: student.schoolNumber,
    tenantName,
    avatarTone: avatarTones[index % avatarTones.length]
  };
}

function initialGuardianData(): GuardianData {
  return { scheduleLessons: [], announcements: [], attendanceRecords: [], notifications: [] };
}

export function GuardianConsole({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [data, setData] = useState<GuardianData>(() => initialGuardianData());
  const [children, setChildren] = useState<GuardianChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const activePath = location.pathname.replace(/^\/dashboard\/?/, "");
  const activeTab = activePath.split("/")[0] || "overview";
  const selectedChild = children.find((item) => item.id === selectedChildId) ?? children[0] ?? null;

  const childLessons = useMemo(
    () =>
      [...data.scheduleLessons].sort((a, b) =>
        `${a.dayOfWeek}-${a.startTime}`.localeCompare(`${b.dayOfWeek}-${b.startTime}`, "tr-TR")
      ),
    [data.scheduleLessons]
  );

  async function loadChildData(childId: string, tenantName: string) {
    const [scheduleResult, attendanceResult, announcementsResult, notificationsResult] = await Promise.allSettled([
      api.guardianStudentSchedule(childId),
      api.guardianStudentAttendance(childId),
      api.guardianAnnouncements(),
      api.guardianNotifications()
    ]);

    setData({
      tenant: { id: "", name: tenantName, plan: "", timezone: "" },
      scheduleLessons: scheduleResult.status === "fulfilled" ? scheduleResult.value.lessons : [],
      announcements: announcementsResult.status === "fulfilled" ? (announcementsResult.value ?? []) : [],
      attendanceRecords: attendanceResult.status === "fulfilled" ? attendanceResult.value.records : [],
      notifications: notificationsResult.status === "fulfilled" ? (notificationsResult.value ?? []) : []
    });
  }

  async function load() {
    setLoading(true);
    setError(null);
    const [tenantResult, studentsResult] = await Promise.allSettled([api.tenant(), api.guardianStudents()]);

    const tenantName = tenantResult.status === "fulfilled" ? tenantResult.value.name : "Veli paneli";
    const mappedChildren =
      studentsResult.status === "fulfilled"
        ? (studentsResult.value ?? []).map((student, index) => mapGuardianStudent(student, tenantName, index))
        : [];

    setChildren(mappedChildren);
    const childId = mappedChildren[0]?.id ?? "";
    setSelectedChildId(childId);

    if (childId) {
      await loadChildData(childId, tenantName);
    } else {
      setData(initialGuardianData());
    }

    const failed = [tenantResult, studentsResult].some((result) => result.status === "rejected");
    if (failed) {
      setError("Bazı veli paneli verileri alınamadı; erişilebilen bilgiler gösteriliyor.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [session.principal.userId]);

  useEffect(() => {
    if (!selectedChildId || children.length === 0) {
      return;
    }
    const tenantName = children[0]?.tenantName ?? "Veli paneli";
    void loadChildData(selectedChildId, tenantName);
  }, [selectedChildId]);

  async function handleSelectChild(childId: string) {
    setSelectedChildId(childId);
  }

  async function handleMarkNotificationRead(notificationId: string) {
    try {
      await api.guardianNotificationMarkRead(notificationId);
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((item) =>
          item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item
        )
      }));
    } catch {
      setError("Bildirim güncellenemedi.");
    }
  }

  if (!selectedChild && !loading) {
    return (
      <div className="admin-shell principal-console guardian-console">
        <main className="admin-workspace guardian-workspace">
          <p className="empty-text">Bu hesaba bağlı öğrenci bulunamadı.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell principal-console guardian-console">
      <header className="admin-navbar">
        <div className="navbar-brand">
          <div className="admin-mark">
            <GraduationCap size={22} />
          </div>
          <div>
            <strong>ÖTS</strong>
            <span>{children[0]?.tenantName ?? "Veli paneli"}</span>
          </div>
        </div>

        {children.length > 1 ? (
          <label className="guardian-child-select field">
            <span>Öğrenci</span>
            <select value={selectedChildId} onChange={(event) => void handleSelectChild(event.target.value)}>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.fullName} · {child.className}
                </option>
              ))}
            </select>
          </label>
        ) : null}

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

          {selectedChild ? (
            <Routes>
              <Route index element={<Navigate to="overview" replace />} />
              <Route
                path="overview"
                element={
                  <GuardianOverviewPage
                    child={selectedChild}
                    data={data}
                    lessons={childLessons}
                    onMarkNotificationRead={(id) => void handleMarkNotificationRead(id)}
                  />
                }
              />
              <Route path="child" element={<GuardianChildPage child={selectedChild} />} />
              <Route path="schedule" element={<GuardianSchedulePage child={selectedChild} lessons={childLessons} />} />
              <Route path="attendance" element={<GuardianAttendancePage child={selectedChild} records={data.attendanceRecords} />} />
              <Route path="announcements" element={<GuardianAnnouncementsPage data={data} />} />
              <Route path="support" element={<SupportContactForm session={session} />} />
              <Route path="*" element={<Navigate to="overview" replace />} />
            </Routes>
          ) : null}
        </div>
      </main>
    </div>
  );
}
