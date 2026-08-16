import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, KeyRound, Loader2, Pencil, RotateCcw, School, Trash2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type PrincipalTeacherOverview } from "../../../lib/api";
import { CredentialRevealDialog } from "../components/CredentialRevealDialog";
import { TeacherFormModal, type TeacherFormPayload } from "../components/TeacherFormModal";
import type { PrincipalManagedTeacher, SchoolClass } from "../types";
import "./PrincipalTeacherDetailPage.css";

const CHART_TOOLTIP = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#0f172a",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)"
};

const DAY_MS = 24 * 60 * 60 * 1000;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${last}`.toLocaleUpperCase("tr-TR") || "?";
}

function dayLabel(value: number) {
  const iso = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  if (value >= 1 && value <= 7) {
    return iso[value - 1];
  }
  const sundayFirst = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return sundayFirst[value] ?? `Gün ${value}`;
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaultRange(days = 30) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * DAY_MS);
  return { from: isoDate(from), to: isoDate(to) };
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value?: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function weeklyHours(minutes: number) {
  if (minutes <= 0) {
    return "0 sa";
  }
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} sa`;
}

export function PrincipalTeacherDetailPage({
  teachers,
  classes,
  onUpdateTeacher,
  onDeleteTeacher,
  onResetPassword,
  onMarkFirstLoginComplete
}: {
  teachers: PrincipalManagedTeacher[];
  classes: SchoolClass[];
  onUpdateTeacher: (
    id: string,
    payload: {
      firstName: string;
      lastName: string;
      branch: string;
      weeklyLessonHours: number;
      classId: string | null;
      className: string | null;
    }
  ) => void;
  onDeleteTeacher: (id: string) => void;
  onResetPassword: (id: string) => Promise<string>;
  onMarkFirstLoginComplete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { teacherId = "" } = useParams<{ teacherId: string }>();
  const range = useMemo(() => defaultRange(30), []);
  const teacher = useMemo(
    () => teachers.find((item) => item.id === teacherId || item.userId === teacherId) ?? null,
    [teachers, teacherId]
  );

  const [overview, setOverview] = useState<PrincipalTeacherOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [credential, setCredential] = useState<{ title: string; username: string; password: string; hint?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .principalTeacherOverview(teacherId, range)
      .then((next) => {
        if (!cancelled) {
          setOverview(next);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Öğretmen detayı alınamadı.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId, range]);

  const displayName = overview?.teacher.fullName ?? (teacher ? `${teacher.firstName} ${teacher.lastName}` : "");
  const title = overview?.teacher.title || teacher?.branch || "Branş belirtilmedi";
  const email = overview?.teacher.email || teacher?.username || "";
  const pendingPassword = overview?.teacher.mustChangePassword ?? teacher?.mustChangePassword ?? false;
  const chartData = (overview?.attendance.daily ?? []).map((item) => ({
    date: dateLabel(item.date),
    absent: item.absent,
    late: item.late,
    finalized: item.finalizedSessions
  }));

  function handleUpdate(payload: TeacherFormPayload) {
    if (!teacher) {
      return;
    }
    const className = payload.classId ? classes.find((item) => item.id === payload.classId)?.name ?? null : null;
    onUpdateTeacher(teacher.id, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      branch: payload.branch,
      weeklyLessonHours: payload.weeklyLessonHours,
      classId: payload.classId,
      className
    });
    setModalOpen(false);
  }

  async function handleResetPassword() {
    if (!teacher) {
      return;
    }
    try {
      const password = await onResetPassword(teacher.id);
      setCredential({
        title: "Yeni tek kullanımlık şifre",
        username: teacher.username,
        password,
        hint: "Öğretmen bir sonraki girişinde bu şifreyi kullanıp kalıcı şifresini güncellemelidir."
      });
    } catch {
      /* parent shows error */
    }
  }

  function handleDelete() {
    if (!teacher) {
      return;
    }
    if (!window.confirm(`${teacher.firstName} ${teacher.lastName} öğretmen kaydını silmek istediğinize emin misiniz?`)) {
      return;
    }
    onDeleteTeacher(teacher.id);
    navigate("/dashboard/teachers");
  }

  if (!loading && !overview && !teacher) {
    return (
      <section className="ptd">
        <p className="ptd-missing">Öğretmen bulunamadı.</p>
        <button className="ptd-action" type="button" onClick={() => navigate("/dashboard/teachers")}>
          <ArrowLeft size={16} />
          Öğretmen listesine dön
        </button>
      </section>
    );
  }

  return (
    <section className="ptd">
      <header className="ptd-hero">
        <div className="ptd-hero-main">
          <button className="ptd-back" type="button" onClick={() => navigate("/dashboard/teachers")} aria-label="Öğretmenlere dön">
            <ArrowLeft size={16} />
          </button>
          <span className="ptd-avatar">{initials(displayName || "?")}</span>
          <div>
            <p className="ptd-kicker">Öğretmen detayı</p>
            <h1>{displayName || "Öğretmen"}</h1>
            <p>
              {title}
              {email ? ` · ${email}` : ""}
            </p>
            <div className="ptd-hero-meta">
              <span className={`ptd-pill${pendingPassword ? " ptd-pill--wait" : " ptd-pill--ok"}`}>
                {pendingPassword ? "İlk giriş bekleniyor" : "Hesap aktif"}
              </span>
              {overview?.teacher.phone ? <span className="ptd-pill">{overview.teacher.phone}</span> : null}
              {overview ? <span className="ptd-pill">{dateLabel(overview.from)} – {dateLabel(overview.to)}</span> : null}
            </div>
          </div>
        </div>
        {teacher ? (
          <div className="ptd-hero-actions">
            <button className="ptd-action" type="button" onClick={() => setModalOpen(true)}>
              <Pencil size={15} />
              Düzenle
            </button>
            <button className="ptd-action" type="button" onClick={() => void handleResetPassword()}>
              <RotateCcw size={15} />
              Şifre sıfırla
            </button>
            {pendingPassword ? (
              <button className="ptd-action" type="button" onClick={() => onMarkFirstLoginComplete(teacher.id)}>
                <CheckCircle2 size={15} />
                İlk giriş tamam
              </button>
            ) : null}
            <button className="ptd-action ptd-action--danger" type="button" onClick={handleDelete}>
              <Trash2 size={15} />
              Sil
            </button>
          </div>
        ) : null}
      </header>

      {error ? <p className="ptd-error">{error}</p> : null}

      {loading ? (
        <p className="ptd-loading">
          <Loader2 className="spin" size={16} /> Öğretmen verileri yükleniyor…
        </p>
      ) : null}

      <div className="ptd-kpi-grid">
        <article className="ptd-kpi">
          <div className="ptd-kpi-icon">
            <CalendarDays size={18} />
          </div>
          <span>Haftalık ders</span>
          <strong>{overview?.workload.weeklyLessons ?? 0}</strong>
          <small>{weeklyHours(overview?.workload.weeklyMinutes ?? 0)} yayınlı program</small>
        </article>
        <article className="ptd-kpi">
          <div className="ptd-kpi-icon ptd-kpi-icon--teal">
            <ClipboardCheck size={18} />
          </div>
          <span>Bugünkü yoklama</span>
          <strong>%{overview?.attendance.todayCompletionPct ?? 0}</strong>
          <small>
            {overview?.attendance.todayFinalized ?? 0} / {overview?.attendance.todayLessons ?? 0} ders kesin
          </small>
        </article>
        <article className="ptd-kpi">
          <div className="ptd-kpi-icon ptd-kpi-icon--amber">
            <UsersRound size={18} />
          </div>
          <span>Öğrenci katılımı</span>
          <strong>%{overview?.attendance.presencePct ?? 0}</strong>
          <small>
            {overview?.attendance.absent ?? 0} devamsız, {overview?.attendance.late ?? 0} geç
          </small>
        </article>
        <article className="ptd-kpi">
          <div className="ptd-kpi-icon ptd-kpi-icon--violet">
            <School size={18} />
          </div>
          <span>Sınıf / branş</span>
          <strong>{overview?.workload.classCount ?? 0}</strong>
          <small>{overview?.workload.subjects.join(", ") || title}</small>
        </article>
      </div>

      <div className="ptd-bento">
        <article className="ptd-card">
          <div className="ptd-card-head">
            <div>
              <span>Performans</span>
              <h2>Yoklama hareketi</h2>
              <small>
                {overview
                  ? `${overview.attendance.finalizedSessions} / ${overview.attendance.sessions} oturum kesinleşti`
                  : "Son 30 gün"}
              </small>
            </div>
            <Clock3 size={18} color="#94a3b8" />
          </div>
          {!loading && chartData.length === 0 ? <p className="ptd-empty">Bu aralıkta yoklama oturumu yok.</p> : null}
          {chartData.length > 0 ? (
            <div className="ptd-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ptdAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#fb7185" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ptdLate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP}
                    formatter={(value: number, name: string) => [
                      value,
                      name === "absent" ? "Devamsız" : name === "late" ? "Geç" : "Kesinleşen"
                    ]}
                  />
                  <Area type="monotone" dataKey="absent" stroke="#fb7185" fill="url(#ptdAbsent)" strokeWidth={2} name="absent" />
                  <Area type="monotone" dataKey="late" stroke="#38bdf8" fill="url(#ptdLate)" strokeWidth={2} name="late" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </article>

        <article className="ptd-card">
          <div className="ptd-card-head">
            <div>
              <span>Program</span>
              <h2>Haftalık dersler</h2>
              <small>{overview?.workload.weeklyLessons ?? 0} slot</small>
            </div>
          </div>
          {(overview?.lessons.length ?? 0) === 0 ? (
            <p className="ptd-empty">Yayınlı programda bu öğretmene ait ders yok.</p>
          ) : (
            overview?.lessons.map((lesson) => (
              <div className="ptd-lesson" key={lesson.id}>
                <time>
                  {dayLabel(lesson.dayOfWeek)}
                  <br />
                  {lesson.startTime}–{lesson.endTime}
                </time>
                <div>
                  <strong>{lesson.subjectName}</strong>
                  <small>
                    {lesson.className}
                    {lesson.room ? ` · ${lesson.room}` : ""}
                  </small>
                </div>
              </div>
            ))
          )}
        </article>
      </div>

      <div className="ptd-bento">
        <article className="ptd-card">
          <div className="ptd-card-head">
            <div>
              <span>Sınıflar</span>
              <h2>Sınıf bazlı yoklama</h2>
              <small>Kesinleşmiş kayıtlardaki katılım.</small>
            </div>
          </div>
          {(overview?.classes.length ?? 0) === 0 ? (
            <p className="ptd-empty">Sınıf kırılımı henüz oluşmadı.</p>
          ) : (
            <table className="ptd-table">
              <thead>
                <tr>
                  <th>Sınıf</th>
                  <th>Ders</th>
                  <th>Katılım</th>
                  <th>Devamsız</th>
                </tr>
              </thead>
              <tbody>
                {overview?.classes.map((item) => (
                  <tr key={item.classId}>
                    <td>{item.className}</td>
                    <td>
                      {item.finalized}/{item.weeklyLessons || item.sessions}
                    </td>
                    <td>%{item.presencePct}</td>
                    <td>
                      {item.absent} / {item.late} geç
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <article className="ptd-card">
          <div className="ptd-card-head">
            <div>
              <span>Geçmiş</span>
              <h2>Son yoklama oturumları</h2>
            </div>
          </div>
          {(overview?.recentSessions.length ?? 0) === 0 ? (
            <p className="ptd-empty">Kayıtlı yoklama oturumu yok.</p>
          ) : (
            overview?.recentSessions.map((session) => (
              <div className="ptd-session" key={session.id}>
                <time>{formatDateTime(session.startedAt)}</time>
                <div>
                  <strong>
                    {session.subjectName} · {session.className}
                  </strong>
                  <small>
                    {session.present} mevcut, {session.absent} devamsız
                    {session.finalizedAt ? "" : " · taslak"}
                  </small>
                </div>
                <KeyRound size={14} color={session.finalizedAt ? "#047857" : "#b45309"} aria-hidden />
              </div>
            ))
          )}
        </article>
      </div>

      {teacher ? (
        <TeacherFormModal
          open={modalOpen}
          mode="edit"
          classes={classes}
          initial={teacher}
          existingUsernames={teachers.map((item) => item.username)}
          onClose={() => setModalOpen(false)}
          onSubmit={handleUpdate}
        />
      ) : null}

      <CredentialRevealDialog
        open={credential !== null}
        title={credential?.title ?? ""}
        username={credential?.username ?? ""}
        password={credential?.password ?? ""}
        hint={credential?.hint}
        onClose={() => setCredential(null)}
      />
    </section>
  );
}
