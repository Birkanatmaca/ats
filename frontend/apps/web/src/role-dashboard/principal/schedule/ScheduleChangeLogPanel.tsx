import { History } from "lucide-react";
import type { ScheduleChangeLog } from "../../../lib/api";
import { formatScheduleChangeDate, scheduleChangeLabel, scheduleChangeSummary } from "./scheduleChangeLog";
import "./ScheduleOpsPanels.css";

export function ScheduleChangeLogPanel({ items, loading }: { items: ScheduleChangeLog[]; loading?: boolean }) {
  const visible = items.slice(0, 6);

  return (
    <article className="schedule-ops-panel schedule-ops-panel--changelog">
      <header className="schedule-ops-panel-head">
        <History size={18} />
        <div>
          <span>Denetim</span>
          <h3>Değişiklik geçmişi</h3>
        </div>
        <em>{loading ? "Yükleniyor" : `${items.length} kayıt`}</em>
      </header>

      {loading ? (
        <p className="schedule-ops-empty">Değişiklik kayıtları yükleniyor…</p>
      ) : visible.length === 0 ? (
        <p className="schedule-ops-empty">Bu programda henüz ders düzenleme kaydı yok.</p>
      ) : (
        <ul className="schedule-changelog-list">
          {visible.map((item) => (
            <li className="schedule-changelog-row" key={item.id}>
              <span className="schedule-changelog-dot" aria-hidden />
              <div>
                <strong>{scheduleChangeLabel(item.changeType)}</strong>
                <p>{scheduleChangeSummary(item)}</p>
                <time dateTime={item.createdAt}>{formatScheduleChangeDate(item.createdAt)}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
