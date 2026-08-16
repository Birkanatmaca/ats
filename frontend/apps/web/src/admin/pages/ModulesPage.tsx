import { AlertTriangle, Blocks, CheckCircle2, Clock3, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ModuleStatus } from "../../lib/api";
import { moduleIcon } from "../components/adminIcons";
import { statusLabel } from "../utils/labels";
import "./ModulesPage.css";

const STATUS_FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "operational", label: "Çalışıyor" },
  { value: "limited", label: "Sınırlı" },
  { value: "planned", label: "Planlandı" }
] as const;

const MODULE_LABELS: Record<string, string> = {
  Auth: "Kimlik",
  Scheduling: "Ders programı",
  Attendance: "Yoklama",
  Guidance: "Rehberlik",
  Billing: "Tahsilat",
  Transport: "Servis",
  Homework: "Ödev",
  Announcements: "Duyuru",
  Files: "Dosyalar",
  AI: "ogta.ai"
};

function moduleLabel(name: string) {
  return MODULE_LABELS[name] ?? name;
}

function statusTone(status: string) {
  if (status === "operational" || status === "healthy" || status === "active") return "ok";
  if (status === "limited" || status === "warning") return "warn";
  if (status === "planned") return "wait";
  return "off";
}

export function ModulesPage({ modules }: { modules: ModuleStatus[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const stats = useMemo(() => {
    return {
      total: modules.length,
      operational: modules.filter((module) => module.status === "operational").length,
      limited: modules.filter((module) => module.status === "limited").length,
      planned: modules.filter((module) => module.status === "planned").length
    };
  }, [modules]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return modules.filter((module) => {
      if (statusFilter !== "all" && module.status !== statusFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const blob = `${moduleLabel(module.name)} ${module.name} ${module.description} ${statusLabel(module.status)}`.toLocaleLowerCase("tr-TR");
      return blob.includes(needle);
    });
  }, [modules, query, statusFilter]);

  return (
    <section className="mod">
      <header className="mod-hero">
        <div>
          <p className="mod-kicker">Sistem</p>
          <h1>Modüller</h1>
        </div>
        <p className="mod-hero-note">Ürün yüzeyleri ve servis sağlığı</p>
      </header>

      <div className="mod-kpi-grid">
        <article className="mod-kpi">
          <div className="mod-kpi-icon">
            <Blocks size={18} />
          </div>
          <span>Toplam</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="mod-kpi">
          <div className="mod-kpi-icon mod-kpi-icon--green">
            <CheckCircle2 size={18} />
          </div>
          <span>Çalışıyor</span>
          <strong>{stats.operational}</strong>
        </article>
        <article className="mod-kpi">
          <div className="mod-kpi-icon mod-kpi-icon--amber">
            <AlertTriangle size={18} />
          </div>
          <span>Sınırlı</span>
          <strong>{stats.limited}</strong>
        </article>
        <article className="mod-kpi">
          <div className="mod-kpi-icon mod-kpi-icon--violet">
            <Clock3 size={18} />
          </div>
          <span>Planlandı</span>
          <strong>{stats.planned}</strong>
        </article>
      </div>

      <div className="mod-toolbar">
        <label className="mod-search">
          <Search size={16} />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Modül ara" value={query} />
        </label>
        <div className="mod-filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              className={statusFilter === filter.value ? "is-active" : undefined}
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <article className="mod-card">
          <p className="mod-empty">Bu filtreye uyan modül yok.</p>
        </article>
      ) : (
        <div className="mod-grid">
          {filtered.map((module) => (
            <article className="mod-card" key={module.name}>
              <div className="mod-card-head">
                <div className="mod-icon">{moduleIcon(module.name)}</div>
                <span className={`mod-pill mod-pill--${statusTone(module.status)}`}>{statusLabel(module.status)}</span>
              </div>
              <h2>{moduleLabel(module.name)}</h2>
              <p>{module.description}</p>
              <small>{module.name}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
