import { Database } from "lucide-react";
import { useMemo, useState } from "react";
import type { AuditEntry } from "../../lib/api";
import { SensitivityBadge } from "../components/SensitivityBadge";
import "./LogsPage.css";

type LogFilter = "all" | "system_confidential" | "sensitive_student" | "operational" | "tenant";

const logFilters: Array<{ id: LogFilter; label: string }> = [
  { id: "all", label: "Tümü" },
  { id: "system_confidential", label: "Gizli sistem" },
  { id: "sensitive_student", label: "Öğrenci hassas" },
  { id: "operational", label: "Operasyon" },
  { id: "tenant", label: "Kurum işlemleri" }
];

function matchesFilter(entry: AuditEntry, filter: LogFilter) {
  if (filter === "all") return true;
  if (filter === "tenant") return entry.action.includes("tenant") || entry.resourceType.includes("tenant");
  return entry.sensitivity === filter;
}

export function LogsPage({ auditLogs }: { auditLogs: AuditEntry[] }) {
  const [activeFilter, setActiveFilter] = useState<LogFilter>("all");

  const filteredLogs = useMemo(() => auditLogs.filter((entry) => matchesFilter(entry, activeFilter)), [activeFilter, auditLogs]);

  return (
    <section className="sa-page-stack sa-logs-page">
      <div className="sa-log-filters" aria-label="Audit filtreleri">
        {logFilters.map((filter) => {
          const count = auditLogs.filter((entry) => matchesFilter(entry, filter.id)).length;
          return (
            <button
              className={`sa-chip ${activeFilter === filter.id ? "is-active" : ""}`}
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <section className="sa-card sa-log-table-card">
        <div className="sa-card-body">
          <div className="sa-data-grid sa-log-table">
            <div className="sa-row-head sa-log-table-head">
              <span>İşlem</span>
              <span>Kurum</span>
              <span>Aktör</span>
              <span>Kaynak</span>
              <span>Hassasiyet</span>
              <span>Tarih</span>
            </div>

            {filteredLogs.map((entry) => (
              <div className="sa-row-body sa-log-table-row" key={entry.id}>
                <div className="sa-log-action">
                  <div className="sa-audit-icon">
                    <Database size={16} />
                  </div>
                  <strong>{entry.action}</strong>
                </div>
                <span>{entry.tenant}</span>
                <span>{entry.actor}</span>
                <span>{entry.resourceType}</span>
                <SensitivityBadge value={entry.sensitivity} />
                <small>{new Date(entry.createdAt).toLocaleString("tr-TR")}</small>
              </div>
            ))}

            {filteredLogs.length === 0 && <p className="empty-text sa-log-empty">Bu filtrede log kaydı bulunamadı.</p>}
          </div>
        </div>
      </section>
    </section>
  );
}
