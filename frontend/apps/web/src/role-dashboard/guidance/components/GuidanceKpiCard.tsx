import type { ReactNode } from "react";

export function GuidanceKpiCard({
  detail,
  icon,
  label,
  tone,
  value
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  tone: "sky" | "emerald" | "amber" | "violet" | "rose";
  value: ReactNode;
}) {
  return (
    <article className={`principal-stat-card principal-stat-card--${tone} guidance-kpi-card`}>
      <div className="principal-stat-icon">{icon}</div>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
  );
}
