import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Gauge,
  GraduationCap,
  Network,
  ServerCog,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { chartPalette } from "../constants/chartPalette";
import { SeverityBadge } from "../components/SeverityBadge";
import { SystemOperationsPanel } from "../overview/SystemOperationsPanel";
import { formatTRY, statusLabel } from "../utils/labels";
import type { SuperAdminOverview, SystemMetrics } from "../../lib/api";
import "./OverviewPage.css";

export function OverviewPage({ overview, systemMetrics }: { overview?: SuperAdminOverview; systemMetrics?: SystemMetrics }) {
  const services = systemMetrics?.services ?? [];
  const resources = systemMetrics?.resources ?? [];
  const incidents = overview?.incidents ?? [];
  const warningServices = services.filter((service) => service.status !== "healthy").length;
  const avgResource = resources.length > 0 ? Math.round(resources.reduce((sum, item) => sum + item.value, 0) / resources.length) : 0;
  const weekUsage = overview?.usage ?? [];
  const fallbackDays = ["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"];
  const usageChartData =
    weekUsage.length > 0
      ? weekUsage.map((point) => ({ name: point.label, value: point.value }))
      : fallbackDays.map((name) => ({ name, value: 0 }));
  const latencyData = services.slice(0, 8).map((s) => ({
    name: s.name.length > 14 ? `${s.name.slice(0, 12)}…` : s.name,
    ms: typeof s.latencyMs === "number" ? s.latencyMs : 0
  }));
  const resourcePie = resources.map((r) => ({
    name: r.label,
    value: Math.round(Math.max(0, Math.min(100, r.value)))
  }));
  const pieData = resourcePie.length > 0 ? resourcePie : [{ name: "Veri bekleniyor", value: 1 }];

  return (
    <section className="sa-overview">
      <div className="sa-kpi-row">
        <article className="sa-kpi sa-kpi--blue">
          <div className="sa-kpi-icon">
            <Building2 size={20} />
          </div>
          <label>Kurum</label>
          <span className="sa-kpi-value">{overview?.institutions ?? 0}</span>
          <span className="sa-kpi-hint">Aktif tenant sayısı.</span>
        </article>
        <article className="sa-kpi sa-kpi--purple">
          <div className="sa-kpi-icon">
            <UsersRound size={20} />
          </div>
          <label>Aktif kullanıcı</label>
          <span className="sa-kpi-value">{overview?.activeUsers ?? 0}</span>
          <span className="sa-kpi-hint">Oturum tabanlı aktivite.</span>
        </article>
        <article className="sa-kpi sa-kpi--green">
          <div className="sa-kpi-icon">
            <Activity size={20} />
          </div>
          <label>Aylık gelir</label>
          <span className="sa-kpi-value">{formatTRY(overview?.monthlyRevenueTry ?? 0)}</span>
          <span className="sa-kpi-hint">TAH mini lisans özet.</span>
        </article>
        <article className="sa-kpi sa-kpi--rose">
          <div className="sa-kpi-icon">
            <ShieldCheck size={20} />
          </div>
          <label>Güvenlik sinyali</label>
          <span className="sa-kpi-value">{overview?.openSecuritySignals ?? 0}</span>
          <span className="sa-kpi-hint">İnceleme kuyruğu.</span>
        </article>
      </div>

      <div className="sa-two-col">
        <div className="sa-card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="sa-panel-header">
            <div>
              <span className="sa-kicker">Kullanım</span>
              <h2>Haftalık aktivite</h2>
            </div>
            <Activity size={22} color="var(--sa-accent)" />
          </div>
          <div className="sa-card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="sa-chart-frame" style={{ flex: 1, height: "auto", minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="saUsageFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e2" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#919a9f" }} axisLine={{ stroke: "#dbdbd9" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#919a9f" }} axisLine={{ stroke: "#dbdbd9" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbdbd9" }} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#saUsageFill)" name="%" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="sa-card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="sa-panel-header sa-panel-header--action">
            <div>
              <span className="sa-kicker">Sistem sağlığı</span>
              <h2>Altyapı Durumu</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "var(--sa-muted)", fontWeight: 600 }}>
                {systemMetrics?.updatedAt ? new Date(systemMetrics.updatedAt).toLocaleTimeString("tr-TR") : "--:--"}
              </span>
              <ServerCog size={20} color="var(--sa-accent)" />
            </div>
          </div>
          <div className="sa-card-body" style={{ flex: 1 }}>
            <SystemOperationsPanel metrics={systemMetrics} />
          </div>
        </div>
      </div>

      <div className="sa-two-col">
        <div className="sa-incident-stack">
          <div className="sa-card">
            <div className="sa-panel-header">
              <div>
                <span className="sa-kicker">İzleme</span>
                <h2>Açık teknik işler</h2>
              </div>
              <AlertCircle size={20} />
            </div>
            <div className="sa-card-body">
              {incidents.map((incident) => (
                <div className="sa-message-block" key={incident.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <strong>{incident.title}</strong>
                    <SeverityBadge value={incident.severity} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--sa-muted)" }}>{incident.status}</span>
                </div>
              ))}
              {incidents.length === 0 && <p className="empty-text">Açık incident kaydı yok.</p>}
            </div>
          </div>
        </div>
        <div className="sa-card">
          <div className="sa-panel-header">
            <div>
              <span className="sa-kicker">Yönetişim</span>
              <h2>Operasyon adımları</h2>
            </div>
            <Network size={20} />
          </div>
          <div className="sa-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="sa-release-step">
              <CheckCircle2 size={18} />
              <span>Platform sağlığı</span>
              <strong>{statusLabel(systemMetrics?.health ?? "loading")}</strong>
            </div>
            <div className="sa-release-step">
              <CheckCircle2 size={18} />
              <span>Kapasite izlemesi</span>
              <strong>{statusLabel(resources.some((m) => m.status !== "healthy") ? "warning" : "healthy")}</strong>
            </div>
            <div className="sa-release-step">
              <CheckCircle2 size={18} />
              <span>Servis sürekliliği</span>
              <strong>{statusLabel(services.some((s) => s.status !== "healthy") ? "warning" : "healthy")}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="sa-two-col">
        <div className="sa-card">
          <div className="sa-panel-header">
            <div>
              <span className="sa-kicker">Kaynak dağılımı</span>
              <h2>Sunucu yükü dağılımı</h2>
            </div>
            <Gauge size={20} />
          </div>
          <div className="sa-card-body">
            <div className="sa-chart-frame" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={pieData[i].name} fill={chartPalette[i % chartPalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}%`, "Kullanım"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="sa-card">
          <div className="sa-panel-header">
            <div>
              <span className="sa-kicker">Servis gecikmesi</span>
              <h2>Yanıt süresi (ms)</h2>
            </div>
          </div>
          <div className="sa-card-body">
            <div className="sa-chart-frame" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyData.length > 0 ? latencyData : [{ name: "-", ms: 0 }]} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e2" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#919a9f" }} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10, fill: "#919a9f" }} />
                  <Tooltip />
                  <Bar dataKey="ms" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="ms" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="sa-two-col">
        <div className="sa-card">
          <div className="sa-panel-header">
            <div>
              <span className="sa-kicker">Operasyon</span>
              <h2>Anlık görünüm</h2>
            </div>
            <ServerCog size={20} />
          </div>
          <div className="sa-card-body">
            <div className="sa-chip-row">
              <div className="sa-stat-mini">
                <span>Uyarılı servis</span>
                <strong>{warningServices}</strong>
              </div>
              <div className="sa-stat-mini">
                <span>Ortalama kaynak %</span>
                <strong>{avgResource}</strong>
              </div>
              <div className="sa-stat-mini">
                <span>Açık iş</span>
                <strong>{incidents.length}</strong>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--sa-muted)", lineHeight: 1.45 }}>
              Grafikler gerçek zamanlı API verisini yansıtır; servis gecikmesi ve kaynak dağılımı alt kartlarda detaylanır.
            </p>
          </div>
        </div>

        <div className="sa-card">
          <div className="sa-panel-header">
            <div>
              <span className="sa-kicker">Eğitim KPI</span>
              <h2>Yol haritası</h2>
            </div>
            <GraduationCap size={20} />
          </div>
          <div className="sa-card-body">
            <ul className="sa-list-plain">
              <li>
                <span>Bu çeyrek onboarding</span>
                <strong>12 kurum</strong>
              </li>
              <li>
                <span>Yayın planı</span>
                <strong>2 modül</strong>
              </li>
              <li>
                <span>Destek SLA</span>
                <strong>&lt; 2 saat</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
