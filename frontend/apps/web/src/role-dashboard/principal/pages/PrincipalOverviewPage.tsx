import { AlertTriangle, ClipboardCheck, GraduationCap, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CSSProperties } from "react";
import { PrincipalPendingAttendancePanel } from "../components/PrincipalPendingAttendancePanel";
import type { PrincipalConsoleData } from "../types";

export function PrincipalOverviewPage({ data }: { data: PrincipalConsoleData }) {
  const summary = data.summary;
  const schedulePublished = data.schedule?.status === "published";
  const attendancePct = Math.max(0, Math.min(100, summary?.attendanceCompletionPct ?? 0));
  const absenteePct = summary?.activeStudents ? Math.min(100, Math.round(((summary.absentToday ?? 0) / summary.activeStudents) * 100)) : 0;
  const riskPct = summary?.activeStudents ? Math.min(100, Math.round(((summary.openObservationSignals ?? 0) / summary.activeStudents) * 100)) : 0;
  const activeStudents = summary?.activeStudents ?? 0;
  const hasAttendanceToday = attendancePct > 0;
  const participationPct =
    activeStudents > 0 && hasAttendanceToday
      ? Math.max(0, Math.min(100, Math.round(((activeStudents - Math.min(summary?.absentToday ?? 0, activeStudents)) / activeStudents) * 100)))
      : 0;
  const classAbsenceData = (summary?.classAttendance ?? []).map((item) => ({
    name: item.className,
    absent: item.absent,
    completed: item.completed
  }));
  const operationData = (summary?.operations ?? []).slice(0, 6).map((item) => ({
    name: item.title.length > 18 ? `${item.title.slice(0, 16)}..` : item.title,
    score: item.priority === "urgent" ? 100 : item.priority === "high" ? 80 : item.priority === "normal" ? 55 : 35
  }));
  const ringStyle = (value: number): CSSProperties & { "--principal-ring": string } => ({ "--principal-ring": `${value}%` });

  return (
    <section className="principal-page-stack">
      {!schedulePublished ? (
        <div className="principal-alert-banner principal-alert-banner--warning">
          <AlertTriangle size={18} aria-hidden />
          <div>
            <strong>Yayınlanmış ders programı bulunamadı</strong>
            <p>Öğretmen yoklaması ve günlük operasyonlar için programı oluşturup yayınlayın.</p>
          </div>
          <NavLink className="primary-action small-action" to="/dashboard/schedule/builder">
            Program oluştur
          </NavLink>
        </div>
      ) : null}

      <PrincipalPendingAttendancePanel summary={summary} showClassList />

      <div className="principal-kpi-grid">
        <article className="principal-kpi-card">
          <span className="principal-kpi-icon">
            <UsersRound size={18} />
          </span>
          <small>Aktif öğrenci</small>
          <strong>{summary?.activeStudents ?? 0}</strong>
        </article>
        <article className="principal-kpi-card">
          <span className="principal-kpi-icon">
            <GraduationCap size={18} />
          </span>
          <small>Öğretmen</small>
          <strong>{summary?.activeTeachers ?? 0}</strong>
        </article>
        <article className="principal-kpi-card">
          <span className="principal-kpi-icon">
            <ClipboardCheck size={18} />
          </span>
          <small>Yoklama tamamlama</small>
          <strong>%{summary?.attendanceCompletionPct ?? 0}</strong>
        </article>
        <article className="principal-kpi-card">
          <span className="principal-kpi-icon">
            <AlertTriangle size={18} />
          </span>
          <small>Açık risk sinyali</small>
          <strong>{summary?.openObservationSignals ?? 0}</strong>
        </article>
      </div>

      <div className="principal-visual-grid">
        <article className="principal-surface-card principal-surface-card--visual">
          <div className="principal-card-head">
            <h2>Dairesel performans göstergeleri</h2>
            <p>Yoklama, devamsızlık ve risk oranını anlık takip et.</p>
          </div>
          <div className="principal-ring-grid principal-ring-grid--fit">
            <div className="principal-ring-wrap">
              <div className="principal-ring" style={ringStyle(attendancePct)}>
                <strong>%{attendancePct}</strong>
              </div>
              <span>Yoklama tamamlama</span>
            </div>
            <div className="principal-ring-wrap">
              <div className="principal-ring principal-ring--warn" style={ringStyle(absenteePct)}>
                <strong>%{absenteePct}</strong>
              </div>
              <span>Devamsızlık oranı</span>
            </div>
            <div className="principal-ring-wrap">
              <div className="principal-ring principal-ring--risk" style={ringStyle(riskPct)}>
                <strong>%{riskPct}</strong>
              </div>
              <span>Risk yoğunluğu</span>
            </div>
          </div>
        </article>

        <article className="principal-surface-card principal-surface-card--visual">
          <div className="principal-card-head">
            <h2>Yoklama dağılımı</h2>
            <p>Okul genelinde bugünkü öğrenci katılım oranı.</p>
          </div>
          <div className="principal-participation-panel">
            <div className="principal-participation-ring-wrap">
              <div
                className={`principal-participation-ring${hasAttendanceToday ? "" : " principal-participation-ring--empty"}`}
                style={ringStyle(participationPct)}
                role="img"
                aria-label={`Katılım yüzdesi: %${participationPct}`}
              >
                <strong>%{participationPct}</strong>
                <span>Katılım</span>
              </div>
              <p className="principal-participation-caption">
                {hasAttendanceToday
                  ? `${activeStudents - Math.min(summary?.absentToday ?? 0, activeStudents)} / ${activeStudents} öğrenci bugün okulda`
                  : "Yoklama alındıkça katılım oranı burada görünür."}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="principal-visual-grid">
        <article className="principal-surface-card">
          <div className="principal-card-head">
            <h2>Sınıf bazlı devamsızlık analizi</h2>
            <p>Hangi sınıfta devamsızlık yoğun, hızlıca gör.</p>
          </div>
          <div className="principal-chart-frame principal-chart-frame--lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classAbsenceData.length > 0 ? classAbsenceData : [{ name: "-", absent: 0, completed: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e2" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#919a9f" }} />
                <YAxis tick={{ fontSize: 11, fill: "#919a9f" }} />
                <Tooltip />
                <Bar dataKey="absent" fill="#ef4444" radius={[6, 6, 0, 0]} name="Devamsız" />
                <Bar dataKey="completed" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Yoklama tamam" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="principal-surface-card">
          <div className="principal-card-head">
            <h2>Operasyon öncelik yoğunluğu</h2>
            <p>Aksiyon gerektiren işleri öncelik skoruna göre sırala.</p>
          </div>
          <div className="principal-chart-frame principal-chart-frame--lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operationData.length > 0 ? operationData : [{ name: "-", score: 0 }]} layout="vertical" margin={{ left: 4, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e2" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#919a9f" }} />
                <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 10, fill: "#919a9f" }} />
                <Tooltip formatter={(value: number) => [`${value}`, "Öncelik skoru"]} />
                <Bar dataKey="score" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
