import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import type { GuidanceEarlyWarningSignal } from "../../../lib/api";
import { earlyWarningSeverityBadgeClass, earlyWarningSeverityLabel, formatGuidanceDate } from "../utils";

export function GuidanceEarlyWarningList({
  signals,
  limit,
  casesPath = "/dashboard/cases"
}: {
  signals: GuidanceEarlyWarningSignal[];
  limit?: number;
  casesPath?: string;
}) {
  const items = limit ? signals.slice(0, limit) : signals;
  if (items.length === 0) {
    return <p className="guidance-empty-copy">Şu an erken uyarı sinyali yok.</p>;
  }

  return (
    <div className="guidance-early-warning-list">
      {items.map((signal) => (
        <article className="guidance-early-warning-item" key={signal.id}>
          <div className="guidance-early-warning-head">
            <AlertTriangle size={16} />
            <strong>{signal.title}</strong>
            <span className={earlyWarningSeverityBadgeClass(signal.severity)}>{earlyWarningSeverityLabel(signal.severity)}</span>
          </div>
          <p className="guidance-data-secondary">
            {signal.studentName} · {signal.className}
          </p>
          <p>{signal.summary}</p>
          <small>{signal.suggestedAction}</small>
          {!signal.hasOpenCase ? (
            <Link className="guidance-inline-link" to={casesPath}>
              Vaka dosyalarına git
            </Link>
          ) : null}
          <time>{formatGuidanceDate(signal.detectedAt)}</time>
        </article>
      ))}
    </div>
  );
}
