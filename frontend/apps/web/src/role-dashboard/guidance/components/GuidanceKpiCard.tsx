import type { ReactNode } from "react";

export function GuidanceKpiCard({
  detail,
  icon,
  label,
  tone,
  value
}: {
  detail?: string;
  icon: ReactNode;
  label: string;
  tone: "sky" | "emerald" | "amber" | "violet" | "rose";
  value: ReactNode;
}) {
  return (
    <article className={`guidance-metric-card guidance-metric-card--${tone}`}>
      <div className="guidance-metric-icon">{icon}</div>
      <div className="guidance-metric-copy">
        <span className="guidance-metric-label">{label}</span>
        <strong className="guidance-metric-value">{value}</strong>
        {detail ? <span className="guidance-metric-detail">{detail}</span> : null}
      </div>
    </article>
  );
}
