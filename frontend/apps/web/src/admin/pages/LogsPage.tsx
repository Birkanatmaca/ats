import { Database, FileClock, SlidersHorizontal } from "lucide-react";
import type { AuditEntry } from "../../lib/api";
import { PanelHeader } from "../components/PanelHeader";
import { SensitivityBadge } from "../components/SensitivityBadge";
import "./LogsPage.css";

export function LogsPage({ auditLogs }: { auditLogs: AuditEntry[] }) {
  return (
    <section className="sa-page-stack">
      <div className="sa-logs-layout">
        <aside className="sa-filter-panel">
          <PanelHeader kicker="Filtre" title="Audit kapsamı" icon={<SlidersHorizontal size={22} />} />
          <button className="sa-chip is-active" type="button">
            Tüm loglar
          </button>
          <button className="sa-chip" type="button">
            Hassas öğrenci
          </button>
          <button className="sa-chip" type="button">
            Sistem
          </button>
          <button className="sa-chip" type="button">
            Operasyon
          </button>
        </aside>

        <section className="sa-card">
          <PanelHeader kicker="Audit" title="Sistem logları" icon={<FileClock size={22} />} />
          <div className="sa-card-body">
            <div className="sa-audit-stack">
              {auditLogs.map((entry) => (
                <div className="sa-audit-item" key={entry.id}>
                  <div className="sa-audit-icon">
                    <Database size={18} />
                  </div>
                  <div>
                    <strong>{entry.action}</strong>
                    <span className="sa-audit-sub">
                      {entry.tenant} · {entry.actor} · {entry.resourceType}
                    </span>
                  </div>
                  <div className="sa-audit-meta">
                    <SensitivityBadge value={entry.sensitivity} />
                    <small>{new Date(entry.createdAt).toLocaleString("tr-TR")}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
