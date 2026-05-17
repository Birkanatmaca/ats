import { AlertTriangle } from "lucide-react";
import { categoryLabel } from "../../utils";
import type { GuidanceRiskSignal } from "../types";
import { formatGuidanceDate, levelLabel } from "../utils";

export function GuidanceRiskList({ signals, limit }: { signals: GuidanceRiskSignal[]; limit?: number }) {
  const visibleSignals = typeof limit === "number" ? signals.slice(0, limit) : signals;

  if (visibleSignals.length === 0) {
    return <p className="empty-text guidance-empty-pad">Aktif erken uyarı sinyali yok.</p>;
  }

  return (
    <div className="guidance-risk-list">
      {visibleSignals.map((signal) => (
        <article className={`guidance-risk-row guidance-risk-row--${signal.level}`} key={signal.id}>
          <div className="guidance-risk-icon">
            <AlertTriangle size={17} />
          </div>
          <div>
            <strong>{signal.studentName}</strong>
            <span>
              {signal.className} · {categoryLabel(signal.category)} · {signal.sourceCount} kayıt
            </span>
            <p>{signal.summary}</p>
          </div>
          <small>
            {levelLabel(signal.level)}
            <br />
            {formatGuidanceDate(signal.lastSeenAt)}
          </small>
        </article>
      ))}
    </div>
  );
}
