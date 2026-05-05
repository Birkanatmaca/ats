import type { ReactNode } from "react";

export function PanelHeader({
  kicker,
  title,
  icon,
  trailing
}: {
  kicker: string;
  title: string;
  icon: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="sa-panel-header sa-panel-header--action">
      <div>
        <span className="sa-kicker">{kicker}</span>
        <h2>{title}</h2>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {trailing}
        {icon}
      </div>
    </div>
  );
}
