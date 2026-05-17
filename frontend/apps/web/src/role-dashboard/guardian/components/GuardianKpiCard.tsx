import type { ReactNode } from "react";

export function GuardianKpiCard({
  detail,
  icon,
  label,
  tone,
  value
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  tone: "sky" | "emerald" | "amber" | "violet";
  value: ReactNode;
}) {
  return (
    <article className={`principal-stat-card principal-stat-card--${tone} guardian-kpi-card`}>
      <div className="principal-stat-icon">{icon}</div>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
  );
}
