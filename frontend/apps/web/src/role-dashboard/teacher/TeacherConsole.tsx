import {
  AlertCircle,
  Bell,
  BookOpenCheck,
  Megaphone,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Home,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  NotebookPen,
  Plus,
  Search,
  UserCheck,
  UserCircle,
  UsersRound,
  XCircle
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppBrand } from "../../components/AppBrand";
import { NavbarUserMenu, SidebarFooter } from "../../components/ShellChrome";
import { roleLabel } from "../../admin/utils/labels";
import type { Announcement, AttendanceRecord, AttendanceSession, AuthSession, Lesson, Observation } from "../../lib/api";
import { api } from "../../lib/api";
import { ProfilePage } from "../pages/ProfilePage";
import { RoleAnnouncementsPage } from "../pages/RoleAnnouncementsPage";
import { RoleNotificationsPage } from "../pages/RoleNotificationsPage";
import { RoleSupportPage } from "../pages/RoleSupportPage";
import { TablePagination } from "../components/TablePagination";
import { usePaginatedRows } from "../hooks/usePaginatedRows";
import { observationCategories } from "../data";
import type { DashboardData } from "../types";
import { categoryLabel } from "../utils";
import { GuidanceAnnouncementList } from "../guidance/components/GuidanceAnnouncementList";
import { GuidanceKpiCard } from "../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../guidance/components/GuidanceMetricGrid";
import { GuidanceObservationList } from "../guidance/components/GuidanceObservationList";
import { GuidanceSectionPanel } from "../guidance/components/GuidanceSectionPanel";
import "../guidance/GuidanceDataPage.css";
import "../guidance/GuidanceConsole.css";
import "../guidance/GuidanceOverview.css";
import "../guidance/GuidanceSurface.css";
import { TeacherAttendanceRing } from "./components/TeacherAttendanceRing";
import { TeacherAttendancePage } from "./pages/TeacherAttendancePage";
import { TeacherHomeworkPage } from "./pages/TeacherHomeworkPage";
import { TeacherLessonsPage } from "./pages/TeacherLessonsPage";
import { isLessonInAttendanceWindow } from "./utils/lessonSchedule";
import { OgtaAiDock } from "../ai/OgtaAiDock";
import "../../styles/super-admin-app.css";
import "./TeacherOverview.css";
import "./TeacherConsole.css";

const OBSERVATION_PAGE_SIZE = 12;

type AttendanceStatus = AttendanceRecord["status"];

const teacherTabs = [
  { id: "overview", label: "Genel", icon: <Home size={18} /> },
  { id: "lessons", label: "Derslerim", icon: <CalendarDays size={18} /> },
  { id: "homework", label: "Ödevler", icon: <BookOpenCheck size={18} /> },
  { id: "attendance", label: "Yoklama", icon: <ClipboardCheck size={18} /> },
  { id: "observations", label: "Gözlemler", icon: <NotebookPen size={18} /> },
  { id: "announcements", label: "Duyurular", icon: <Megaphone size={18} /> },
  { id: "notifications", label: "Bildirimler", icon: <Bell size={18} /> },
  { id: "support", label: "Destek", icon: <LifeBuoy size={18} /> },
  { id: "profile", label: "Profil", icon: <UserCircle size={18} /> }
] as const;

const attendanceStatuses: Array<{ value: AttendanceStatus; label: string; icon: ReactNode }> = [
  { value: "present", label: "Geldi", icon: <CheckCircle2 size={15} /> },
  { value: "absent", label: "Gelmedi", icon: <XCircle size={15} /> },
  { value: "late", label: "Geç", icon: <Clock3 size={15} /> },
  { value: "excused", label: "İzinli", icon: <AlertCircle size={15} /> }
];

const dayLabels = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function initialDashboardData(): DashboardData {
  return { teacherLessons: [], announcements: [], observations: [] };
}

export function TeacherConsole({
  session,
  onLogout,
  onSessionUpdate
}: {
  session: AuthSession;
  onLogout: () => void;
  onSessionUpdate: (session: AuthSession) => void;
}) {
  const [data, setData] = useState<DashboardData>(() => initialDashboardData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [teacherStudents, setTeacherStudents] = useState<Array<{ id: string; name: string; className: string }>>([]);
  const [observationForm, setObservationForm] = useState({ studentId: "", category: "participation", note: "" });
  const [attendanceBaseline, setAttendanceBaseline] = useState<string | null>(null);
  const [observationLoading, setObservationLoading] = useState(false);
  const [observationMessage, setObservationMessage] = useState<string | null>(null);
  const [observationError, setObservationError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = location.pathname.replace(/^\/dashboard\/?/, "");
  const activeTab = activePath.split("/")[0] || "overview";
  const activeLesson = data.currentLesson?.found ? data.currentLesson.lesson : undefined;
  const todayLessons = useMemo(() => sortLessons(data.teacherLessons), [data.teacherLessons]);
  const suggestedLesson = activeLesson ?? todayLessons[0] ?? null;
  const teacherObservations = useMemo(
    () => data.observations.filter((item) => item.authorId === session.principal.userId || item.authorName === session.principal.name),
    [data.observations, session.principal.name, session.principal.userId]
  );

  async function load() {
    setLoading(true);
    setError(null);
    const [tenant, summary, schedule, teacherLessonsResult, currentLesson, announcements, observations, studentsResult] =
      await Promise.allSettled([
        api.tenant(),
        api.dashboard(),
        api.schedule(),
        api.teacherCalendar(),
        api.currentLesson(),
        api.announcements(),
        api.observations(),
        api.teacherStudents()
      ]);

    setData({
      tenant: tenant.status === "fulfilled" ? tenant.value : undefined,
      summary: summary.status === "fulfilled" ? summary.value : undefined,
      schedule: schedule.status === "fulfilled" ? schedule.value : undefined,
      teacherLessons: teacherLessonsResult.status === "fulfilled" ? (teacherLessonsResult.value ?? []) : [],
      currentLesson: currentLesson.status === "fulfilled" ? currentLesson.value : undefined,
      announcements: announcements.status === "fulfilled" ? (announcements.value ?? []) : [],
      observations: observations.status === "fulfilled" ? (observations.value ?? []) : []
    });

    if (studentsResult.status === "fulfilled") {
      const teacherLessons = teacherLessonsResult.status === "fulfilled" ? (teacherLessonsResult.value ?? []) : [];
      const classNameById = new Map(teacherLessons.map((lesson) => [lesson.classId, lesson.className]));
      const mapped = (studentsResult.value ?? []).map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`.trim(),
        className: classNameById.get(student.classId) ?? (student.classId || "Sınıf")
      }));
      setTeacherStudents(mapped);
      setObservationForm((current) => ({
        ...current,
        studentId: current.studentId || mapped[0]?.id || ""
      }));
    }

    const failed = [tenant, summary, schedule, teacherLessonsResult, currentLesson, announcements, observations, studentsResult].some(
      (result) => result.status === "rejected"
    );
    if (failed) {
      setError("Bazı öğretmen paneli verileri alınamadı; erişilebilen alanlar gösteriliyor.");
    }
    setLoading(false);
  }

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
  }, [session.principal.userId, loadUnreadNotifications]);

  const attendanceDirty = useMemo(() => {
    if (!attendanceSession || attendanceSession.finalizedAt) {
      return false;
    }
    if (!attendanceBaseline) {
      return false;
    }
    return JSON.stringify(attendanceSession.records) !== attendanceBaseline;
  }, [attendanceBaseline, attendanceSession]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!attendanceDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [attendanceDirty]);

  async function openAttendance(lesson?: Lesson, redirect = false) {
    const lessonToOpen = lesson ?? suggestedLesson;
    setAttendanceMessage(null);
    setAttendanceError(null);
    if (!lessonToOpen) {
      setAttendanceError("Yayınlanmış ders programında bu öğretmene atanmış ders bulunamadı.");
      return;
    }
    if (!isLessonInAttendanceWindow(lessonToOpen)) {
      setAttendanceError("Yoklama penceresi kapalı. Ders başlangıcından 10 dk önce ile bitişinden 10 dk sonrasına kadar erişilebilir.");
      return;
    }
    setAttendanceLoading(true);
    try {
      let loaded: AttendanceSession;
      try {
        loaded = await api.getAttendanceSessionByLesson(lessonToOpen.id);
      } catch {
        loaded = await api.createAttendanceSession(lessonToOpen.id);
      }
      setAttendanceSession(loaded);
      setAttendanceBaseline(JSON.stringify(loaded.records));
      setAttendanceMessage(`${loaded.className} · ${loaded.subjectName} yoklama listesi hazır.`);
      if (redirect) {
        navigate("/dashboard/attendance");
      }
    } catch (openError) {
      setAttendanceError(openError instanceof Error ? openError.message : "Yoklama oturumu açılamadı.");
    } finally {
      setAttendanceLoading(false);
    }
  }

  const closeAttendanceSession = useCallback(() => {
    setAttendanceSession(null);
    setAttendanceBaseline(null);
    setAttendanceMessage(null);
    setAttendanceError(null);
  }, []);

  async function reopenAttendance() {
    if (!attendanceSession) {
      return;
    }
    setAttendanceLoading(true);
    setAttendanceMessage(null);
    setAttendanceError(null);
    try {
      const reopened = await api.reopenAttendanceSession(attendanceSession.id);
      setAttendanceSession(reopened);
      setAttendanceBaseline(JSON.stringify(reopened.records));
      setAttendanceMessage("Yoklama düzenleme modunda açıldı.");
    } catch (reopenError) {
      setAttendanceError(reopenError instanceof Error ? reopenError.message : "Yoklama düzenleme açılamadı.");
    } finally {
      setAttendanceLoading(false);
    }
  }

  function updateAttendanceStatus(studentId: string, status: AttendanceStatus) {
    setAttendanceSession((current) =>
      current
        ? {
            ...current,
            records: current.records.map((record) => (record.studentId === studentId ? { ...record, status } : record))
          }
        : current
    );
  }

  function markAllPresent() {
    setAttendanceSession((current) =>
      current ? { ...current, records: current.records.map((record) => ({ ...record, status: "present" })) } : current
    );
  }

  async function saveAttendance() {
    if (!attendanceSession) {
      return;
    }
    if (attendanceSession.finalizedAt) {
      setAttendanceError("Bu yoklama oturumu zaten kesinleştirildi.");
      return;
    }
    setAttendanceLoading(true);
    setAttendanceMessage(null);
    setAttendanceError(null);
    try {
      const saved = await api.updateAttendanceRecords(attendanceSession.id, attendanceSession.records);
      const finalized = await api.finalizeAttendanceSession(saved.id);
      setAttendanceSession(finalized);
      setAttendanceBaseline(JSON.stringify(finalized.records));
      setAttendanceMessage("Yoklama kaydedildi.");
      await load();
    } catch (saveError) {
      setAttendanceError(saveError instanceof Error ? saveError.message : "Yoklama kaydedilemedi.");
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function createObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setObservationMessage(null);
    setObservationError(null);
    setObservationLoading(true);
    try {
      const created = await api.createObservation(observationForm);
      setData((current) => ({ ...current, observations: [created, ...current.observations] }));
      setObservationForm((current) => ({ ...current, note: "" }));
      setObservationMessage("Gözlem kaydı rehberlik akışına aktarıldı.");
    } catch (createError) {
      setObservationError(createError instanceof Error ? createError.message : "Gözlem kaydı oluşturulamadı.");
    } finally {
      setObservationLoading(false);
    }
  }

  return (
    <div className="admin-shell principal-console teacher-console">
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
        <nav className="admin-nav" aria-label="Öğretmen menüsü">
          {teacherTabs.map((tab) => (
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

      <main className={`admin-workspace teacher-workspace ${activeTab}-workspace`}>
        <div className="sa-main teacher-main">
          {error && <div className="form-error workspace-error sa-alert">{error}</div>}
          {loading && (
            <div className="loading-line">
              <Loader2 className="spin" size={18} />
              Öğretmen paneli hazırlanıyor
            </div>
          )}

          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route
              path="overview"
              element={
                <TeacherOverviewPage
                  activeLesson={activeLesson}
                  announcements={data.announcements}
                  attendanceLoading={attendanceLoading}
                  attendanceSession={attendanceSession}
                  currentLessonReason={data.currentLesson?.reason}
                  lessons={todayLessons}
                  observations={teacherObservations}
                  onOpenAttendance={(lesson) => void openAttendance(lesson, true)}
                  studentCount={teacherStudents.length}
                />
              }
            />
            <Route path="lessons" element={<TeacherLessonsPage lessons={data.teacherLessons} activeLessonId={activeLesson?.id} />} />
            <Route path="homework" element={<TeacherHomeworkPage lessons={data.teacherLessons} />} />
            <Route
              path="attendance"
              element={
                <TeacherAttendancePage
                  activeLesson={activeLesson}
                  attendanceError={attendanceError}
                  attendanceLoading={attendanceLoading}
                  attendanceMessage={attendanceMessage}
                  lessons={data.teacherLessons}
                  session={attendanceSession}
                  onMarkAllPresent={markAllPresent}
                  onOpenList={(lesson) => void openAttendance(lesson)}
                  onReopen={() => void reopenAttendance()}
                  onSaveAttendance={() => void saveAttendance()}
                  onSessionClosed={closeAttendanceSession}
                  onUpdateStatus={updateAttendanceStatus}
                />
              }
            />
            <Route
              path="observations"
              element={
                <TeacherObservationsPage
                  error={observationError}
                  form={observationForm}
                  loading={observationLoading}
                  message={observationMessage}
                  observations={teacherObservations}
                  students={teacherStudents}
                  onChange={setObservationForm}
                  onPrepareForm={() => {
                    setObservationMessage(null);
                    setObservationError(null);
                    setObservationForm((current) => ({
                      studentId: current.studentId || teacherStudents[0]?.id || "",
                      category: current.category || "participation",
                      note: ""
                    }));
                  }}
                  onSubmit={createObservation}
                />
              }
            />
            <Route path="announcements" element={<RoleAnnouncementsPage announcements={data.announcements} />} />
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

function TeacherOverviewPage({
  activeLesson,
  announcements,
  attendanceLoading,
  attendanceSession,
  currentLessonReason,
  lessons,
  observations,
  onOpenAttendance,
  studentCount
}: {
  activeLesson?: Lesson;
  announcements: Announcement[];
  attendanceLoading: boolean;
  attendanceSession: AttendanceSession | null;
  currentLessonReason?: string;
  lessons: Lesson[];
  observations: Observation[];
  onOpenAttendance: (lesson: Lesson) => void;
  studentCount: number;
}) {
  const [pickedLessonId, setPickedLessonId] = useState("");

  useEffect(() => {
    const nextId = activeLesson?.id ?? lessons[0]?.id ?? "";
    setPickedLessonId((current) => {
      if (current && lessons.some((lesson) => lesson.id === current)) {
        return current;
      }
      return nextId;
    });
  }, [activeLesson?.id, lessons]);

  const pickedLesson = lessons.find((lesson) => lesson.id === pickedLessonId) ?? activeLesson ?? lessons[0] ?? null;
  const pendingAttendance = attendanceSession ? attendanceSession.records.filter((record) => record.status === "unknown").length : 0;
  const attendanceTotal = attendanceSession?.records.length ?? 0;
  const attendanceProgress =
    attendanceTotal > 0 ? Math.round(((attendanceTotal - pendingAttendance) / attendanceTotal) * 100) : activeLesson ? 12 : 0;
  const activeClassLabel = activeLesson?.className ?? pickedLesson?.className ?? "—";

  return (
    <section className="guidance-page-stack guidance-overview-page guidance-surface-page teacher-overview-page">
      {lessons.length === 0 ? (
        <div className="teacher-alert-banner">
          <AlertCircle size={18} aria-hidden />
          <div>
            <strong>Bugün için atanmış ders bulunamadı</strong>
            <p>Yayınlanmış programda bu güne ait ders yoksa yoklama alınamaz.</p>
          </div>
        </div>
      ) : null}

      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<CalendarDays size={20} />} label="Bugünkü ders" value={lessons.length} detail="Yayınlanmış program" tone="sky" />
        <GuidanceKpiCard icon={<UserCheck size={20} />} label="Aktif sınıf" value={activeClassLabel} detail={pickedLesson?.subjectName ?? "Ders seçin"} tone="emerald" />
        <GuidanceKpiCard icon={<ClipboardCheck size={20} />} label="Yoklama bekleyen" value={pendingAttendance} detail={attendanceTotal > 0 ? `${attendanceTotal} öğrenci` : "Oturum kapalı"} tone="amber" />
        <GuidanceKpiCard icon={<NotebookPen size={20} />} label="Gözlem kaydı" value={observations.length} detail={`${studentCount} öğrenci kapsamı`} tone="violet" />
      </GuidanceMetricGrid>

      <div className="teacher-bento teacher-bento--primary">
        <GuidanceSectionPanel title="Yoklama" actionLabel="Yoklama sayfası" actionTo="/dashboard/attendance">
          <div className="teacher-attendance-panel">
            <div className="teacher-attendance-panel-body">
              <TeacherAttendanceRing percent={attendanceProgress} caption={attendanceTotal > 0 ? "Tamamlanma" : "Hazırlık"} />
              <div className="teacher-attendance-copy">
                <strong>{pickedLesson ? `${pickedLesson.className} · ${pickedLesson.subjectName}` : currentLessonReason ?? "Ders seçilmedi"}</strong>
                <span>
                  {pickedLesson
                    ? `${formatLessonTime(pickedLesson)} · ${pickedLesson.room || "Derslik belirtilmedi"}`
                    : "Sağdaki listeden ders seçip yoklama açabilirsiniz."}
                </span>
                <span className={`status-badge ${activeLesson ? "active" : "warning"}`}>{activeLesson ? "Aktif ders" : "Manuel seçim"}</span>
              </div>
            </div>
            <div className="teacher-attendance-panel-actions">
              <button className="primary-action" type="button" onClick={() => pickedLesson && onOpenAttendance(pickedLesson)} disabled={attendanceLoading || !pickedLesson}>
                {attendanceLoading ? <Loader2 className="spin" size={17} /> : <ClipboardCheck size={17} />}
                Yoklamayı aç
              </button>
              <NavLink className="ghost-action" to="/dashboard/attendance">
                Detaylı yoklama
              </NavLink>
            </div>
          </div>
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Bugünkü dersler" actionLabel="Derslerim" actionTo="/dashboard/lessons">
          <p className="teacher-lesson-pick-hint">Yoklama için ders satırına tıklayın.</p>
          <TeacherLessonPickList
            lessons={lessons.slice(0, 6)}
            activeLessonId={activeLesson?.id}
            pickedLessonId={pickedLessonId}
            onPick={setPickedLessonId}
            onOpenAttendance={onOpenAttendance}
            attendanceLoading={attendanceLoading}
          />
        </GuidanceSectionPanel>
      </div>

      <div className="teacher-bento teacher-bento--secondary">
        <GuidanceSectionPanel title="Son gözlemler" actionLabel="Gözlemler" actionTo="/dashboard/observations">
          <GuidanceObservationList observations={observations} limit={4} />
        </GuidanceSectionPanel>
        <GuidanceSectionPanel
          title="Duyurular"
          aside={
            <span className="guidance-panel-badge">
              <Bell size={14} />
              {announcements.length}
            </span>
          }
          actionLabel="Tümü"
          actionTo="/dashboard/announcements"
        >
          <GuidanceAnnouncementList announcements={announcements.slice(0, 4)} />
        </GuidanceSectionPanel>
      </div>
    </section>
  );
}

function TeacherLessonPickList({
  lessons,
  activeLessonId,
  pickedLessonId,
  onPick,
  onOpenAttendance,
  attendanceLoading
}: {
  lessons: Lesson[];
  activeLessonId?: string;
  pickedLessonId: string;
  onPick: (lessonId: string) => void;
  onOpenAttendance: (lesson: Lesson) => void;
  attendanceLoading: boolean;
}) {
  if (lessons.length === 0) {
    return <p className="empty-text guidance-empty-pad">Yayınlanmış programda ders bulunamadı.</p>;
  }

  return (
    <div className="teacher-lesson-pick-list">
      {lessons.map((lesson) => {
        const isActive = lesson.id === activeLessonId;
        const isSelected = lesson.id === pickedLessonId;
        return (
          <button
            className={`teacher-lesson-pick-row${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}`}
            key={lesson.id}
            type="button"
            disabled={attendanceLoading}
            onClick={() => onPick(lesson.id)}
            onDoubleClick={() => onOpenAttendance(lesson)}
          >
            <div className="teacher-lesson-pick-time">
              <strong>{lesson.startTime}</strong>
              <span>{lesson.endTime}</span>
            </div>
            <div className="teacher-lesson-pick-main">
              <strong>
                {lesson.className} · {lesson.subjectName}
              </strong>
              <span>
                {dayLabels[lesson.dayOfWeek] ?? "Gün"} · {lesson.room || "Derslik yok"}
              </span>
            </div>
            <span className={`status-badge ${isActive ? "active" : "normal"}`}>{isActive ? "Aktif" : isSelected ? "Seçili" : "Seç"}</span>
          </button>
        );
      })}
    </div>
  );
}

function TeacherObservationsPage({
  error,
  form,
  loading,
  message,
  observations,
  students,
  onChange,
  onPrepareForm,
  onSubmit
}: {
  error: string | null;
  form: { studentId: string; category: string; note: string };
  loading: boolean;
  message: string | null;
  observations: Observation[];
  students: Array<{ id: string; name: string; className: string }>;
  onChange: (next: { studentId: string; category: string; note: string }) => void;
  onPrepareForm: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = observations.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length;
    const studentIds = new Set(observations.map((item) => item.studentId));
    return { total: observations.length, students: studentIds.size, recentCount, roster: students.length };
  }, [observations, students.length]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    for (const observation of observations) {
      if (observation.className.trim()) {
        set.add(observation.className);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [observations]);

  const filteredObservations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return observations.filter((observation) => {
      const categoryMatch = categoryFilter === "all" || observation.category === categoryFilter;
      const classMatch = !classFilter || observation.className === classFilter;
      const dateMatch = !dateFilter || observation.createdAt.startsWith(dateFilter);
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${observation.studentName} ${observation.className} ${categoryLabel(observation.category)} ${observation.note}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return categoryMatch && classMatch && dateMatch && queryMatch;
    });
  }, [categoryFilter, classFilter, dateFilter, observations, query]);

  const filterKey = `${categoryFilter}|${classFilter}|${dateFilter}|${query}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(
    filteredObservations,
    filterKey,
    OBSERVATION_PAGE_SIZE
  );

  function openModal() {
    onPrepareForm();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  useEffect(() => {
    if (modalOpen && message) {
      closeModal();
    }
  }, [message, modalOpen]);

  return (
    <section className="guidance-page-stack guidance-surface-page teacher-overview-page guidance-data-page">
      {message && !modalOpen ? <div className="form-success">{message}</div> : null}

      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<NotebookPen size={20} />} label="Toplam kayıt" value={stats.total} detail={`${filteredObservations.length} filtrelenmiş`} tone="sky" />
        <GuidanceKpiCard icon={<UsersRound size={20} />} label="Öğrenci" value={stats.students} detail={`${stats.roster} kapsam`} tone="emerald" />
        <GuidanceKpiCard icon={<CalendarDays size={20} />} label="Son 7 gün" value={stats.recentCount} detail="Yeni gözlem" tone="violet" />
        <GuidanceKpiCard icon={<Search size={20} />} label="Kategori" value={observationCategories.length} detail="Gözlem türü" tone="amber" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Gözlem kayıtları</h2>
          <div className="guidance-data-card-head-actions">
            <span>{filteredObservations.length} kayıt</span>
            <button className="primary-action small-action" type="button" onClick={openModal} disabled={students.length === 0}>
              <Plus size={16} />
              Yeni gözlem
            </button>
          </div>
        </header>

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Kategori filtresi">
            <option value="all">Tüm kategoriler</option>
            {observationCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <select className="guidance-data-select" value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Sınıf filtresi">
            <option value="">Tüm sınıflar</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          <input className="guidance-data-date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" aria-label="Tarih filtresi" />
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Öğrenci, sınıf, not…" type="search" />
          </label>
        </div>

        {filteredObservations.length === 0 ? (
          <p className="guidance-data-empty">{observations.length === 0 ? "Henüz gözlem kaydı yok." : "Filtrelere uyan gözlem bulunamadı."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Kategori</th>
                    <th>Gözlem notu</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((observation) => (
                    <tr key={observation.id}>
                      <td>
                        <span className="guidance-data-primary">{observation.studentName}</span>
                        <span className="guidance-data-secondary">{observation.className || "—"}</span>
                      </td>
                      <td>
                        <span className="guidance-data-badge">{categoryLabel(observation.category)}</span>
                      </td>
                      <td>
                        <p className="guidance-data-text">{observation.note}</p>
                      </td>
                      <td className="guidance-data-date-cell">{formatDateTime(observation.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} />
          </>
        )}
      </article>

      {modalOpen ? (
        <div className="guidance-modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="guidance-modal guidance-note-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-observation-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="teacher-observation-modal-title">Yeni gözlem kaydı</h3>
            <p className="teacher-observation-modal-lead">Seçtiğiniz öğrenci için kısa ve olay odaklı bir gözlem yazın; kayıt rehberlik değerlendirmesine aktarılır.</p>
            {error ? <div className="form-error">{error}</div> : null}
            <form className="guidance-note-form" onSubmit={onSubmit}>
              <label className="field">
                <span>Öğrenci</span>
                <select value={form.studentId} onChange={(event) => onChange({ ...form, studentId: event.target.value })} required>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} · {student.className}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Kategori</span>
                <select value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })} required>
                  {observationCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Not</span>
                <textarea
                  value={form.note}
                  onChange={(event) => onChange({ ...form, note: event.target.value })}
                  placeholder="Kısa, ölçülebilir ve olay odaklı gözlem notu yazın"
                  rows={5}
                  maxLength={1200}
                  required
                />
              </label>
              <div className="guidance-modal-actions">
                <button className="ghost-action" type="button" onClick={closeModal}>
                  Vazgeç
                </button>
                <button className="primary-action" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="spin" size={17} /> : <MessageSquareText size={17} />}
                  Rehberliğe aktar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TeacherAnnouncementsPage({ announcements }: { announcements: Announcement[] }) {
  return (
    <section className="teacher-page-stack">
      <div className="teacher-page-title">
        <span className="section-kicker">Okul iletişimi</span>
        <h1>Duyurular</h1>
      </div>
      <section className="principal-surface-card">
        <div className="teacher-card-head">
          <div>
            <h2>Kurum duyuruları</h2>
            <p>Öğretmen, veli ve kurum geneli bilgilendirmeleri.</p>
          </div>
        </div>
        <AnnouncementList announcements={announcements} detailed />
      </section>
    </section>
  );
}

function TeacherLessonTimeline({ activeLessonId, detailed = false, lessons }: { activeLessonId?: string; detailed?: boolean; lessons: Lesson[] }) {
  if (lessons.length === 0) {
    return <p className="empty-text teacher-empty-pad">Yayınlanmış programda ders bulunamadı.</p>;
  }

  return (
    <div className={detailed ? "teacher-lesson-list teacher-lesson-list--detailed" : "teacher-lesson-list"}>
      {lessons.map((lesson) => (
        <article className={lesson.id === activeLessonId ? "teacher-lesson-row is-active" : "teacher-lesson-row"} key={lesson.id}>
          <div className="teacher-lesson-time">
            <strong>{lesson.startTime}</strong>
            <span>{lesson.endTime}</span>
          </div>
          <div className="teacher-lesson-body">
            <strong>{lesson.className} · {lesson.subjectName}</strong>
            <span>
              {dayLabels[lesson.dayOfWeek] ?? "Gün"} · {lesson.room || "Derslik belirtilmedi"}
            </span>
          </div>
          <span className={`status-badge ${lesson.id === activeLessonId ? "active" : "normal"}`}>
            {lesson.id === activeLessonId ? "Aktif" : formatLessonTime(lesson)}
          </span>
        </article>
      ))}
    </div>
  );
}

function ObservationList({ observations }: { observations: Observation[] }) {
  if (observations.length === 0) {
    return <p className="empty-text teacher-empty-pad">Henüz gözlem kaydı yok.</p>;
  }

  return (
    <div className="teacher-observation-list">
      {observations.map((observation) => (
        <article className="teacher-observation-row" key={observation.id}>
          <div>
            <strong>{observation.studentName}</strong>
            <span>{observation.className} · {categoryLabel(observation.category)}</span>
          </div>
          <p>{observation.note}</p>
          <small>{formatDateTime(observation.createdAt)}</small>
        </article>
      ))}
    </div>
  );
}

function AnnouncementList({ announcements, detailed = false }: { announcements: Announcement[]; detailed?: boolean }) {
  if (announcements.length === 0) {
    return <p className="empty-text teacher-empty-pad">Yayınlanmış duyuru yok.</p>;
  }

  return (
    <div className={detailed ? "teacher-announcement-list teacher-announcement-list--detailed" : "teacher-announcement-list"}>
      {announcements.map((announcement) => (
        <article className="teacher-announcement-row" key={announcement.id}>
          <div>
            <strong>{announcement.title}</strong>
            <span>{announcement.audience} · {formatDateTime(announcement.publishedAt)}</span>
          </div>
          {detailed && <p>{announcement.body}</p>}
        </article>
      ))}
    </div>
  );
}

function sortLessons(lessons: Lesson[]) {
  return [...lessons].sort((a, b) => {
    const startsAtA = new Date(a.startsAt).getTime();
    const startsAtB = new Date(b.startsAt).getTime();
    if (Number.isFinite(startsAtA) && Number.isFinite(startsAtB) && startsAtA !== startsAtB) {
      return startsAtA - startsAtB;
    }
    return `${a.dayOfWeek}-${a.startTime}`.localeCompare(`${b.dayOfWeek}-${b.startTime}`, "tr-TR");
  });
}

function formatLessonTime(lesson: Lesson) {
  return `${lesson.startTime} - ${lesson.endTime}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
