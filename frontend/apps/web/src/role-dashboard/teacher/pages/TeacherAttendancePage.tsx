import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  PencilLine,
  Search,
  XCircle
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AttendanceRecord, AttendanceSession, Lesson } from "../../../lib/api";
import { GuidanceKpiCard } from "../../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../../guidance/components/GuidanceMetricGrid";
import "../../guidance/GuidanceDataPage.css";
import "../../guidance/GuidanceSurface.css";
import {
  attendanceWindowLabel,
  currentWeekday,
  formatLessonRange,
  isLessonInAttendanceWindow,
  sortLessons,
  weekdayLabel
} from "../utils/lessonSchedule";
import "../TeacherAttendancePage.css";

type AttendanceStatus = AttendanceRecord["status"];

const attendanceStatuses: Array<{ value: AttendanceStatus; label: string; icon: ReactNode }> = [
  { value: "present", label: "Geldi", icon: <CheckCircle2 size={14} /> },
  { value: "absent", label: "Gelmedi", icon: <XCircle size={14} /> },
  { value: "late", label: "Geç", icon: <Clock3 size={14} /> },
  { value: "excused", label: "İzinli", icon: <AlertCircle size={14} /> }
];

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Geldi",
  absent: "Gelmedi",
  late: "Geç",
  excused: "İzinli",
  unknown: "Bekliyor"
};

export function TeacherAttendancePage({
  activeLesson,
  attendanceError,
  attendanceLoading,
  attendanceMessage,
  lessons,
  session,
  onMarkAllPresent,
  onOpenList,
  onReopen,
  onSaveAttendance,
  onSessionClosed,
  onUpdateStatus
}: {
  activeLesson?: Lesson;
  attendanceError: string | null;
  attendanceLoading: boolean;
  attendanceMessage: string | null;
  lessons: Lesson[];
  session: AttendanceSession | null;
  onMarkAllPresent: () => void;
  onOpenList: (lesson: Lesson) => void;
  onReopen: () => void;
  onSaveAttendance: () => void;
  onSessionClosed: () => void;
  onUpdateStatus: (studentId: string, status: AttendanceStatus) => void;
}) {
  const today = currentWeekday();
  const todayLessons = useMemo(() => sortLessons(lessons.filter((lesson) => lesson.dayOfWeek === today)), [lessons, today]);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const lesson of todayLessons) {
      map.set(lesson.classId, lesson.className);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [todayLessons]);

  const defaultLesson = activeLesson && todayLessons.some((l) => l.id === activeLesson.id) ? activeLesson : todayLessons.find((l) => isLessonInAttendanceWindow(l)) ?? todayLessons[0];

  const [selectedClassId, setSelectedClassId] = useState(defaultLesson?.classId ?? "");
  const [selectedLessonId, setSelectedLessonId] = useState(defaultLesson?.id ?? "");
  const [studentQuery, setStudentQuery] = useState("");
  const [now, setNow] = useState(() => new Date());

  const lessonOptions = useMemo(
    () => todayLessons.filter((lesson) => !selectedClassId || lesson.classId === selectedClassId),
    [selectedClassId, todayLessons]
  );

  const selectedLesson = lessonOptions.find((lesson) => lesson.id === selectedLessonId) ?? lessonOptions[0] ?? null;

  const autoOpenedRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session && selectedLesson && !isLessonInAttendanceWindow(selectedLesson, now)) {
      onSessionClosed();
    }
  }, [session, selectedLesson, now, onSessionClosed]);

  useEffect(() => {
    if (!defaultLesson) {
      return;
    }
    setSelectedClassId((current) => current || defaultLesson.classId);
    setSelectedLessonId((current) => (todayLessons.some((l) => l.id === current) ? current : defaultLesson.id));
  }, [defaultLesson, todayLessons]);

  useEffect(() => {
    if (!activeLesson || !isLessonInAttendanceWindow(activeLesson, now)) {
      return;
    }
    if (session?.lessonId === activeLesson.id) {
      return;
    }
    if (autoOpenedRef.current === activeLesson.id) {
      return;
    }
    autoOpenedRef.current = activeLesson.id;
    onOpenList(activeLesson);
  }, [activeLesson, now, onOpenList, session?.lessonId]);

  const windowOpen = selectedLesson ? isLessonInAttendanceWindow(selectedLesson, now) : false;
  const isFinalized = Boolean(session?.finalizedAt);
  const isTaken = isFinalized;
  const sessionMatches = Boolean(session && selectedLesson && session.lessonId === selectedLesson.id);
  const canEdit = Boolean(sessionMatches && windowOpen && !isFinalized);
  const canReopen = Boolean(sessionMatches && windowOpen && isFinalized);

  const completedCount = session?.records.filter((record) => record.status !== "unknown").length ?? 0;
  const absentCount = session?.records.filter((record) => record.status === "absent").length ?? 0;
  const totalRecords = session?.records.length ?? 0;
  const pendingCount = totalRecords - completedCount;

  const filteredRecords = useMemo(() => {
    const query = studentQuery.trim().toLocaleLowerCase("tr-TR");
    if (!session || query.length === 0) {
      return session?.records ?? [];
    }
    return session.records.filter((record) => `${record.studentName} ${record.number}`.toLocaleLowerCase("tr-TR").includes(query));
  }, [session, studentQuery]);

  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    const nextLesson = todayLessons.find((lesson) => lesson.classId === classId);
    if (nextLesson) {
      setSelectedLessonId(nextLesson.id);
    }
  }

  function statusTitle() {
    if (!sessionMatches && !windowOpen) {
      return { text: "Yoklama alınmadı", tone: "closed" as const, detail: "Yoklama penceresi kapalı" };
    }
    if (sessionMatches && isTaken) {
      return { text: "Yoklama alındı", tone: "done" as const, detail: "Kayıt tamamlandı" };
    }
    return { text: "Yoklama alınmadı", tone: "pending" as const, detail: sessionMatches ? "Liste açık — kaydı tamamlayın" : "Listeyi açın" };
  }

  const title = statusTitle();

  return (
    <section className="guidance-page-stack guidance-surface-page teacher-overview-page guidance-data-page teacher-attendance-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<ClipboardCheck size={20} />} label="İşaretli" value={completedCount} detail={totalRecords > 0 ? `${totalRecords} öğrenci` : "Liste bekleniyor"} tone="emerald" />
        <GuidanceKpiCard icon={<XCircle size={20} />} label="Gelmedi" value={absentCount} detail="Eksik devam" tone="rose" />
        <GuidanceKpiCard icon={<Clock3 size={20} />} label="Bekleyen" value={pendingCount} detail="Henüz işaretlenmedi" tone="amber" />
        <GuidanceKpiCard icon={<CalendarDays size={20} />} label="Bugün" value={todayLessons.length} detail={weekdayLabel(today)} tone="sky" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card teacher-attendance-card">
        <header className="guidance-data-card-head">
          <h2>
            <span className={`teacher-attendance-status teacher-attendance-status--${title.tone}`}>{title.text}</span>
            <span>{title.detail}</span>
          </h2>
        </header>

        {attendanceMessage ? <div className="form-success">{attendanceMessage}</div> : null}
        {attendanceError ? <div className="form-error">{attendanceError}</div> : null}

        <div className="teacher-attendance-toolbar">
          <select
            className="guidance-data-select"
            value={selectedClassId}
            onChange={(event) => handleClassChange(event.target.value)}
            aria-label="Sınıf seçimi"
          >
            <option value="">Tüm sınıflar</option>
            {classOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          <select
            className="guidance-data-select"
            value={selectedLesson?.id ?? ""}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedLessonId(nextId);
              if (session && session.lessonId !== nextId) {
                onSessionClosed();
              }
            }}
            aria-label="Ders seçimi"
          >
            {lessonOptions.map((lesson) => (
              <option key={lesson.id} value={lesson.id} disabled={!isLessonInAttendanceWindow(lesson, now)}>
                {lesson.subjectName} · {formatLessonRange(lesson)}
                {!isLessonInAttendanceWindow(lesson, now) ? " (kapalı)" : ""}
              </option>
            ))}
          </select>

          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="Öğrenci ara…" type="search" disabled={!session} />
          </label>

          <div className="teacher-attendance-toolbar-actions">
            {!sessionMatches ? (
              <button className="primary-action small-action" type="button" disabled={!selectedLesson || !windowOpen || attendanceLoading} onClick={() => selectedLesson && onOpenList(selectedLesson)}>
                {attendanceLoading ? <Loader2 className="spin" size={16} /> : <ClipboardCheck size={16} />}
                Listeyi aç
              </button>
            ) : canReopen ? (
              <button className="primary-action small-action" type="button" disabled={attendanceLoading} onClick={onReopen}>
                {attendanceLoading ? <Loader2 className="spin" size={16} /> : <PencilLine size={16} />}
                Yoklamayı düzenle
              </button>
            ) : canEdit ? (
              <>
                <button className="ghost-action small-action" type="button" onClick={onMarkAllPresent} disabled={attendanceLoading}>
                  Hepsi geldi
                </button>
                <button className="primary-action small-action" type="button" onClick={onSaveAttendance} disabled={attendanceLoading}>
                  {attendanceLoading ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                  Yoklamayı tamamla
                </button>
              </>
            ) : null}
          </div>
        </div>

        {selectedLesson ? (
          <p className="teacher-attendance-window-note">
            <strong>{selectedLesson.className} · {selectedLesson.subjectName}</strong>
            {" · "}
            Yoklama penceresi: {attendanceWindowLabel(selectedLesson)}
            {!windowOpen ? " · Şu an erişilemez" : null}
          </p>
        ) : null}

        {!sessionMatches ? (
          <p className="guidance-data-empty">
            {todayLessons.length === 0
              ? "Bugün için atanmış ders bulunamadı."
              : windowOpen
                ? "Sınıf ve ders seçip “Listeyi aç” ile yoklama listesini getirin."
                : "Aktif ders saati dışında yoklama alınamaz. Ders başlangıcından 10 dk önce ile bitişinden 10 dk sonrasına kadar erişilebilir."}
          </p>
        ) : (
          <div className="guidance-data-table-wrap">
            <table className="guidance-data-table teacher-attendance-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Öğrenci</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.studentId}>
                    <td>{record.number}</td>
                    <td>
                      <span className="guidance-data-primary">{record.studentName}</span>
                    </td>
                    <td>
                      {canEdit ? (
                        <div className="teacher-status-toggle" aria-label={`${record.studentName} yoklama durumu`}>
                          {attendanceStatuses.map((status) => (
                            <button
                              className={record.status === status.value ? "is-selected" : ""}
                              type="button"
                              key={status.value}
                              onClick={() => onUpdateStatus(record.studentId, status.value)}
                            >
                              {status.icon}
                              {status.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className={`teacher-attendance-readonly${record.status === "unknown" ? "" : ` is-${record.status}`}`}>
                          {statusLabels[record.status]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
