import { Bell, BookOpenCheck, CalendarDays, ClipboardCheck, Home, LifeBuoy, Loader2, Megaphone, UserCircle, UserRound } from "lucide-react";
import { AppSidebar } from "../../components/ShellChrome";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { AuthSession, GuardianStudent } from "../../lib/api";
import { api } from "../../lib/api";
import { ProfilePage } from "../pages/ProfilePage";
import { RoleAnnouncementsPage } from "../pages/RoleAnnouncementsPage";
import { RoleNotificationsPage } from "../pages/RoleNotificationsPage";
import { RoleSupportPage } from "../pages/RoleSupportPage";
import { GuardianAttendancePage } from "./pages/GuardianAttendancePage";
import { GuardianChildPage } from "./pages/GuardianChildPage";
import { GuardianHomeworkPage } from "./pages/GuardianHomeworkPage";
import { GuardianOverviewPage } from "./pages/GuardianOverviewPage";
import { GuardianSchedulePage } from "./pages/GuardianSchedulePage";
import { NavbarStudentSelector } from "./components/NavbarStudentSelector";
import type { GuardianChild, GuardianData } from "./types";
import { OgtaAiDock } from "../ai/OgtaAiDock";
import "../../styles/super-admin-app.css";
import "./GuardianConsole.css";

const guardianTabs = [
  { id: "overview", label: "Genel", icon: <Home size={18} />, group: "Özet" },
  { id: "child", label: "Öğrencim", icon: <UserRound size={18} />, group: "Öğrenci" },
  { id: "homework", label: "Ödevler", icon: <BookOpenCheck size={18} />, group: "Öğrenci" },
  { id: "schedule", label: "Program", icon: <CalendarDays size={18} />, group: "Öğrenci" },
  { id: "attendance", label: "Devamsızlık", icon: <ClipboardCheck size={18} />, group: "Öğrenci" },
  { id: "announcements", label: "Duyurular", icon: <Megaphone size={18} />, group: "İletişim" },
  { id: "notifications", label: "Bildirimler", icon: <Bell size={18} />, group: "İletişim" },
  { id: "support", label: "Destek", icon: <LifeBuoy size={18} />, group: "İletişim" },
  { id: "profile", label: "Profil", icon: <UserCircle size={18} />, group: "İletişim" }
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
  return { scheduleLessons: [], announcements: [], attendanceRecords: [], notifications: [], guidanceUpdates: [] };
}

export function GuardianConsole({
  session,
  onLogout,
  onSessionUpdate
}: {
  session: AuthSession;
  onLogout: () => void;
  onSessionUpdate: (session: AuthSession) => void;
}) {
  const [data, setData] = useState<GuardianData>(() => initialGuardianData());
  const [children, setChildren] = useState<GuardianChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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
    const [scheduleResult, attendanceResult, announcementsResult, notificationsResult, guidanceUpdatesResult] = await Promise.allSettled([
      api.guardianStudentSchedule(childId),
      api.guardianStudentAttendance(childId),
      api.guardianAnnouncements(),
      api.guardianNotifications(),
      api.guardianStudentGuidanceUpdates(childId)
    ]);

    setData({
      tenant: { id: "", name: tenantName, plan: "", timezone: "" },
      scheduleLessons: scheduleResult.status === "fulfilled" ? scheduleResult.value.lessons : [],
      announcements: announcementsResult.status === "fulfilled" ? (announcementsResult.value ?? []) : [],
      attendanceRecords: attendanceResult.status === "fulfilled" ? attendanceResult.value.records : [],
      notifications: notificationsResult.status === "fulfilled" ? (notificationsResult.value ?? []) : [],
      guidanceUpdates: guidanceUpdatesResult.status === "fulfilled" ? (guidanceUpdatesResult.value ?? []) : []
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

  const syncUnreadNotifications = useCallback((notifications: GuardianData["notifications"]) => {
    setUnreadNotifications(notifications.filter((item) => !item.readAt).length);
  }, []);

  useEffect(() => {
    void load();
  }, [session.principal.userId]);

  useEffect(() => {
    syncUnreadNotifications(data.notifications);
  }, [data.notifications, syncUnreadNotifications]);

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
      <AppSidebar
        ariaLabel="Veli menüsü"
        basePath="/dashboard"
        extra={
          <NavbarStudentSelector
            students={children}
            selectedChildId={selectedChildId}
            onSelect={(childId) => void handleSelectChild(childId)}
          />
        }
        items={guardianTabs.map((tab) => ({
          ...tab,
          badge:
            tab.id === "notifications" && unreadNotifications > 0 ? (
              <span className="nav-unread-badge">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>
            ) : null
        }))}
        notificationMode="guardian"
        onLogout={onLogout}
        onUnreadNotificationsChange={setUnreadNotifications}
        tenantName={children[0]?.tenantName ?? "Kurum"}
        userMeta={roleLabel(session.principal.role)}
        userName={session.principal.name}
      />

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
              <Route
                path="child"
                element={
                  <GuardianChildPage
                    child={selectedChild}
                    students={children}
                    selectedChildId={selectedChildId}
                    onSelectChild={(childId) => void handleSelectChild(childId)}
                    data={data}
                    lessons={childLessons}
                  />
                }
              />
              <Route path="homework" element={<GuardianHomeworkPage child={selectedChild} />} />
              <Route path="schedule" element={<GuardianSchedulePage child={selectedChild} lessons={childLessons} />} />
              <Route path="attendance" element={<GuardianAttendancePage child={selectedChild} records={data.attendanceRecords} />} />
              <Route path="announcements" element={<RoleAnnouncementsPage announcements={data.announcements} />} />
              <Route
                path="notifications"
                element={<RoleNotificationsPage mode="guardian" onUnreadChange={setUnreadNotifications} />}
              />
              <Route path="support" element={<RoleSupportPage session={session} />} />
              <Route path="profile" element={<ProfilePage session={session} onSessionUpdate={onSessionUpdate} />} />
              <Route path="*" element={<Navigate to="overview" replace />} />
            </Routes>
          ) : null}
        </div>
      </main>
      <OgtaAiDock onActionCompleted={() => void load()} />
    </div>
  );
}
