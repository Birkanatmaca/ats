import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Announcement,
  AttendanceRecord,
  AttendanceSession,
  CurrentLesson,
  Lesson,
  Observation,
  Principal,
  PrincipalSummary,
  Schedule,
  Tenant,
  api
} from "./lib/api";

type LoadState = {
  principal?: Principal;
  tenant?: Tenant;
  summary?: PrincipalSummary;
  schedule?: Schedule;
  currentLesson?: CurrentLesson;
  announcements?: Announcement[];
  observations?: Observation[];
};

const observationCategories = [
  { value: "participation", label: "Derse katılım" },
  { value: "attention", label: "Dikkat durumu" },
  { value: "behavior", label: "Davranış değişikliği" },
  { value: "social", label: "Sosyal uyum" },
  { value: "absence_risk", label: "Devamsızlık eğilimi" },
  { value: "academic_drop", label: "Akademik düşüş" }
];

export function App() {
  const [state, setState] = useState<LoadState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [observationForm, setObservationForm] = useState({
    studentId: "student-2",
    category: "attention",
    note: ""
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [principal, tenant, summary, schedule, currentLesson, announcements, observations] = await Promise.all([
        api.me(),
        api.tenant(),
        api.dashboard(),
        api.schedule(),
        api.currentLesson(),
        api.announcements(),
        api.observations()
      ]);
      setState({ principal, tenant, summary, schedule, currentLesson, announcements, observations });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Veri alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeLesson = state.currentLesson?.found ? state.currentLesson.lesson : state.schedule?.lessons[0];

  async function openAttendance(lesson?: Lesson) {
    if (!lesson) {
      return;
    }
    setCreatingSession(true);
    try {
      const session = await api.createAttendanceSession(lesson.id);
      setAttendanceSession(session);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Yoklama oturumu açılamadı.");
    } finally {
      setCreatingSession(false);
    }
  }

  function updateRecord(studentId: string, status: AttendanceRecord["status"]) {
    setAttendanceSession((session) => {
      if (!session) {
        return session;
      }
      return {
        ...session,
        records: session.records.map((record) =>
          record.studentId === studentId ? { ...record, status } : record
        )
      };
    });
  }

  async function saveAttendance() {
    if (!attendanceSession) {
      return;
    }
    setSavingAttendance(true);
    try {
      const updated = await api.updateAttendanceRecords(attendanceSession.id, attendanceSession.records);
      setAttendanceSession(updated);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Yoklama kaydedilemedi.");
    } finally {
      setSavingAttendance(false);
    }
  }

  async function generateDraft() {
    setGenerating(true);
    try {
      const result = await api.generateSchedule();
      setDraftMessage(`${result.recommendation} Skor: ${result.schedule.score}`);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Program taslağı üretilemedi.");
    } finally {
      setGenerating(false);
    }
  }

  async function createObservation() {
    if (!observationForm.note.trim()) {
      setError("Gözlem notu boş olamaz.");
      return;
    }
    try {
      const created = await api.createObservation(observationForm);
      setState((previous) => ({
        ...previous,
        observations: [created, ...(previous.observations ?? [])]
      }));
      setObservationForm((previous) => ({ ...previous, note: "" }));
    } catch (observationError) {
      setError(observationError instanceof Error ? observationError.message : "Gözlem kaydı oluşturulamadı.");
    }
  }

  const scheduleByHour = useMemo(() => groupLessons(state.schedule?.lessons ?? []), [state.schedule?.lessons]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <GraduationCap size={24} />
          </div>
          <div>
            <strong>ÖTS</strong>
            <span>Okul Yönetimi</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Ana menü">
          <a className="nav-item active" href="#dashboard">
            <LayoutDashboard size={18} />
            Dashboard
          </a>
          <a className="nav-item" href="#schedule">
            <CalendarDays size={18} />
            Ders Programı
          </a>
          <a className="nav-item" href="#attendance">
            <ClipboardCheck size={18} />
            Yoklama
          </a>
          <a className="nav-item" href="#guidance">
            <ShieldCheck size={18} />
            Öğrenci Destek
          </a>
          <a className="nav-item" href="#announcements">
            <Megaphone size={18} />
            Duyurular
          </a>
        </nav>

        <div className="security-panel">
          <LockKeyhole size={18} />
          <div>
            <strong>Tenant güvenliği</strong>
            <span>Rol ve kapsam kontrolleri API katmanında.</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Yönetim paneli</span>
            <h1>{state.tenant?.name ?? "Özel Eğitim Kurumu"}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Yenile" onClick={() => void load()}>
              {loading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            </button>
            <button className="secondary-button" type="button">
              <Bell size={17} />
              Bildirimler
            </button>
            <div className="user-chip">
              <UserRoundCheck size={18} />
              <span>{state.principal?.name ?? "Demo Kullanıcı"}</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="alert" role="alert">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        <section className="hero-strip" id="dashboard">
          <div>
            <span className="eyebrow">Bugünkü operasyon</span>
            <h2>Ders, yoklama ve öğrenci destek akışları tek kontrol yüzeyinde.</h2>
          </div>
          <button className="primary-button" type="button" onClick={() => void generateDraft()}>
            {generating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            AI program taslağı
          </button>
        </section>

        {draftMessage && (
          <div className="success-line">
            <Check size={18} />
            {draftMessage}
          </div>
        )}

        <section className="metric-grid" aria-label="Ana metrikler">
          <MetricCard icon={<UsersRound size={20} />} label="Aktif öğrenci" value={state.summary?.activeStudents} tone="teal" />
          <MetricCard icon={<BookOpen size={20} />} label="Bugünkü ders" value={state.summary?.todayLessons} tone="copper" />
          <MetricCard icon={<Gauge size={20} />} label="Yoklama tamamlanma" value={`${state.summary?.attendanceCompletionPct ?? 0}%`} tone="violet" />
          <MetricCard icon={<Activity size={20} />} label="Destek sinyali" value={state.summary?.openObservationSignals} tone="rose" />
        </section>

        <div className="content-grid">
          <section className="panel wide" id="schedule">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Yayınlanmış program</span>
                <h3>{state.schedule?.name ?? "Ders programı"}</h3>
              </div>
              <StatusPill label={`v${state.schedule?.version ?? 1}`} tone="green" />
            </div>

            <div className="schedule-grid">
              {scheduleByHour.map((slot) => (
                <div className="schedule-row" key={slot.hour}>
                  <div className="time-cell">{slot.hour}</div>
                  <div className="lesson-stack">
                    {slot.lessons.map((lesson) => (
                      <article className="lesson-card" key={lesson.id}>
                        <div>
                          <strong>{lesson.subjectName}</strong>
                          <span>{lesson.className} · {lesson.room}</span>
                        </div>
                        <small>{lesson.teacherName}</small>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" id="attendance">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Akıllı yoklama</span>
                <h3>Aktif ders</h3>
              </div>
              <ClipboardCheck size={20} />
            </div>

            <div className="active-lesson">
              {activeLesson ? (
                <>
                  <strong>{activeLesson.subjectName}</strong>
                  <span>{activeLesson.className} · {activeLesson.startTime}-{activeLesson.endTime}</span>
                  <small>{state.currentLesson?.found ? "Programdan otomatik algılandı." : "Demo için ilk ders seçildi."}</small>
                  <button className="primary-button full" type="button" onClick={() => void openAttendance(activeLesson)}>
                    {creatingSession ? <Loader2 className="spin" size={18} /> : <ClipboardCheck size={18} />}
                    Yoklama al
                  </button>
                </>
              ) : (
                <p>Bugün için ders bulunamadı.</p>
              )}
            </div>

            {attendanceSession && (
              <div className="attendance-list">
                {attendanceSession.records.map((record) => (
                  <div className="attendance-row" key={record.studentId}>
                    <div>
                      <strong>{record.studentName}</strong>
                      <span>No {record.number}</span>
                    </div>
                    <select value={record.status} onChange={(event) => updateRecord(record.studentId, event.target.value as AttendanceRecord["status"])}>
                      <option value="unknown">Seçilmedi</option>
                      <option value="present">Geldi</option>
                      <option value="absent">Gelmedi</option>
                      <option value="late">Geç</option>
                      <option value="excused">İzinli</option>
                    </select>
                  </div>
                ))}
                <button className="secondary-button full" type="button" onClick={() => void saveAttendance()}>
                  {savingAttendance ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
                  Yoklamayı kaydet
                </button>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Sınıf durumu</span>
                <h3>Yoklama özeti</h3>
              </div>
              <Gauge size={20} />
            </div>
            <div className="class-table">
              {(state.summary?.classAttendance ?? []).map((row) => (
                <div className="class-row" key={row.className}>
                  <div>
                    <strong>{row.className}</strong>
                    <span>{row.completed}/{row.total} ders</span>
                  </div>
                  <div className="class-meta">
                    <StatusPill label={`${row.absent} devamsız`} tone={row.absent > 0 ? "amber" : "green"} />
                    <small>{row.attentionNeed}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" id="guidance">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Öğrenci destek</span>
                <h3>Gözlem kaydı</h3>
              </div>
              <ShieldCheck size={20} />
            </div>

            <div className="form-stack">
              <label>
                Öğrenci
                <select value={observationForm.studentId} onChange={(event) => setObservationForm((form) => ({ ...form, studentId: event.target.value }))}>
                  <option value="student-1">Defne Yılmaz · 5/A</option>
                  <option value="student-2">Efe Demir · 5/A</option>
                  <option value="student-3">Mina Kaya · 5/A</option>
                </select>
              </label>
              <label>
                Kategori
                <select value={observationForm.category} onChange={(event) => setObservationForm((form) => ({ ...form, category: event.target.value }))}>
                  {observationCategories.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Not
                <textarea
                  value={observationForm.note}
                  onChange={(event) => setObservationForm((form) => ({ ...form, note: event.target.value }))}
                  placeholder="Kısa, gözleme dayalı ve etiketlemeyen bir not girin."
                  rows={4}
                />
              </label>
              <button className="primary-button full" type="button" onClick={() => void createObservation()}>
                <Check size={18} />
                Kaydı oluştur
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Operasyon kuyruğu</span>
                <h3>Öncelikli işler</h3>
              </div>
              <AlertTriangle size={20} />
            </div>
            <div className="operation-list">
              {(state.summary?.operations ?? []).map((operation) => (
                <div className="operation-row" key={operation.id}>
                  <div>
                    <strong>{operation.title}</strong>
                    <span>{operation.status}</span>
                  </div>
                  <ChevronRight size={18} />
                </div>
              ))}
            </div>
          </section>

          <section className="panel" id="announcements">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Duyurular</span>
                <h3>Son yayınlar</h3>
              </div>
              <Megaphone size={20} />
            </div>
            <div className="announcement-list">
              {(state.announcements ?? []).map((announcement) => (
                <article className="announcement" key={announcement.id}>
                  <strong>{announcement.title}</strong>
                  <p>{announcement.body}</p>
                  <span>{announcement.audience}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel wide">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Hassas veri</span>
                <h3>Son gözlemler</h3>
              </div>
              <LockKeyhole size={20} />
            </div>
            <div className="observation-list">
              {(state.observations ?? []).map((observation) => (
                <article className="observation" key={observation.id}>
                  <div>
                    <strong>{observation.studentName}</strong>
                    <span>{observation.className} · {categoryLabel(observation.category)}</span>
                  </div>
                  <p>{observation.note}</p>
                  <small>{observation.authorName} · {new Date(observation.createdAt).toLocaleString("tr-TR")}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value?: string | number; tone: string }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value ?? "..."}</strong>
    </article>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "amber" }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function groupLessons(lessons: Lesson[]) {
  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    acc[lesson.startTime] = [...(acc[lesson.startTime] ?? []), lesson];
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, groupedLessons]) => ({ hour, lessons: groupedLessons }));
}

function categoryLabel(value: string) {
  return observationCategories.find((category) => category.value === value)?.label ?? value;
}

