import { Activity, Building2, Headset, ServerCog, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { SystemOperationsPanel } from "../overview/SystemOperationsPanel";
import { StatusBadge } from "../components/StatusBadge";
import { initials } from "../utils/institutionHelpers";
import { roleLabel, statusLabel } from "../utils/labels";
import type { Institution, PlatformSettings, SuperAdminOverview, SupportTicket, SystemMetrics, UserAccount } from "../../lib/api";
import "./OverviewPage.css";

const OPEN_TICKET_STATUSES = new Set(["open", "in_review", "planned"]);
const CHART_TOOLTIP = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#0f172a",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)"
};

function formatActivity(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function OverviewPage({
  overview,
  systemMetrics,
  institutions = [],
  users = [],
  supportTickets = [],
  settings
}: {
  overview?: SuperAdminOverview;
  systemMetrics?: SystemMetrics;
  institutions?: Institution[];
  users?: UserAccount[];
  supportTickets?: SupportTicket[];
  settings?: PlatformSettings;
}) {
  const institutionCount = institutions.length || overview?.institutions || 0;
  const userCount = users.length || overview?.activeUsers || 0;
  const pendingPassword = users.filter((user) => user.mustChangePassword).length;
  const openTickets = supportTickets.filter((ticket) => OPEN_TICKET_STATUSES.has(ticket.status));
  const health = systemMetrics?.health ?? overview?.systemHealth;
  const usage = (overview?.usage ?? []).map((point) => ({ name: point.label, value: point.value }));
  const hasUsage = usage.some((point) => point.value > 0);
  const recentInstitutions = [...institutions]
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
    .slice(0, 5);
  const roleRows = Object.entries(
    users.reduce<Record<string, number>>((acc, user) => {
      acc[user.role] = (acc[user.role] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const roleMax = roleRows[0]?.[1] ?? 0;
  const updatedAt = systemMetrics?.updatedAt ? formatActivity(systemMetrics.updatedAt) : "";

  return (
    <section className="ov">
      <header className="ov-hero">
        <div>
          <p className="ov-kicker">Platform</p>
          <h1>Genel bakış</h1>
        </div>
        <div className="ov-hero-meta">
          {settings?.maintenance.enabled ? <span className="ov-pill ov-pill--warn">Bakım açık</span> : null}
          {health ? (
            <span className={`ov-pill ov-pill--${health}`}>
              Sistem {statusLabel(health).toLocaleLowerCase("tr-TR")}
            </span>
          ) : null}
          {updatedAt ? <span className="ov-pill">Güncellendi {updatedAt}</span> : null}
        </div>
      </header>

      <div className="ov-kpi-grid">
        <Link className="ov-kpi" to="/admin/institutions">
          <div className="ov-kpi-icon">
            <Building2 size={18} />
          </div>
          <span>Kurum</span>
          <strong>{institutionCount}</strong>
          <small>{institutions.filter((item) => item.status === "active").length} aktif tenant</small>
        </Link>
        <Link className="ov-kpi" to="/admin/users">
          <div className="ov-kpi-icon ov-kpi-icon--violet">
            <UsersRound size={18} />
          </div>
          <span>Kullanıcı</span>
          <strong>{userCount}</strong>
          <small>{pendingPassword > 0 ? `${pendingPassword} ilk giriş bekliyor` : "Aktif hesaplar"}</small>
        </Link>
        <Link className="ov-kpi" to="/admin/support">
          <div className="ov-kpi-icon ov-kpi-icon--amber">
            <Headset size={18} />
          </div>
          <span>Açık destek</span>
          <strong>{openTickets.length}</strong>
          <small>{supportTickets.length} toplam talep</small>
        </Link>
        <div className="ov-kpi">
          <div className="ov-kpi-icon ov-kpi-icon--green">
            <ServerCog size={18} />
          </div>
          <span>Altyapı</span>
          <strong>{health ? statusLabel(health) : "—"}</strong>
          <small>{systemMetrics?.services.length ?? 0} izlenen servis</small>
        </div>
      </div>

      <div className="ov-grid">
        {hasUsage ? (
          <article className="ov-card ov-card--chart">
            <div className="ov-card-head">
              <div>
                <span>Aktivite</span>
                <h2>Son 7 gün işlem</h2>
              </div>
              <Activity size={18} />
            </div>
            <div className="ov-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usage} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ovUsageFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                  <Tooltip contentStyle={CHART_TOOLTIP} />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fill="url(#ovUsageFill)" name="İşlem" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        ) : null}

        {systemMetrics ? (
          <article className="ov-card">
            <div className="ov-card-head">
              <div>
                <span>Canlı izleme</span>
                <h2>Altyapı durumu</h2>
              </div>
              <ServerCog size={18} />
            </div>
            <SystemOperationsPanel metrics={systemMetrics} />
          </article>
        ) : null}
      </div>

      <div className="ov-grid ov-grid--three">
        {recentInstitutions.length > 0 ? (
          <article className="ov-card">
            <div className="ov-card-head">
              <div>
                <span>Kurumlar</span>
                <h2>Son hareket</h2>
              </div>
              <Link to="/admin/institutions">Tümü</Link>
            </div>
            <ul className="ov-list">
              {recentInstitutions.map((institution) => (
                <li key={institution.id}>
                  <Link className="ov-row" to={`/admin/institutions/${institution.id}`}>
                    <span className="ov-avatar">{initials(institution.name)}</span>
                    <div>
                      <strong>{institution.name}</strong>
                      <small>
                        {institution.students} öğrenci · {institution.users} kullanıcı
                      </small>
                    </div>
                    <StatusBadge value={institution.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        {roleRows.length > 0 ? (
          <article className="ov-card">
            <div className="ov-card-head">
              <div>
                <span>Dağılım</span>
                <h2>Roller</h2>
              </div>
              <Link to="/admin/users">Tümü</Link>
            </div>
            <ul className="ov-roles">
              {roleRows.map(([role, count]) => (
                <li key={role}>
                  <div className="ov-role-meta">
                    <span>{roleLabel(role)}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="ov-role-track">
                    <div className="ov-role-fill" style={{ width: `${roleMax > 0 ? (count / roleMax) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        <article className="ov-card">
          <div className="ov-card-head">
            <div>
              <span>Destek</span>
              <h2>Açık talepler</h2>
            </div>
            <Link to="/admin/support">Tümü</Link>
          </div>
          {openTickets.length > 0 ? (
            <ul className="ov-list">
              {openTickets.slice(0, 5).map((ticket) => (
                <li key={ticket.id}>
                  <div className="ov-row">
                    <div>
                      <strong>{ticket.subject}</strong>
                      <small>
                        {ticket.tenant} · {ticket.reporterName}
                      </small>
                    </div>
                    <StatusBadge value={ticket.priority || ticket.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ov-empty">Açık destek talebi yok.</p>
          )}
        </article>
      </div>
    </section>
  );
}
