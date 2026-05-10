import type { ReactNode } from "react";

export function RoleMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <article className="role-metric">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}
