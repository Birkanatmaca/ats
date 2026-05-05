import type { ReactNode } from "react";

export function Metric({ icon, label, value, tone, hint }: { icon: ReactNode; label: string; value: string | number; tone: string; hint?: string }) {
  const slate = tone === "sky";
  return (
    <article className={slate ? "sa-kpi sa-kpi--slate" : "sa-kpi"}>
      <div className="sa-kpi-icon">{icon}</div>
      <label>{label}</label>
      <span className="sa-kpi-value">{value}</span>
      {hint ? <span className="sa-kpi-hint">{hint}</span> : null}
    </article>
  );
}
