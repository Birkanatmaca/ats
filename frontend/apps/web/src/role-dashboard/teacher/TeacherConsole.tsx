import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Home,
  LifeBuoy,
  Loader2,
  LogOut,
  MessageSquareText,
  NotebookPen,
  School,
  UserCheck,
  XCircle
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { Announcement, AttendanceRecord, AttendanceSession, AuthSession, Lesson, Observation } from "../../lib/api";
import { api } from "../../lib/api";
import { NotificationBell } from "../components/NotificationBell";
import { SupportContactForm } from "../../pages/SupportContactForm";
import { observationCategories } from "../data";
import type { DashboardData } from "../types";
import { attendanceLabel, categoryLabel } from "../utils";
import "../../styles/super-admin-app.css";
import "./TeacherConsole.css";

type AttendanceStatus = AttendanceRecord["status"];

const teacherTabs = [
  { id: "overview", label: "Genel", icon: <Home size={18} /> },
  { id: "lessons", label: "Derslerim", icon: <CalendarDays size={18} /> },
  { id: "attendance", label: "Yoklama", icon: <ClipboardCheck size={18} /> },
  { id: "observations", label: "Gözlemler", icon: <NotebookPen size={18} /> },
  { id: "announcements", label: "Duyurular", icon: <Bell size={18} /> },
  { id: "support", label: "Destek", icon: <LifeBuoy size={18} /> }
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

export function TeacherConsole({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [data, setData] = useState<DashboardData>(() => initialDashboardData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = location.pathname.replace(/^\/dashboard\/?/, "");
  const activeTab = activePath.split("/")[0] || "overview";
  const activeLesson = data.currentLesson?.found ? data.currentLesson.lesson : undefined;
  const todayLessons = useMemo(() => sortLessons(data.teacherLessons), [data.teacherLessons]);
  const selectedLesson =
    todayLessons.find((lesson) => lesson.id === selectedLessonId) ?? activeLesson ?? todayLessons[0] ?? null;
  const suggestedLesson = selectedLesson;
  const teacherObservations = useMemo(
    () => data.observations.filter((item) => item.authorId === session.principal.userId || item.authorName === session.principal.name),
    [data.observations, session.principal.name, session.principal.userId]
  );

  useEffect(() => {
    if (todayLessons.length === 0) {
      setSelectedLessonId("");
      return;
    }
    if (!selectedLessonId || !todayLessons.some((lesson) => lesson.id === selectedLessonId)) {
      const initial = activeLesson?.id ?? todayLessons[0]?.id ?? "";
      setSelectedLessonId(initial);
    }
  }, [todayLessons, activeLesson?.id, selectedLessonId]);

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
        api.listStudents()
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
      const lessonClassIds = new Set(teacherLessons.map((lesson) => lesson.classId));
      const classNameById = new Map(teacherLessons.map((lesson) => [lesson.classId, lesson.className]));
      const mapped = (studentsResult.value ?? [])
        .filter((student) => lessonClassIds.size === 0 || lessonClassIds.has(student.classId))
        .map((student) => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          className: classNameById.get(student.classId) ?? student.classId
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

  useEffect(() => {
    void load();
  }, [session.principal.userId]);

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
    setAttendanceLoading(true);
    try {
      const created = await api.createAttendanceSession(lessonToOpen.id);
      setAttendanceSession(created);
      setAttendanceBaseline(JSON.stringify(created.records));
      setAttendanceMessage(`${created.className} ${created.subjectName} yoklama listesi açıldı.`);
      if (redirect) {
        navigate("/dashboard/attendance");
      }
    } catch (openError) {
      setAttendanceError(openError instanceof Error ? openError.message : "Yoklama oturumu açılamadı.");
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
      setAttendanceMessage("Yoklama kaydedildi ve oturum kesinleştirildi.");
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
          <div className="admin-mark">
            <GraduationCap size={22} />
          </div>
          <div>
            <strong>ÖTS</strong>
            <span>{data.tenant?.name ?? "Öğretmen paneli"}</span>
          </div>
        </div>

        <div className="navbar-actions">
          <NotificationBell />
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
        <nav className="admin-nav" aria-label="Öğretmen menüsü">
          {teacherTabs.map((tab) => (
            <NavLink className={({ isActive }) => (isActive ? "nav-button active" : "nav-button")} key={tab.id} to={`/dashboard/${tab.id}`}>
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="developer-note">
          <School size={18} />
          <div>
            <strong>Öğretmen görünümü</strong>
            <span>Ders, yoklama ve gözlem akışı.</span>
          </div>
        </div>
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
                  currentLessonReason={data.currentLesson?.reason}
                  lessons={todayLessons}
                  observations={teacherObservations}
                  selectedLessonId={selectedLessonId}
                  onSelectLesson={setSelectedLessonId}
                  onOpenAttendance={() => void openAttendance(suggestedLesson ?? undefined, true)}
                  summary={{
                    lessonCount: todayLessons.length,
                    activeClass: activeLesson?.className ?? suggestedLesson?.className ?? "-",
                    pendingAttendance: attendanceSession ? attendanceSession.records.filter((record) => record.status === "unknown").length : 0,
                    observationCount: teacherObservations.length
                  }}
                />
              }
            />
            <Route path="lessons" element={<TeacherLessonsPage lessons={todayLessons} activeLessonId={activeLesson?.id} />} />
            <Route
              path="attendance"
              element={
                <TeacherAttendancePage
                  activeLesson={activeLesson}
                  attendanceError={attendanceError}
                  attendanceLoading={attendanceLoading}
                  attendanceMessage={attendanceMessage}
                  currentLessonReason={data.currentLesson?.reason}
                  lessons={todayLessons}
                  session={attendanceSession}
                  onMarkAllPresent={markAllPresent}
                  onOpenAttendance={(lesson) => void openAttendance(lesson)}
                  onSaveAttendance={() => void saveAttendance()}
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
                  onSubmit={createObservation}
                />
              }
            />
            <Route path="announcements" element={<TeacherAnnouncementsPage announcements={data.announcements} />} />
            <Route path="support" element={<SupportContactForm session={session} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function TeacherOverviewPage({
  activeLesson,
  announcements,
  attendanceLoading,
  currentLessonReason,
  lessons,
  observations,
  selectedLessonId,
  onSelectLesson,
  onOpenAttendance,
  summary
}: {
  activeLesson?: Lesson;
  announcements: Announcement[];
  attendanceLoading: boolean;
  currentLessonReason?: string;
  lessons: Lesson[];
  observations: Observation[];
  selectedLessonId: string;
  onSelectLesson: (lessonId: string) => void;
  onOpenAttendance: () => void;
  summary: { lessonCount: number; activeClass: string; pendingAttendance: number; observationCount: number };
}) {
  const nextLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? activeLesson ?? lessons[0] ?? null;
  return (
    <section className="teacher-page-stack">
      {lessons.length === 0 ? (
        <div className="teacher-alert-banner">
          <AlertCircle size={18} aria-hidden />
          <div>
            <strong>Bugün için atanmış ders bulunamadı</strong>
            <p>Yayınlanmış programda bu güne ait ders yoksa yoklama alınamaz.</p>
          </div>
        </div>
      ) : null}

      {!activeLesson && lessons.length > 1 ? (
        <article className="principal-surface-card teacher-lesson-picker">
          <label className="field">
            <span>Yoklama alınacak dersi seç</span>
            <select value={selectedLessonId} onChange={(event) => onSelectLesson(event.target.value)}>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.className} · {lesson.subjectName} ({formatLessonTime(lesson)})
                </option>
              ))}
            </select>
          </label>
        </article>
      ) : null}

      <div className="teacher-kpi-grid" aria-label="Öğretmen günlük özet">
        <TeacherKpiCard icon={<CalendarDays size={17} />} label="Bugünkü ders" value={summary.lessonCount} detail="Yayınlanmış programdan" tone="sky" />
        <TeacherKpiCard icon={<UserCheck size={17} />} label="Aktif sınıf" value={summary.activeClass} detail={nextLesson?.subjectName ?? "Aktif ders bekleniyor"} tone="emerald" />
        <TeacherKpiCard icon={<ClipboardCheck size={17} />} label="Yoklama bekleyen" value={summary.pendingAttendance} detail="Açık oturum içinde" tone="amber" />
        <TeacherKpiCard icon={<NotebookPen size={17} />} label="Gözlem" value={summary.observationCount} detail="Öğretmen kapsamındaki kayıt" tone="violet" />
      </div>

      <div className="teacher-overview-grid">
        <section className="principal-surface-card teacher-focus-card">
          <div className="teacher-card-head">
            <div>
              <span className="section-kicker">Akıllı yoklama</span>
              <h2>{activeLesson ? "Aktif ders algılandı" : "Aktif ders bekleniyor"}</h2>
            </div>
            <span className={`status-badge ${activeLesson ? "active" : "warning"}`}>{activeLesson ? "Hazır" : "Beklemede"}</span>
          </div>
          <div className="teacher-active-lesson">
            <div className="teacher-lesson-icon">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <strong>{nextLesson ? `${nextLesson.className} · ${nextLesson.subjectName}` : currentLessonReason ?? "Atanmış ders bulunamadı"}</strong>
              <span>{nextLesson ? `${formatLessonTime(nextLesson)} · ${nextLesson.room || "Derslik belirtilmedi"}` : "Ders programı yayınlandığında burada görünür."}</span>
            </div>
          </div>
          <button className="primary-action teacher-wide-action" type="button" onClick={onOpenAttendance} disabled={attendanceLoading || !nextLesson}>
            {attendanceLoading ? <Loader2 className="spin" size={17} /> : <ClipboardCheck size={17} />}
            Yoklama ekranını aç
          </button>
        </section>

        <section className="principal-surface-card">
          <div className="teacher-card-head">
            <div>
              <span className="section-kicker">Günlük akış</span>
              <h2>Bugünkü dersler</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/lessons">
              Tümü
              <ChevronRight size={15} />
            </NavLink>
          </div>
          <TeacherLessonTimeline lessons={lessons.slice(0, 4)} activeLessonId={activeLesson?.id} />
        </section>
      </div>

      <div className="teacher-overview-grid teacher-overview-grid--secondary">
        <section className="principal-surface-card">
          <div className="teacher-card-head">
            <div>
              <span className="section-kicker">Öğrenci desteği</span>
              <h2>Son gözlemler</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/observations">
              Gözlem ekle
            </NavLink>
          </div>
          <ObservationList observations={observations.slice(0, 4)} />
        </section>
        <section className="principal-surface-card">
          <div className="teacher-card-head">
            <div>
              <span className="section-kicker">İletişim</span>
              <h2>Duyurular</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/announcements">
              Tümü
            </NavLink>
          </div>
          <AnnouncementList announcements={announcements.slice(0, 4)} />
        </section>
      </div>
    </section>
  );
}

function TeacherLessonsPage({ lessons, activeLessonId }: { lessons: Lesson[]; activeLessonId?: string }) {
  return (
    <section className="teacher-page-stack">
      <div className="teacher-page-title">
        <span className="section-kicker">Ders programı</span>
        <h1>Derslerim</h1>
      </div>
      <section className="principal-surface-card">
        <div className="teacher-card-head">
          <div>
            <h2>Günlük ders takvimi</h2>
            <p>Yayınlanan ders programındaki öğretmen atamaları listelenir.</p>
          </div>
          <span className="status-badge active">{lessons.length} ders</span>
        </div>
        <TeacherLessonTimeline lessons={lessons} activeLessonId={activeLessonId} detailed />
      </section>
    </section>
  );
}

function TeacherAttendancePage({
  activeLesson,
  attendanceError,
  attendanceLoading,
  attendanceMessage,
  currentLessonReason,
  lessons,
  session,
  onMarkAllPresent,
  onOpenAttendance,
  onSaveAttendance,
  onUpdateStatus
}: {
  activeLesson?: Lesson;
  attendanceError: string | null;
  attendanceLoading: boolean;
  attendanceMessage: string | null;
  currentLessonReason?: string;
  lessons: Lesson[];
  session: AttendanceSession | null;
  onMarkAllPresent: () => void;
  onOpenAttendance: (lesson?: Lesson) => void;
  onSaveAttendance: () => void;
  onUpdateStatus: (studentId: string, status: AttendanceStatus) => void;
}) {
  const suggestedLesson = activeLesson ?? lessons[0] ?? null;
  const completedCount = session?.records.filter((record) => record.status !== "unknown").length ?? 0;
  const absentCount = session?.records.filter((record) => record.status === "absent").length ?? 0;
  const isFinalized = Boolean(session?.finalizedAt);

  return (
    <section className="teacher-page-stack">
      <div className="teacher-page-title">
        <span className="section-kicker">Akıllı yoklama</span>
        <h1>Yoklama</h1>
      </div>

      <div className="teacher-attendance-grid">
        <section className="principal-surface-card teacher-focus-card">
          <div className="teacher-card-head">
            <div>
              <h2>{activeLesson ? "Aktif ders" : "Yoklama başlat"}</h2>
              <p>{activeLesson ? "Sistem ders programına göre bu dersi algıladı." : currentLessonReason ?? "Aktif ders yoksa bugünkü derslerden seçim yapılabilir."}</p>
            </div>
            <span className={`status-badge ${activeLesson ? "active" : "warning"}`}>{activeLesson ? "Otomatik" : "Manuel"}</span>
          </div>
          <div className="teacher-active-lesson">
            <div className="teacher-lesson-icon">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <strong>{suggestedLesson ? `${suggestedLesson.className} · ${suggestedLesson.subjectName}` : "Atanmış ders yok"}</strong>
              <span>{suggestedLesson ? `${formatLessonTime(suggestedLesson)} · ${suggestedLesson.room || "Derslik belirtilmedi"}` : "Ders programı yayınlanmalı."}</span>
            </div>
          </div>
          <button className="primary-action teacher-wide-action" type="button" onClick={() => onOpenAttendance(suggestedLesson)} disabled={attendanceLoading || !suggestedLesson}>
            {attendanceLoading ? <Loader2 className="spin" size={17} /> : <ClipboardCheck size={17} />}
            Yoklama listesini aç
          </button>
          {attendanceMessage && <div className="form-success">{attendanceMessage}</div>}
          {attendanceError && <div className="form-error">{attendanceError}</div>}
        </section>

        <section className="principal-surface-card">
          <div className="teacher-card-head">
            <div>
              <h2>Bugünkü dersler</h2>
              <p>Aktif ders algılanamazsa buradan oturum açılabilir.</p>
            </div>
          </div>
          <div className="teacher-compact-list">
            {lessons.map((lesson) => (
              <button className="teacher-compact-row" type="button" key={lesson.id} onClick={() => onOpenAttendance(lesson)} disabled={attendanceLoading}>
                <span>{lesson.startTime}</span>
                <strong>{lesson.className}</strong>
                <em>{lesson.subjectName}</em>
              </button>
            ))}
            {lessons.length === 0 && <p className="empty-text">Bugün için ders bulunamadı.</p>}
          </div>
        </section>
      </div>

      <section className="principal-surface-card">
        <div className="teacher-card-head teacher-card-head--wrap">
          <div>
            <span className="section-kicker">Öğrenci listesi</span>
            <h2>{session ? `${session.className} · ${session.subjectName}` : "Yoklama oturumu"}</h2>
          </div>
          <div className="teacher-attendance-actions">
            <span className="status-badge active">{completedCount} işaretli</span>
            <span className="status-badge critical">{absentCount} gelmedi</span>
            {isFinalized ? <span className="status-badge active">Kesinleşti</span> : null}
            <button className="ghost-action small-action" type="button" onClick={onMarkAllPresent} disabled={!session || attendanceLoading || isFinalized}>
              Hepsi geldi
            </button>
            <button className="primary-action small-action" type="button" onClick={onSaveAttendance} disabled={!session || attendanceLoading || isFinalized}>
              {attendanceLoading ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
              {isFinalized ? "Tamamlandı" : "Kaydet ve tamamla"}
            </button>
          </div>
        </div>

        {session ? (
          <div className="principal-table-wrap teacher-table-wrap">
            <table className="principal-table teacher-attendance-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Öğrenci</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {session.records.map((record) => (
                  <tr key={record.studentId}>
                    <td>{record.number}</td>
                    <td>
                      <strong>{record.studentName}</strong>
                    </td>
                    <td>
                      <div className="teacher-status-toggle" aria-label={`${record.studentName} yoklama durumu`}>
                        {attendanceStatuses.map((status) => (
                          <button
                            className={record.status === status.value ? "is-selected" : ""}
                            type="button"
                            key={status.value}
                            disabled={isFinalized}
                            onClick={() => onUpdateStatus(record.studentId, status.value)}
                          >
                            {status.icon}
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-text teacher-empty-pad">Yoklama almak için önce aktif dersi veya bugünkü derslerden birini açın.</p>
        )}
      </section>
    </section>
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
  onSubmit
}: {
  error: string | null;
  form: { studentId: string; category: string; note: string };
  loading: boolean;
  message: string | null;
  observations: Observation[];
  students: Array<{ id: string; name: string; className: string }>;
  onChange: (next: { studentId: string; category: string; note: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="teacher-page-stack">
      <div className="teacher-page-title">
        <span className="section-kicker">Öğrenci destek</span>
        <h1>Gözlemler</h1>
      </div>

      <div className="teacher-observation-grid">
        <section className="principal-surface-card">
          <div className="teacher-card-head">
            <div>
              <h2>Gözlem kaydı oluştur</h2>
              <p>Tanı veya etiketleme amacı taşımaz; rehberlik değerlendirmesine veri sağlar.</p>
            </div>
          </div>
          {message && <div className="form-success">{message}</div>}
          {error && <div className="form-error">{error}</div>}
          <form className="teacher-observation-form" onSubmit={onSubmit}>
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
            <label className="field teacher-observation-note">
              <span>Not</span>
              <textarea
                value={form.note}
                onChange={(event) => onChange({ ...form, note: event.target.value })}
                placeholder="Kısa, ölçülebilir ve olay odaklı gözlem notu yazın"
                rows={6}
                maxLength={1200}
                required
              />
            </label>
            <button className="primary-action" type="submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={17} /> : <MessageSquareText size={17} />}
              Rehberliğe aktar
            </button>
          </form>
        </section>

        <section className="principal-surface-card">
          <div className="teacher-card-head">
            <div>
              <h2>Son gözlem kayıtları</h2>
              <p>Öğretmen kapsamındaki kayıtlar listelenir.</p>
            </div>
          </div>
          <ObservationList observations={observations} />
        </section>
      </div>
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

function TeacherKpiCard({
  detail,
  icon,
  label,
  tone,
  value
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  tone: "sky" | "emerald" | "amber" | "violet";
  value: ReactNode;
}) {
  return (
    <article className={`principal-stat-card principal-stat-card--${tone} teacher-kpi-card`}>
      <div className="principal-stat-icon">{icon}</div>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
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
