import type { ResourceMetric, ServiceMetric, SystemMetrics } from "../../lib/api";
import { StatusBadge } from "../components/StatusBadge";

function ResourceMeter({ metric }: { metric: ResourceMetric }) {
  const value = Math.max(0, Math.min(100, Math.round(metric.value)));
  const tone = value > 85 ? "critical" : value > 60 ? "warn" : "ok";
  return (
    <div className={`ov-meter ov-meter--${tone}`}>
      <div className="ov-ring" style={{ ["--p" as string]: value }}>
        <strong>{metric.status === "loading" ? "—" : `${value}`}</strong>
      </div>
      <div className="ov-meter-copy">
        <span>{metric.label}</span>
        <small>{metric.description}</small>
      </div>
    </div>
  );
}

function ServiceHealthRow({ service }: { service: ServiceMetric }) {
  return (
    <div className="ov-service">
      <div className={`ov-service-dot ${service.status}`} />
      <div className="ov-service-copy">
        <strong>{service.name}</strong>
        <span>{service.description}</span>
      </div>
      <StatusBadge value={service.status} />
      <div className="ov-service-latency">
        {typeof service.latencyMs === "number" ? `${service.latencyMs} ms` : ""}
      </div>
    </div>
  );
}

export function SystemOperationsPanel({ metrics }: { metrics?: SystemMetrics }) {
  const resources = metrics?.resources ?? [];
  const services = metrics?.services ?? [];

  if (resources.length === 0 && services.length === 0) {
    return null;
  }

  return (
    <div className="ov-infra">
      {resources.length > 0 ? (
        <div className="ov-meters">
          {resources.map((metric) => (
            <ResourceMeter metric={metric} key={metric.key} />
          ))}
        </div>
      ) : null}
      {services.length > 0 ? (
        <div className="ov-services">
          {services.map((service) => (
            <ServiceHealthRow service={service} key={service.key} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
