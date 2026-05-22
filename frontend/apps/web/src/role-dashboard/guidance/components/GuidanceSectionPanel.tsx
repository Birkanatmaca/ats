import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export function GuidanceSectionPanel({
  title,
  actionLabel,
  actionTo,
  children,
  aside
}: {
  title: string;
  actionLabel?: string;
  actionTo?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="guidance-panel">
      <header className="guidance-panel-head">
        <h2>{title}</h2>
        {aside}
        {actionLabel && actionTo ? (
          <NavLink className="guidance-panel-link" to={actionTo}>
            {actionLabel}
          </NavLink>
        ) : null}
      </header>
      <div className="guidance-panel-body">{children}</div>
    </section>
  );
}
