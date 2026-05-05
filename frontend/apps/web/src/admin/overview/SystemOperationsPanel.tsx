import type { ResourceMetric, ServiceMetric, SystemMetrics } from "../../lib/api";
import { StatusBadge } from "../components/StatusBadge";

function ResourceBar({ metric }: { metric: ResourceMetric }) {
  const value = Math.max(0, Math.min(100, Math.round(metric.value)));
  const barClass =
    metric.status === "loading" ? "sa-bar-fill--loading" : value > 85 ? "sa-bar-fill--critical" : value > 60 ? "sa-bar-fill--warn" : "sa-bar-fill--ok";
  return (
    <div className="sa-resource-bar-item">
      <div className="sa-resource-bar-label">
        <strong>{metric.label}</strong>
        <span>{metric.status === "loading" ? "—" : `${value}${metric.unit}`}</span>
      </div>
      <div className="sa-bar-track">
        <div className={`sa-bar-fill ${barClass}`} style={{ width: `${value}%` }} />
      </div>
      <span className="sa-resource-bar-desc">{metric.description}</span>
    </div>
  );
}

function ServiceHealthRow({ service }: { service: ServiceMetric }) {
  return (
    <div className="sa-health-row">
      <div className="sa-health-name">
        <div className={`sa-service-dot ${service.status}`} />
        <div>
          <strong>{service.name}</strong>
          <span>{service.description}</span>
        </div>
      </div>
      <div>
        <StatusBadge value={service.status} />
      </div>
      <div className="sa-health-latency">
        {typeof service.latencyMs === "number" ? <span>{service.latencyMs} ms</span> : <span style={{ color: "var(--sa-muted)" }}>—</span>}
      </div>
    </div>
  );
}

export function SystemOperationsPanel({ metrics }: { metrics?: SystemMetrics }) {
  const resources = metrics?.resources ?? [];
  const services = metrics?.services ?? [];
  const displayResources =
    resources.length > 0
      ? resources
      : [
          { key: "cpu", label: "CPU", value: 0, unit: "%", status: "loading" as const, description: "Yükleniyor" },
          { key: "ram", label: "RAM", value: 0, unit: "%", status: "loading" as const, description: "Yükleniyor" },
          { key: "disk", label: "Disk", value: 0, unit: "%", status: "loading" as const, description: "Yükleniyor" },
          { key: "heap", label: "API Heap", value: 0, unit: "%", status: "loading" as const, description: "Yükleniyor" }
        ];

  return (
    <div className="sa-infra-panel">
      <div className="sa-resource-bars-grid">
        {displayResources.map((metric) => (
          <ResourceBar metric={metric} key={metric.key} />
        ))}
      </div>
      <div className="sa-health-divider" />
      <div className="sa-health-table">
        <div className="sa-health-table-head">
          <span>Servis</span>
          <span>Durum</span>
          <span>Gecikme</span>
        </div>
        {services.map((service) => (
          <ServiceHealthRow service={service} key={service.key} />
        ))}
        {services.length === 0 && (
          <p className="empty-text" style={{ paddingTop: 8 }}>
            Servis metrikleri yükleniyor.
          </p>
        )}
      </div>
    </div>
  );
}
