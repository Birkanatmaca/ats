import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ScheduleConflictsResult } from "../../../lib/api";
import { scheduleConflictTypeLabel } from "./scheduleChangeLog";
import "./ScheduleOpsPanels.css";

export function ScheduleConflictsPanel({ result, loading }: { result: ScheduleConflictsResult | null; loading?: boolean }) {
  if (loading) {
    return (
      <article className="schedule-ops-panel schedule-ops-panel--loading">
        <p>Çakışma kontrolü yapılıyor…</p>
      </article>
    );
  }

  if (!result) {
    return (
      <article className="schedule-ops-panel schedule-ops-panel--empty">
        <p>Yayınlı program bulunamadı. Çakışma paneli program yayınlandıktan sonra görünür.</p>
      </article>
    );
  }

  const hard = result.conflicts.filter((item) => item.severity === "hard");
  const soft = result.conflicts.filter((item) => item.severity === "soft");
  const rows =
    result.conflicts.length > 0
      ? result.conflicts
      : [
          ...result.hardConflicts.map((message) => ({ severity: "hard" as const, type: "legacy", message })),
          ...result.softWarnings.map((message) => ({ severity: "soft" as const, type: "legacy", message }))
        ];

  return (
    <article className={`schedule-ops-panel schedule-ops-panel--conflicts ${result.valid ? "is-valid" : "is-invalid"}`}>
      <header className="schedule-ops-panel-head">
        {result.valid ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        <div>
          <span>Doğrulama</span>
          <h3>{result.valid ? "Çakışma yok" : "Çakışma paneli"}</h3>
        </div>
        <em>
          {hard.length} sert · {soft.length} uyarı
        </em>
      </header>

      {rows.length === 0 ? (
        <p className="schedule-ops-empty">Program kurallarına göre çakışma tespit edilmedi.</p>
      ) : (
        <ul className="schedule-conflicts-list">
          {rows.slice(0, 8).map((item) => (
            <li className={`schedule-conflicts-row schedule-conflicts-row--${item.severity}`} key={`${item.severity}-${item.type}-${item.message}`}>
              <span>{scheduleConflictTypeLabel(item.type)}</span>
              <p>{item.message}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
