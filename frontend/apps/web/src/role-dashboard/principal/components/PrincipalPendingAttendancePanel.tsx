import { AlertTriangle, ChevronRight, ClipboardCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { PrincipalSummary } from "../../../lib/api";
import { buildPendingAttendance } from "../utils/pendingAttendance";

type PrincipalPendingAttendancePanelProps = {
  summary?: PrincipalSummary | null;
  variant?: "banner" | "card";
  showClassList?: boolean;
};

export function PrincipalPendingAttendancePanel({
  summary,
  variant = "banner",
  showClassList = false
}: PrincipalPendingAttendancePanelProps) {
  const pending = buildPendingAttendance(summary);
  if (!pending) {
    return null;
  }

  const lessonLine =
    pending.pendingLessons > 0
      ? `${pending.pendingLessons} ders yoklaması henüz tamamlanmadı`
      : "Bazı sınıflarda yoklama bekleniyor";

  if (variant === "banner") {
    return (
      <div className="principal-alert-banner principal-alert-banner--amber" role="status">
        <AlertTriangle size={18} aria-hidden />
        <div>
          <strong>Bekleyen yoklama var</strong>
          <p>
            {lessonLine}. Tamamlanma: %{pending.completionPct} ({pending.todayLessons - pending.pendingLessons}/
            {pending.todayLessons} ders).
          </p>
          {showClassList && pending.pendingClasses.length > 0 ? (
            <p>
              Bekleyen sınıflar:{" "}
              {pending.pendingClasses
                .map((item) => `${item.className} (${item.completed}/${item.total})`)
                .join(", ")}
            </p>
          ) : null}
        </div>
        <NavLink className="primary-action small-action" to="/dashboard/attendance">
          Yoklamayı gör
        </NavLink>
      </div>
    );
  }

  return (
    <article className="principal-surface-card principal-pending-attendance-card">
      <div className="principal-card-head">
        <h2>
          <ClipboardCheck size={18} aria-hidden /> Bekleyen yoklama
        </h2>
        <p>{lessonLine}. Öğretmenler çevrimdışı kayıt yaptıysa senkron sonrası burada güncellenir.</p>
      </div>

      <div className="principal-pending-attendance-metrics">
        <div>
          <small>Bekleyen ders</small>
          <strong>{pending.pendingLessons}</strong>
        </div>
        <div>
          <small>Bugünkü ders</small>
          <strong>{pending.todayLessons}</strong>
        </div>
        <div>
          <small>Tamamlanma</small>
          <strong>%{pending.completionPct}</strong>
        </div>
      </div>

      {pending.pendingClasses.length > 0 ? (
        <div className="principal-pending-attendance-list">
          {pending.pendingClasses.map((item) => (
            <div className="principal-pending-attendance-row" key={item.className}>
              <div>
                <strong>{item.className}</strong>
                <span>
                  {item.completed}/{item.total} ders tamam
                </span>
              </div>
              <span className="principal-pending-attendance-badge">Yoklama bekliyor</span>
            </div>
          ))}
        </div>
      ) : null}

      <NavLink className="principal-pending-attendance-link" to="/dashboard/attendance">
        Yoklama ekranına git
        <ChevronRight size={16} />
      </NavLink>
    </article>
  );
}
