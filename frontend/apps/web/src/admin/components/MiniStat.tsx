import type { ReactNode } from "react";

export function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <article className="sa-mini-card">
      <div className="sa-mini-card-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
