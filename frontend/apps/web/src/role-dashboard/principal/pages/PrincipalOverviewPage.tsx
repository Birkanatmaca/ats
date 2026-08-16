import { AlertTriangle, ChevronRight, ClipboardCheck, GraduationCap, ShieldAlert, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CSSProperties } from "react";
import { PrincipalPendingAttendancePanel } from "../components/PrincipalPendingAttendancePanel";
import type { PrincipalConsoleData } from "../types";
import "./PrincipalOverviewPage.css";

const CHART_TOOLTIP = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#0f172a",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)"
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Acil",
  high: "Yüksek",
  normal: "Normal",
  low: "Düşük"
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Günaydın";
  }
  if (hour < 18) {
    return "İyi günler";
  }
  return "İyi akşamlar";
}

function todayLabel() {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());
}

function ringStyle(value: number): CSSProperties {
  return { "--p": Math.max(0, Math.min(100, value)) } as CSSProperties;
}

export function PrincipalOverviewPage({ data }: { data: PrincipalConsoleData }) {
  const summary = data.summary;
  const schoolName = data.tenant?.name ?? "Okul";
  const schedulePublished = data.schedule?.status === "published";
  const attendancePct = Math.max(0, Math.min(100, summary?.attendanceCompletionPct ?? 0));
  const absenteePct = summary?.activeStudents
    ? Math.min(100, Math.round(((summary.absentToday ?? 0) / summary.activeStudents) * 100))
    : 0;
  const riskPct = summary?.activeStudents
    ? Math.min(100, Math.round(((summary.openObservationSignals ?? 0) / summary.activeStudents) * 100))
    : 0;
  const activeStudents = summary?.activeStudents ?? 0;
  const absentToday = summary?.absentToday ?? 0;
  const presentToday = Math.max(0, activeStudents - Math.min(absentToday, activeStudents));
  const hasAttendanceToday = attendancePct > 0;
  const participationPct =
    activeStudents > 0 && hasAttendanceToday
      ? Math.max(0, Math.min(100, Math.round((presentToday / activeStudents) * 100)))
      : 0;
  const classAbsenceData = (summary?.classAttendance ?? []).map((item) => ({
    name: item.className,
    absent: item.absent,
    completed: item.completed
  }));
  const operations = (summary?.operations ?? []).slice(0, 6);

  return (
    <section className="pov">
      <header className="pov-hero">
        <div>
          <p className="pov-kicker">Genel bakış</p>
          <h1>
            {greeting()}, {schoolName}
          </h1>
          <p>Bugünün yoklama, katılım ve operasyon nabzı tek ekranda.</p>
        </div>
        <div className="pov-hero-meta">
          <span className="pov-pill">{todayLabel()}</span>
          <span className={`pov-pill${schedulePublished ? " pov-pill--ok" : " pov-pill--warn"}`}>
            {schedulePublished ? "Program yayınlı" : "Program bekliyor"}
          </span>
          <span className={`pov-pill${attendancePct >= 80 ? " pov-pill--ok" : attendancePct > 0 ? " pov-pill--warn" : ""}`}>
            Yoklama %{attendancePct}
          </span>
          {(summary?.openObservationSignals ?? 0) > 0 ? (
            <span className="pov-pill pov-pill--risk">{summary?.openObservationSignals} açık risk</span>
          ) : null}
        </div>
      </header>

      {!schedulePublished ? (
        <div className="pov-alert pov-alert--warn">
          <AlertTriangle size={18} aria-hidden />
          <div>
            <strong>Yayınlanmış ders programı bulunamadı</strong>
            <p>Öğretmen yoklaması ve günlük operasyonlar için programı oluşturup yayınlayın.</p>
          </div>
          <NavLink to="/dashboard/schedule/builder">Program oluştur</NavLink>
        </div>
      ) : null}

      <div className="pov-pending">
        <PrincipalPendingAttendancePanel summary={summary} showClassList />
      </div>

      <div className="pov-kpi-grid">
        <NavLink className="pov-kpi" to="/dashboard/students">
          <div className="pov-kpi-top">
            <span className="pov-kpi-icon">
              <UsersRound size={18} />
            </span>
            <ChevronRight className="pov-kpi-go" size={16} />
          </div>
          <span>Aktif öğrenci</span>
          <strong>{activeStudents}</strong>
          <small>{summary?.classes ?? 0} sınıf</small>
        </NavLink>
        <NavLink className="pov-kpi" to="/dashboard/teachers">
          <div className="pov-kpi-top">
            <span className="pov-kpi-icon pov-kpi-icon--violet">
              <GraduationCap size={18} />
            </span>
            <ChevronRight className="pov-kpi-go" size={16} />
          </div>
          <span>Öğretmen</span>
          <strong>{summary?.activeTeachers ?? 0}</strong>
          <small>{summary?.todayLessons ?? 0} ders bugün</small>
        </NavLink>
        <NavLink className="pov-kpi" to="/dashboard/attendance">
          <div className="pov-kpi-top">
            <span className="pov-kpi-icon pov-kpi-icon--teal">
              <ClipboardCheck size={18} />
            </span>
            <ChevronRight className="pov-kpi-go" size={16} />
          </div>
          <span>Yoklama tamamlama</span>
          <strong>%{attendancePct}</strong>
          <small>{hasAttendanceToday ? `${presentToday} öğrenci okulda` : "Henüz yoklama yok"}</small>
        </NavLink>
        <NavLink className="pov-kpi" to="/dashboard/guidance-cases">
          <div className="pov-kpi-top">
            <span className="pov-kpi-icon pov-kpi-icon--rose">
              <ShieldAlert size={18} />
            </span>
            <ChevronRight className="pov-kpi-go" size={16} />
          </div>
          <span>Açık risk sinyali</span>
          <strong>{summary?.openObservationSignals ?? 0}</strong>
          <small>{riskPct > 0 ? `Öğrenci tabanında %${riskPct}` : "Kritik vaka yok"}</small>
        </NavLink>
      </div>

      <div className="pov-bento">
        <article className="pov-card">
          <div className="pov-card-head">
            <div>
              <span>Nabız</span>
              <h2>Anlık okul göstergeleri</h2>
              <p>Yoklama, devamsızlık ve risk yoğunluğu.</p>
            </div>
          </div>
          <div className="pov-pulse-grid">
            <div className="pov-pulse">
              <div className="pov-ring" style={ringStyle(attendancePct)}>
                <strong>%{attendancePct}</strong>
              </div>
              <em>Yoklama tamamlama</em>
            </div>
            <div className="pov-pulse">
              <div className="pov-ring pov-ring--warn" style={ringStyle(absenteePct)}>
                <strong>%{absenteePct}</strong>
              </div>
              <em>Devamsızlık oranı</em>
            </div>
            <div className="pov-pulse">
              <div className="pov-ring pov-ring--risk" style={ringStyle(riskPct)}>
                <strong>%{riskPct}</strong>
              </div>
              <em>Risk yoğunluğu</em>
            </div>
          </div>
        </article>

        <article className="pov-card">
          <div className="pov-card-head">
            <div>
              <span>Katılım</span>
              <h2>Bugünkü yoklama dağılımı</h2>
            </div>
          </div>
          <div className="pov-participation">
            <div
              className={`pov-participation-ring${hasAttendanceToday ? "" : " pov-participation-ring--empty"}`}
              style={ringStyle(participationPct)}
              role="img"
              aria-label={`Katılım yüzdesi: %${participationPct}`}
            >
              <div>
                <strong>%{participationPct}</strong>
                <span>Katılım</span>
              </div>
            </div>
            <div className="pov-participation-copy">
              <p>
                {hasAttendanceToday
                  ? `${presentToday} / ${activeStudents} öğrenci bugün okulda.`
                  : "Yoklama alındıkça katılım oranı burada görünür."}
              </p>
              <div className="pov-mini-stats">
                <div>
                  <small>Okulda</small>
                  <strong>{hasAttendanceToday ? presentToday : "—"}</strong>
                </div>
                <div>
                  <small>Devamsız</small>
                  <strong>{hasAttendanceToday ? absentToday : "—"}</strong>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="pov-bento">
        <article className="pov-card">
          <div className="pov-card-head">
            <div>
              <span>Sınıflar</span>
              <h2>Sınıf bazlı devamsızlık</h2>
              <p>Hangi sınıfta yoklama ve devamsızlık yoğun.</p>
            </div>
            <NavLink to="/dashboard/attendance">Yoklama</NavLink>
          </div>
          {classAbsenceData.length === 0 ? (
            <p className="pov-empty">Sınıf yoklama verisi henüz oluşmadı.</p>
          ) : (
            <div className="pov-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classAbsenceData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: "rgba(37, 99, 235, 0.04)" }} />
                  <Bar dataKey="absent" fill="#fb7185" radius={[6, 6, 0, 0]} name="Devamsız" />
                  <Bar dataKey="completed" fill="#38bdf8" radius={[6, 6, 0, 0]} name="Yoklama tamam" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="pov-card">
          <div className="pov-card-head">
            <div>
              <span>Operasyon</span>
              <h2>Öncelikli işler</h2>
              <p>Aksiyon bekleyen kayıtlar.</p>
            </div>
            <NavLink to="/dashboard/operations">Tümü</NavLink>
          </div>
          {operations.length === 0 ? (
            <p className="pov-empty">Bekleyen operasyon kaydı yok.</p>
          ) : (
            <ul className="pov-ops">
              {operations.map((item) => (
                <li key={item.id}>
                  <NavLink className="pov-op" to={item.targetPath || "/dashboard/operations"}>
                    <i className={`pov-op-dot pov-op-dot--${item.priority}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.kind || item.status}</small>
                    </div>
                    <span className="pov-op-badge">{PRIORITY_LABEL[item.priority] ?? item.priority}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
