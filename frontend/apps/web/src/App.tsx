import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Blocks,
  Bot,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  CircuitBoard,
  Clipboard,
  Database,
  DatabaseZap,
  FileClock,
  Gauge,
  Globe2,
  GraduationCap,
  Flag,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquare,
  Network,
  Pencil,
  Plus,
  Power,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Send,
  Trash2,
  UserCog,
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
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AuditEntry,
  AuthSession,
  CreatedUserCredential,
  IntegrationCredential,
  Institution,
  InstitutionDetail,
  ModuleStatus,
  PlatformSettings,
  ResourceMetric,
  ServiceMetric,
  SuperAdminOverview,
  SupportTicket,
  SystemMetrics,
  SystemStatus,
  UserAccount,
  api,
  clearAuthSession,
  readAuthSession,
  storeAuthSession
} from "./lib/api";

const chartPalette = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9"];

type SuperAdminState = {
  overview?: SuperAdminOverview;
  institutions?: Institution[];
  users?: UserAccount[];
  auditLogs?: AuditEntry[];
  settings?: PlatformSettings;
  supportTickets?: SupportTicket[];
  systemMetrics?: SystemMetrics;
};

type AdminTab = "overview" | "institutions" | "users" | "support" | "logs" | "modules" | "settings";

const tabs: Array<{ id: AdminTab; label: string; icon: ReactNode }> = [
  { id: "overview", label: "Genel", icon: <LayoutDashboard size={18} /> },
  { id: "institutions", label: "Kurumlar", icon: <Building2 size={18} /> },
  { id: "users", label: "Kullanıcılar", icon: <UsersRound size={18} /> },
  { id: "support", label: "Destek", icon: <LifeBuoy size={18} /> },
  { id: "logs", label: "Loglar", icon: <FileClock size={18} /> },
  { id: "modules", label: "Modüller", icon: <Blocks size={18} /> },
  { id: "settings", label: "Ayarlar", icon: <Settings2 size={18} /> }
];

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    api.systemStatus()
      .then(setSystemStatus)
      .catch(() => setSystemStatus(null));
  }, []);

  if (!session) {
    if (systemStatus?.maintenance.enabled && !showAdminLogin) {
      return <MaintenancePage status={systemStatus} onAdminLogin={() => setShowAdminLogin(true)} />;
    }
    return <LoginPage onLogin={setSession} />;
  }

  if (systemStatus?.maintenance.enabled && session.principal.role !== "super_admin") {
    return <MaintenancePage status={systemStatus} onLogout={() => handleLogout(setSession)} />;
  }

  if (session.principal.mustChangePassword) {
    return <FirstLoginPasswordPage session={session} onSessionUpdated={setSession} onLogout={() => handleLogout(setSession)} />;
  }

  if (session.principal.role === "super_admin") {
    return <SuperAdminConsole session={session} onLogout={() => handleLogout(setSession)} onSystemStatusChange={setSystemStatus} />;
  }

  return <RoleFallback session={session} onLogout={() => handleLogout(setSession)} />;
}

function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState("superadmin@ots.local");
  const [password, setPassword] = useState("OtsAdmin!2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await api.login({ email, password });
      storeAuthSession(session);
      onLogin(session);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="ÖTS">
        <div className="login-mark">
          <GraduationCap size={38} />
        </div>
        <p>ÖTS</p>
        <h1>Akıllı Okul Yönetim Sistemi</h1>
      </section>

      <section className="login-panel" aria-label="Giriş">
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <div className="form-heading">
            <span>Süper admin</span>
            <h2>Giriş yap</h2>
          </div>

          {error && <div className="form-error">{error}</div>}

          <label className="field">
            <span>E-posta</span>
            <div className="field-control">
              <Mail size={18} />
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
            </div>
          </label>

          <label className="field">
            <span>Şifre</span>
            <div className="field-control">
              <LockKeyhole size={18} />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
            </div>
          </label>

          <button className="primary-action" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
            Giriş yap
          </button>
        </form>
      </section>
    </main>
  );
}

function MaintenancePage({ status, onAdminLogin, onLogout }: { status: SystemStatus; onAdminLogin?: () => void; onLogout?: () => void }) {
  return (
    <main className="maintenance-page">
      <section className="maintenance-panel">
        <div className="maintenance-icon">
          <Power size={34} />
        </div>
        <span className="section-kicker">Bakım modu</span>
        <h1>Bakımdayız</h1>
        <p>{status.maintenance.message}</p>
        <div className="maintenance-actions">
          {onAdminLogin && (
            <button className="ghost-action" type="button" onClick={onAdminLogin}>
              <KeyRound size={18} />
              Süper admin girişi
            </button>
          )}
          {onLogout && (
            <button className="ghost-action" type="button" onClick={onLogout}>
              <LogOut size={18} />
              Çıkış
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function FirstLoginPasswordPage({
  session,
  onSessionUpdated,
  onLogout
}: {
  session: AuthSession;
  onSessionUpdated: (session: AuthSession) => void;
  onLogout: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Şifre tekrarı aynı olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const updatedSession = await api.changePassword({ newPassword });
      storeAuthSession(updatedSession);
      onSessionUpdated(updatedSession);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Şifre güncellenemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="first-login-page">
      <section className="password-reset-panel">
        <div className="login-mark reset-mark">
          <KeyRound size={32} />
        </div>
        <div className="form-heading">
          <span>İlk giriş</span>
          <h2>Şifreni belirle</h2>
        </div>
        <p>{session.principal.email} hesabı için geçici şifreyi kalıcı bir şifreyle değiştir.</p>

        {error && <div className="form-error">{error}</div>}

        <form className="reset-form" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>Yeni şifre</span>
            <div className="field-control">
              <LockKeyhole size={18} />
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
              />
            </div>
          </label>
          <label className="field">
            <span>Yeni şifre tekrar</span>
            <div className="field-control">
              <ShieldCheck size={18} />
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
              />
            </div>
          </label>
          <div className="form-actions">
            <button className="primary-action" type="submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
              Şifreyi kaydet
            </button>
            <button className="ghost-action" type="button" onClick={onLogout}>
              <LogOut size={18} />
              Çıkış
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function SuperAdminConsole({
  session,
  onLogout,
  onSystemStatusChange
}: {
  session: AuthSession;
  onLogout: () => void;
  onSystemStatusChange: (status: SystemStatus) => void;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [state, setState] = useState<SuperAdminState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [overview, systemMetrics, institutions, users, auditLogs, settings, supportTickets] = await Promise.all([
        api.superAdminOverview(),
        api.superAdminSystemMetrics(),
        api.superAdminInstitutions(),
        api.superAdminUsers(),
        api.superAdminAuditLogs(),
        api.superAdminSettings(),
        api.superAdminSupportTickets()
      ]);
      setState({ overview, systemMetrics, institutions, users, auditLogs, settings, supportTickets });
      onSystemStatusChange({ maintenance: settings.maintenance });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Süper admin verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshSystemMetrics() {
    try {
      const systemMetrics = await api.superAdminSystemMetrics();
      setState((current) => ({ ...current, systemMetrics }));
    } catch {
      // Overview metrics are refreshed opportunistically; the main load error already covers hard failures.
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (activeTab !== "overview") {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshSystemMetrics();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [activeTab]);

  return (
    <div className="admin-shell">
      <header className="admin-navbar">
        <div className="navbar-brand">
          <div className="admin-mark">
            <GraduationCap size={22} />
          </div>
          <div>
            <strong>ÖTS</strong>
            <span>Platform Admin</span>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="navbar-profile" aria-label="Profil">
            <div className="profile-avatar">{session.principal.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</div>
            <div className="navbar-profile-text">
              <strong>{session.principal.name}</strong>
              <span>{session.principal.email}</span>
            </div>
          </div>
          <button className="ghost-action navbar-logout" type="button" onClick={onLogout}>
            <LogOut size={17} />
            Çıkış
          </button>
        </div>
      </header>

      <aside className="admin-sidebar">
        <nav className="admin-nav" aria-label="Süper admin menüsü">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "nav-button active" : "nav-button"}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="developer-note">
          <ServerCog size={18} />
          <div>
            <strong>Yazılımcı alanı</strong>
            <span>Tenant, rol, log ve modül denetimi.</span>
          </div>
        </div>
      </aside>

      <main className={`admin-workspace ${activeTab}-workspace`}>
        <div className="sa-main">
          {activeTab !== "overview" && (
            <header className="sa-page-header">
              <div>
                <span className="sa-kicker">Süper admin</span>
                <h1>{pageTitle(activeTab)}</h1>
                <p>{pageDescription(activeTab)}</p>
              </div>
            </header>
          )}

          {error && <div className="form-error workspace-error sa-alert">{error}</div>}
          {loading && (
            <div className="loading-line">
              <Loader2 className="spin" size={18} />
              Veriler hazırlanıyor
            </div>
          )}

          {activeTab === "overview" && <OverviewPage overview={state.overview} systemMetrics={state.systemMetrics} />}
          {activeTab === "institutions" && <InstitutionsPage institutions={state.institutions ?? []} onRefresh={load} />}
          {activeTab === "users" && <UsersPage users={state.users ?? []} institutions={state.institutions ?? []} onRefresh={load} />}
          {activeTab === "support" && <SupportPage tickets={state.supportTickets ?? []} onRefresh={load} />}
          {activeTab === "logs" && <LogsPage auditLogs={state.auditLogs ?? []} />}
          {activeTab === "modules" && <ModulesPage modules={state.overview?.modules ?? []} />}
          {activeTab === "settings" && (
            <SettingsPage settings={state.settings} onRefresh={load} onSystemStatusChange={onSystemStatusChange} />
          )}
        </div>
      </main>
    </div>
  );
}

function OverviewPage({ overview, systemMetrics }: { overview?: SuperAdminOverview; systemMetrics?: SystemMetrics }) {
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

function SystemOperationsPanel({ metrics }: { metrics?: SystemMetrics }) {
  const resources = metrics?.resources ?? [];
  const services = metrics?.services ?? [];
  const displayResources =
    resources.length > 0
      ? resources
      : [
          { key: "cpu", label: "CPU", value: 0, unit: "%", status: "loading", description: "Yükleniyor" },
          { key: "ram", label: "RAM", value: 0, unit: "%", status: "loading", description: "Yükleniyor" },
          { key: "disk", label: "Disk", value: 0, unit: "%", status: "loading", description: "Yükleniyor" },
          { key: "heap", label: "API Heap", value: 0, unit: "%", status: "loading", description: "Yükleniyor" }
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
        {services.length === 0 && <p className="empty-text" style={{ paddingTop: 8 }}>Servis metrikleri yükleniyor.</p>}
      </div>
    </div>
  );
}

function ResourceBar({ metric }: { metric: ResourceMetric }) {
  const value = Math.max(0, Math.min(100, Math.round(metric.value)));
  const barClass = metric.status === "loading" ? "sa-bar-fill--loading" : value > 85 ? "sa-bar-fill--critical" : value > 60 ? "sa-bar-fill--warn" : "sa-bar-fill--ok";
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

function InstitutionsPage({ institutions, onRefresh }: { institutions: Institution[]; onRefresh: () => Promise<void> }) {
  const totalStudents = institutions.reduce((sum, institution) => sum + institution.students, 0);
  const totalUsers = institutions.reduce((sum, institution) => sum + institution.users, 0);
  const [selectedId, setSelectedId] = useState<string | null>(institutions[0]?.id ?? null);
  const [detail, setDetail] = useState<InstitutionDetail | null>(null);
  const [institutionUsers, setInstitutionUsers] = useState<UserAccount[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showCreateInstitution, setShowCreateInstitution] = useState(false);
  const [createInstitutionForm, setCreateInstitutionForm] = useState({ name: "", plan: "MVP", timezone: "Europe/Istanbul" });
  const [createUserForm, setCreateUserForm] = useState({ email: "", fullName: "", role: "principal" });
  const [credential, setCredential] = useState<CreatedUserCredential | null>(null);
  const [savingInstitution, setSavingInstitution] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  async function loadInstitutionDetail(institutionId: string) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [institutionDetail, users] = await Promise.all([
        api.superAdminInstitution(institutionId),
        api.superAdminInstitutionUsers(institutionId)
      ]);
      setDetail(institutionDetail);
      setInstitutionUsers(users);
    } catch (loadError) {
      setDetail(null);
      setInstitutionUsers([]);
      setDetailError(loadError instanceof Error ? loadError.message : "Kurum detayları alınamadı.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function createInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingInstitution(true);
    setDetailError(null);
    try {
      const created = await api.createSuperAdminInstitution(createInstitutionForm);
      setCreateInstitutionForm({ name: "", plan: "MVP", timezone: "Europe/Istanbul" });
      setShowCreateInstitution(false);
      setSelectedId(created.id);
      await onRefresh();
      await loadInstitutionDetail(created.id);
    } catch (createError) {
      setDetailError(createError instanceof Error ? createError.message : "Kurum oluşturulamadı.");
    } finally {
      setSavingInstitution(false);
    }
  }

  async function createInstitutionUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) {
      return;
    }
    setSavingUser(true);
    setDetailError(null);
    setCredential(null);
    try {
      const created = await api.createSuperAdminInstitutionUser(selectedId, createUserForm);
      setCredential(created);
      setCreateUserForm({ email: "", fullName: "", role: "principal" });
      const users = await api.superAdminInstitutionUsers(selectedId);
      setInstitutionUsers(users);
      await onRefresh();
    } catch (createError) {
      setDetailError(createError instanceof Error ? createError.message : "Kullanıcı oluşturulamadı.");
    } finally {
      setSavingUser(false);
    }
  }

  useEffect(() => {
    if (!selectedId && institutions[0]) {
      setSelectedId(institutions[0].id);
    }
  }, [institutions, selectedId]);

  useEffect(() => {
    if (selectedId) {
      void loadInstitutionDetail(selectedId);
    }
  }, [selectedId]);

  return (
    <section className="sa-page-stack">
      <div className="sa-tenant-top">
        <div className="sa-card">
          <PanelHeader
            kicker="Tenant haritası"
            title="Kurum ağı"
            icon={<Building2 size={22} />}
            trailing={
              <button className="primary-action small-action" type="button" onClick={() => setShowCreateInstitution((value) => !value)}>
                <Plus size={17} />
                Kurum oluştur
              </button>
            }
          />
          <div className="sa-card-body">
            <div className="tenant-map-flex">
              {institutions.map((institution) => (
                <button
                  className={`tenant-chip ${selectedId === institution.id ? "selected" : ""}`}
                  key={institution.id}
                  type="button"
                  onClick={() => setSelectedId(institution.id)}
                >
                  <Building2 size={18} />
                  <strong>{institution.name}</strong>
                  <span>{institution.students} öğrenci</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sa-insights" style={{ gap: 10 }}>
          <MiniStat label="Toplam öğrenci" value={totalStudents} icon={<GraduationCap size={19} />} />
          <MiniStat label="Toplam kullanıcı" value={totalUsers} icon={<UsersRound size={19} />} />
          <MiniStat label="Aktif kurum" value={institutions.filter((item) => item.status === "active").length} icon={<CheckCircle2 size={19} />} />
        </div>
      </div>

      {showCreateInstitution && (
        <section className="sa-card">
          <PanelHeader kicker="Yeni tenant" title="Kurum oluştur" icon={<Building2 size={22} />} />
          <div className="sa-card-body">
            <form className="inline-form sa-form-grid-four" onSubmit={(event) => void createInstitution(event)}>
              <label className="field">
                <span>Kurum adı</span>
                <div className="field-control">
                  <Building2 size={17} />
                  <input
                    value={createInstitutionForm.name}
                    onChange={(event) => setCreateInstitutionForm((form) => ({ ...form, name: event.target.value }))}
                    placeholder="Örn. Özel Deniz Koleji"
                    required
                  />
                </div>
              </label>
              <label className="field">
                <span>Plan</span>
                <div className="field-control">
                  <Database size={17} />
                  <select value={createInstitutionForm.plan} onChange={(event) => setCreateInstitutionForm((form) => ({ ...form, plan: event.target.value }))}>
                    <option value="MVP">MVP</option>
                    <option value="Starter">Starter</option>
                    <option value="Growth">Growth</option>
                    <option value="Premium">Premium</option>
                    <option value="Trial">Trial</option>
                  </select>
                </div>
              </label>
              <label className="field">
                <span>Zaman dilimi</span>
                <div className="field-control">
                  <Globe2 size={17} />
                  <input value={createInstitutionForm.timezone} onChange={(event) => setCreateInstitutionForm((form) => ({ ...form, timezone: event.target.value }))} />
                </div>
              </label>
              <button className="primary-action form-submit" type="submit" disabled={savingInstitution}>
                {savingInstitution ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                Kaydet
              </button>
            </form>
          </div>
        </section>
      )}

      {detailError && <div className="form-error workspace-error sa-alert">{detailError}</div>}

      <section className="sa-card">
        <PanelHeader kicker="Tenant yönetimi" title="Kurumlar" icon={<Building2 size={22} />} />
        <div className="sa-card-body">
          <div className="sa-data-grid">
            <div className="sa-row-head sa-institutions-head">
              <span>Kurum</span>
              <span>Plan</span>
              <span>Öğrenci</span>
              <span>Kullanıcı</span>
              <span>Durum</span>
              <span>İşlem</span>
            </div>
            {institutions.map((institution) => (
              <div
                className={`sa-row-body sa-institutions-row ${selectedId === institution.id ? "sa-row-selected" : ""}`}
                key={institution.id}
              >
                <div className="sa-row-body-cell">
                  <strong>{institution.name}</strong>
                  <small>
                    {institution.timezone} · son aktivite {new Date(institution.lastActivityAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </small>
                </div>
                <span>{institution.plan}</span>
                <span>{institution.students}</span>
                <span>{institution.users}</span>
                <StatusBadge value={institution.status} />
                <button className="sa-icon-btn" type="button" onClick={() => setSelectedId(institution.id)} aria-label={`${institution.name} detay`}>
                  <ArrowUpRight size={17} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="sa-split">
        <section className="sa-card">
          <PanelHeader
            kicker="Kurum detayı"
            title={detail?.name ?? "Kurum seç"}
            icon={detailLoading ? <Loader2 className="spin" size={20} /> : <Building2 size={22} />}
          />
          <div className="sa-card-body">
            {detail ? (
              <div className="detail-meta-grid">
                <MiniStat label="Plan" value={detail.plan} icon={<DatabaseZap size={19} />} />
                <MiniStat label="Kullanıcı" value={institutionUsers.length} icon={<UsersRound size={19} />} />
                <MiniStat label="Öğrenci" value={detail.students} icon={<GraduationCap size={19} />} />
                <MiniStat label="Durum" value={statusLabel(detail.status)} icon={<CheckCircle2 size={19} />} />
              </div>
            ) : (
              <p className="empty-text">Detay görmek için bir kurum seç.</p>
            )}
            {detail && (
              <div className="meta-line">
                <span>ID: {detail.id}</span>
                <span>Timezone: {detail.timezone}</span>
                <span>Oluşturma: {new Date(detail.createdAt).toLocaleDateString("tr-TR")}</span>
                <span>Güncelleme: {new Date(detail.updatedAt).toLocaleDateString("tr-TR")}</span>
              </div>
            )}
          </div>
        </section>

        <section className="sa-card">
          <PanelHeader kicker="Kurum kişileri" title="Kullanıcılar" icon={<UsersRound size={22} />} />
          <div className="sa-card-body">
            <form className="inline-form sa-user-create-grid" onSubmit={(event) => void createInstitutionUser(event)}>
              <label className="field">
                <span>E-posta</span>
                <div className="field-control">
                  <Mail size={17} />
                  <input
                    value={createUserForm.email}
                    onChange={(event) => setCreateUserForm((form) => ({ ...form, email: event.target.value }))}
                    type="email"
                    placeholder="kullanici@kurum.com"
                    required
                  />
                </div>
              </label>
              <label className="field">
                <span>Ad soyad</span>
                <div className="field-control">
                  <UserCog size={17} />
                  <input
                    value={createUserForm.fullName}
                    onChange={(event) => setCreateUserForm((form) => ({ ...form, fullName: event.target.value }))}
                    placeholder="Boş bırakılırsa mailden üretilir"
                  />
                </div>
              </label>
              <label className="field">
                <span>Rol</span>
                <div className="field-control">
                  <ShieldCheck size={17} />
                  <select value={createUserForm.role} onChange={(event) => setCreateUserForm((form) => ({ ...form, role: event.target.value }))}>
                    <option value="principal">Müdür</option>
                    <option value="guidance">Rehberlik</option>
                    <option value="teacher">Öğretmen</option>
                    <option value="guardian">Veli</option>
                  </select>
                </div>
              </label>
              <button className="primary-action form-submit" type="submit" disabled={!selectedId || savingUser}>
                {savingUser ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                Kullanıcı oluştur
              </button>
            </form>

            {credential && (
              <div className="sa-credential-banner">
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sa-muted)", textTransform: "uppercase" }}>Geçici giriş bilgisi</span>
                  <strong>{credential.user.email}</strong>
                  <code>{credential.temporaryPassword}</code>
                </div>
                <button className="ghost-action" type="button" onClick={() => void navigator.clipboard?.writeText(`${credential.user.email} / ${credential.temporaryPassword}`)}>
                  <Clipboard size={17} />
                  Kopyala
                </button>
              </div>
            )}

            <div className="sa-data-grid">
              <div className="sa-row-head sa-users-mini-head">
                <span>Kullanıcı</span>
                <span>Kurum</span>
                <span>Rol</span>
                <span>Durum</span>
                <span>İşlem</span>
              </div>
              {institutionUsers.map((user) => (
                <div className="sa-row-body sa-users-mini-row" key={user.id}>
                  <div className="sa-row-body-cell">
                    <strong>{user.fullName}</strong>
                    <small>{user.email}</small>
                  </div>
                  <span>{user.tenant}</span>
                  <span>{roleLabel(user.role)}</span>
                  <StatusBadge value={user.status} />
                  <button className="sa-icon-btn" type="button" aria-label={`${user.fullName} detay`}>
                    <ArrowUpRight size={17} />
                  </button>
                </div>
              ))}
              {institutionUsers.length === 0 && <p className="empty-text">Bu kuruma bağlı kullanıcı yok.</p>}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function UsersPage({ users, institutions, onRefresh }: { users: UserAccount[]; institutions: Institution[]; onRefresh: () => Promise<void> }) {
  const roles = Array.from(new Set(users.map((user) => user.role)));
  const [query, setQuery] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ tenantId: institutions[0]?.id ?? "", email: "", fullName: "", role: "principal" });
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(users[0] ?? null);
  const [editForm, setEditForm] = useState({ tenantId: "", email: "", fullName: "", role: "principal", status: "active" });
  const [credential, setCredential] = useState<CreatedUserCredential | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const activeUsers = users.filter((user) => user.status === "active").length;
  const firstLoginUsers = users.filter((user) => user.mustChangePassword).length;
  const filteredUsers = users.filter((user) => {
    const value = `${user.fullName} ${user.email} ${user.tenant} ${user.role} ${user.status}`.toLowerCase();
    return value.includes(query.toLowerCase().trim());
  });
  const protectedSelection = selectedUser?.role === "super_admin";

  async function createGlobalUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCreate(true);
    setUserError(null);
    setCredential(null);
    try {
      const created = await api.createSuperAdminUser(createForm);
      setCredential(created);
      setSelectedUser(created.user);
      setShowCreateUser(false);
      setCreateForm((form) => ({ ...form, email: "", fullName: "", role: "principal" }));
      await onRefresh();
    } catch (createError) {
      setUserError(createError instanceof Error ? createError.message : "Kullanıcı oluşturulamadı.");
    } finally {
      setSavingCreate(false);
    }
  }

  async function updateGlobalUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || protectedSelection) {
      return;
    }
    setSavingEdit(true);
    setUserError(null);
    try {
      const updated = await api.updateSuperAdminUser(selectedUser.id, editForm);
      setSelectedUser(updated);
      await onRefresh();
    } catch (updateError) {
      setUserError(updateError instanceof Error ? updateError.message : "Kullanıcı güncellenemedi.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteGlobalUser(user: UserAccount) {
    if (user.role === "super_admin") {
      setUserError("Süper admin hesabı silinemez.");
      return;
    }
    const confirmed = window.confirm(`${user.fullName} hesabı pasifleştirilsin mi?`);
    if (!confirmed) {
      return;
    }
    setSavingEdit(true);
    setUserError(null);
    try {
      const updated = await api.deleteSuperAdminUser(user.id, user.tenantId);
      setSelectedUser(updated);
      await onRefresh();
    } catch (deleteError) {
      setUserError(deleteError instanceof Error ? deleteError.message : "Kullanıcı silinemedi.");
    } finally {
      setSavingEdit(false);
    }
  }

  useEffect(() => {
    if (!createForm.tenantId && institutions[0]) {
      setCreateForm((form) => ({ ...form, tenantId: institutions[0].id }));
    }
  }, [createForm.tenantId, institutions]);

  useEffect(() => {
    if (!selectedUser && users[0]) {
      setSelectedUser(users[0]);
      return;
    }
    if (selectedUser) {
      const fresh = users.find((user) => user.id === selectedUser.id && user.tenantId === selectedUser.tenantId);
      if (fresh && fresh !== selectedUser) {
        setSelectedUser(fresh);
      }
    }
  }, [users, selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }
    setEditForm({
      tenantId: selectedUser.tenantId,
      email: selectedUser.email,
      fullName: selectedUser.fullName,
      role: selectedUser.role === "super_admin" ? "principal" : selectedUser.role,
      status: selectedUser.status === "passive" ? "passive" : "active"
    });
  }, [selectedUser]);

  return (
    <section className="sa-page-stack">
      <div className="sa-kpi-mini-row">
        <MiniStat label="Toplam kullanıcı" value={users.length} icon={<UsersRound size={19} />} />
        <MiniStat label="Aktif hesap" value={activeUsers} icon={<CheckCircle2 size={19} />} />
        <MiniStat label="İlk giriş bekleyen" value={firstLoginUsers} icon={<KeyRound size={19} />} />
        <MiniStat label="Kurum kapsamı" value={institutions.length} icon={<Building2 size={19} />} />
        {roles.slice(0, 4).map((role) => (
          <div className="sa-role-mini" key={role}>
            <div className="sa-role-icon">
              <UserCog size={17} />
            </div>
            <div>
              <strong>{roleLabel(role)}</strong>
              <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--sa-muted)" }}>
                {users.filter((user) => user.role === role).length} hesap
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className="sa-card">
        <PanelHeader
          kicker="Global CRUD"
          title="Kurumdan bağımsız kullanıcı yönetimi"
          icon={<ShieldCheck size={22} />}
          trailing={
            <button className="primary-action small-action" type="button" onClick={() => setShowCreateUser((value) => !value)}>
              <Plus size={17} />
              Kullanıcı oluştur
            </button>
          }
        />
        <div className="sa-card-body">
          <div className="user-toolbar">
            <label className="field search-field">
              <span>Arama</span>
              <div className="field-control">
                <Search size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad, mail, kurum veya rol ara" />
              </div>
            </label>
          </div>

          {showCreateUser && (
            <form className="inline-form sa-form-grid-four sa-user-create-grid" onSubmit={(event) => void createGlobalUser(event)}>
              <label className="field">
                <span>Kurum</span>
                <div className="field-control">
                  <Building2 size={17} />
                  <select value={createForm.tenantId} onChange={(event) => setCreateForm((form) => ({ ...form, tenantId: event.target.value }))} required>
                    {institutions.map((institution) => (
                      <option value={institution.id} key={institution.id}>
                        {institution.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="field">
                <span>E-posta</span>
                <div className="field-control">
                  <Mail size={17} />
                  <input value={createForm.email} onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))} type="email" required />
                </div>
              </label>
              <label className="field">
                <span>Ad soyad</span>
                <div className="field-control">
                  <UserCog size={17} />
                  <input value={createForm.fullName} onChange={(event) => setCreateForm((form) => ({ ...form, fullName: event.target.value }))} />
                </div>
              </label>
              <label className="field">
                <span>Rol</span>
                <div className="field-control">
                  <ShieldCheck size={17} />
                  <select value={createForm.role} onChange={(event) => setCreateForm((form) => ({ ...form, role: event.target.value }))}>
                    <option value="principal">Müdür</option>
                    <option value="guidance">Rehberlik</option>
                    <option value="teacher">Öğretmen</option>
                    <option value="guardian">Veli</option>
                  </select>
                </div>
              </label>
              <button className="primary-action form-submit" type="submit" disabled={savingCreate || institutions.length === 0}>
                {savingCreate ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                Oluştur
              </button>
            </form>
          )}

          {credential && (
            <div className="sa-credential-banner" style={{ marginTop: 14 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sa-muted)", textTransform: "uppercase" }}>Geçici giriş bilgisi</span>
                <strong>{credential.user.email}</strong>
                <code>{credential.temporaryPassword}</code>
              </div>
              <button className="ghost-action" type="button" onClick={() => void navigator.clipboard?.writeText(`${credential.user.email} / ${credential.temporaryPassword}`)}>
                <Clipboard size={17} />
                Kopyala
              </button>
            </div>
          )}
        </div>
      </section>

      {userError && <div className="form-error workspace-error sa-alert">{userError}</div>}

      <section className="sa-split-main">
        <section className="sa-card">
          <PanelHeader kicker="Tüm kullanıcılar" title={`${filteredUsers.length} hesap`} icon={<UsersRound size={22} />} />
          <div className="sa-card-body">
            <div className="sa-data-grid">
              <div className="sa-row-head sa-users-global-head">
                <span>Kullanıcı</span>
                <span>Kurum</span>
                <span>Rol</span>
                <span>Durum</span>
                <span>İşlem</span>
              </div>
              {filteredUsers.map((user) => (
                <div
                  className={`sa-row-body sa-users-global-row ${selectedUser?.id === user.id && selectedUser?.tenantId === user.tenantId ? "sa-row-selected" : ""}`}
                  key={`${user.tenantId}-${user.id}`}
                >
                  <div className="sa-row-body-cell">
                    <strong>{user.fullName}</strong>
                    <small>{user.email}</small>
                  </div>
                  <span>{user.tenant}</span>
                  <span>{roleLabel(user.role)}</span>
                  <StatusBadge value={user.status} />
                  <div className="sa-row-actions">
                    <button className="sa-icon-btn" type="button" onClick={() => setSelectedUser(user)} aria-label={`${user.fullName} düzenle`}>
                      <Pencil size={16} />
                    </button>
                    <button className="sa-icon-btn danger" type="button" onClick={() => void deleteGlobalUser(user)} aria-label={`${user.fullName} sil`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && <p className="empty-text">Aramaya uygun kullanıcı bulunamadı.</p>}
            </div>
          </div>
        </section>

        <aside className="sa-card user-edit-pane">
          <PanelHeader kicker="Düzenleme" title={selectedUser?.fullName ?? "Kullanıcı seç"} icon={<UserCog size={22} />} />
          <div className="sa-card-body">
            {selectedUser ? (
              <form className="sa-form-stack" onSubmit={(event) => void updateGlobalUser(event)}>
                <label className="field">
                  <span>Kurum</span>
                  <div className="field-control">
                    <Building2 size={17} />
                    <select value={editForm.tenantId} onChange={(event) => setEditForm((form) => ({ ...form, tenantId: event.target.value }))} disabled={protectedSelection}>
                      {institutions.map((institution) => (
                        <option value={institution.id} key={institution.id}>
                          {institution.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="field">
                  <span>E-posta</span>
                  <div className="field-control">
                    <Mail size={17} />
                    <input value={editForm.email} onChange={(event) => setEditForm((form) => ({ ...form, email: event.target.value }))} type="email" disabled={protectedSelection} />
                  </div>
                </label>
                <label className="field">
                  <span>Ad soyad</span>
                  <div className="field-control">
                    <UserCog size={17} />
                    <input value={editForm.fullName} onChange={(event) => setEditForm((form) => ({ ...form, fullName: event.target.value }))} disabled={protectedSelection} />
                  </div>
                </label>
                <label className="field">
                  <span>Rol</span>
                  <div className="field-control">
                    <ShieldCheck size={17} />
                    <select value={editForm.role} onChange={(event) => setEditForm((form) => ({ ...form, role: event.target.value }))} disabled={protectedSelection}>
                      <option value="principal">Müdür</option>
                      <option value="guidance">Rehberlik</option>
                      <option value="teacher">Öğretmen</option>
                      <option value="guardian">Veli</option>
                    </select>
                  </div>
                </label>
                <label className="field">
                  <span>Durum</span>
                  <div className="field-control">
                    <CheckCircle2 size={17} />
                    <select value={editForm.status} onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))} disabled={protectedSelection}>
                      <option value="active">Aktif</option>
                      <option value="passive">Pasif</option>
                    </select>
                  </div>
                </label>
                {protectedSelection && <p className="empty-text">Süper admin hesabı sistem hesabıdır; bu ekranda değiştirilemez.</p>}
                <div className="form-actions sa-form-actions-split">
                  <button className="primary-action" type="submit" disabled={savingEdit || protectedSelection}>
                    {savingEdit ? <Loader2 className="spin" size={18} /> : <Pencil size={18} />}
                    Güncelle
                  </button>
                  <button className="ghost-action danger-text" type="button" onClick={() => void deleteGlobalUser(selectedUser)} disabled={savingEdit || protectedSelection}>
                    <Trash2 size={18} />
                    Pasifleştir
                  </button>
                </div>
              </form>
            ) : (
              <p className="empty-text">Düzenlemek için tablodan bir kullanıcı seç.</p>
            )}
          </div>
        </aside>
      </section>
    </section>
  );
}

function SupportPage({ tickets, onRefresh }: { tickets: SupportTicket[]; onRefresh: () => Promise<void> }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(tickets[0] ?? null);
  const [editForm, setEditForm] = useState({ status: "open", priority: "normal", internalNote: "" });
  const [saving, setSaving] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const openCount = tickets.filter((ticket) => ticket.status === "open").length;
  const reviewCount = tickets.filter((ticket) => ticket.status === "in_review").length;
  const urgentCount = tickets.filter((ticket) => ticket.priority === "urgent" || ticket.priority === "high").length;
  const filteredTickets = tickets.filter((ticket) => statusFilter === "all" || ticket.status === statusFilter);

  async function updateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket) {
      return;
    }
    setSaving(true);
    setSupportError(null);
    try {
      const updated = await api.updateSuperAdminSupportTicket(selectedTicket.id, editForm);
      setSelectedTicket(updated);
      await onRefresh();
    } catch (updateError) {
      setSupportError(updateError instanceof Error ? updateError.message : "Destek talebi güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!selectedTicket && tickets[0]) {
      setSelectedTicket(tickets[0]);
      return;
    }
    if (selectedTicket) {
      const fresh = tickets.find((ticket) => ticket.id === selectedTicket.id);
      if (fresh && fresh !== selectedTicket) {
        setSelectedTicket(fresh);
      }
    }
  }, [tickets, selectedTicket]);

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }
    setEditForm({
      status: selectedTicket.status,
      priority: selectedTicket.priority,
      internalNote: selectedTicket.internalNote ?? ""
    });
  }, [selectedTicket]);

  return (
    <section className="sa-page-stack">
      <section className="sa-kpi-row">
        <Metric icon={<Inbox size={21} />} label="Toplam talep" value={tickets.length} tone="sky" hint="ticket ve öneri" />
        <Metric icon={<MessageSquare size={21} />} label="Açık" value={openCount} tone="mint" hint="yanıt bekleyen" />
        <Metric icon={<Activity size={21} />} label="İncelemede" value={reviewCount} tone="amber" hint="destek ekibinde" />
        <Metric icon={<Flag size={21} />} label="Öncelikli" value={urgentCount} tone="coral" hint="yüksek/acil" />
      </section>

      <section className="sa-split">
        <section className="sa-card">
          <PanelHeader
            kicker="Destek merkezi"
            title="Şikayet, ticket, rapor ve öneriler"
            icon={<LifeBuoy size={22} />}
            trailing={
              <div className="sa-inline-controls">
                <StatusBadge value="open" />
                <StatusBadge value="in_review" />
              </div>
            }
          />
          <div className="sa-card-body">
            <div className="sa-inline-controls sa-support-filters">
              {[
                ["all", "Tümü"],
                ["open", "Açık"],
                ["in_review", "İncelemede"],
                ["resolved", "Çözüldü"],
                ["closed", "Kapalı"]
              ].map(([value, label]) => (
                <button className={`sa-chip ${statusFilter === value ? "is-active" : ""}`} key={value} type="button" onClick={() => setStatusFilter(value)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="sa-data-grid">
              <div className="sa-row-head sa-support-head">
                <span>Talep</span>
                <span>Kurum</span>
                <span>Tip</span>
                <span>Durum</span>
                <span>Öncelik</span>
              </div>
              {filteredTickets.map((ticket) => (
                <button
                  className={`sa-row-body sa-support-row support-ticket-row ${selectedTicket?.id === ticket.id ? "sa-row-selected" : ""}`}
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="support-ticket-cell">
                    <div className="sa-type-icon">{supportTypeIcon(ticket.type)}</div>
                    <div>
                      <strong>{ticket.subject}</strong>
                      <small>
                        {ticket.reporterName} · {new Date(ticket.createdAt).toLocaleString("tr-TR")}
                      </small>
                    </div>
                  </div>
                  <span>{ticket.tenant}</span>
                  <StatusBadge value={ticket.type} />
                  <StatusBadge value={ticket.status} />
                  <StatusBadge value={ticket.priority} />
                </button>
              ))}
              {filteredTickets.length === 0 && <p className="empty-text">Bu filtrede destek talebi yok.</p>}
            </div>
          </div>
        </section>

        <aside className="sa-card support-detail-pane">
          <PanelHeader kicker="İnceleme" title={selectedTicket?.subject ?? "Talep seç"} icon={<LifeBuoy size={22} />} />
          <div className="sa-card-body">
            {supportError && <div className="form-error workspace-error sa-alert">{supportError}</div>}
            {selectedTicket ? (
              <div className="sa-form-stack">
                <div className="sa-message-block">
                  <div className="sa-message-meta">
                    <span>{selectedTicket.reporterName}</span>
                    <strong>{selectedTicket.reporterEmail || selectedTicket.tenant}</strong>
                  </div>
                  <p>{selectedTicket.message}</p>
                </div>

                <form className="sa-form-stack" onSubmit={(event) => void updateTicket(event)}>
                  <label className="field">
                    <span>Durum</span>
                    <div className="field-control">
                      <CheckCircle2 size={17} />
                      <select value={editForm.status} onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))}>
                        <option value="open">Açık</option>
                        <option value="in_review">İncelemede</option>
                        <option value="resolved">Çözüldü</option>
                        <option value="closed">Kapalı</option>
                      </select>
                    </div>
                  </label>
                  <label className="field">
                    <span>Öncelik</span>
                    <div className="field-control">
                      <Flag size={17} />
                      <select value={editForm.priority} onChange={(event) => setEditForm((form) => ({ ...form, priority: event.target.value }))}>
                        <option value="low">Düşük</option>
                        <option value="normal">Normal</option>
                        <option value="high">Yüksek</option>
                        <option value="urgent">Acil</option>
                      </select>
                    </div>
                  </label>
                  <label className="field">
                    <span>İç not</span>
                    <textarea
                      value={editForm.internalNote}
                      onChange={(event) => setEditForm((form) => ({ ...form, internalNote: event.target.value }))}
                      rows={6}
                      placeholder="Destek ekibinin göreceği inceleme notu"
                    />
                  </label>
                  <button className="primary-action" type="submit" disabled={saving}>
                    {saving ? <Loader2 className="spin" size={18} /> : <Pencil size={18} />}
                    İncelemeyi kaydet
                  </button>
                </form>
              </div>
            ) : (
              <p className="empty-text">İncelemek için soldan bir destek talebi seç.</p>
            )}
          </div>
        </aside>
      </section>
    </section>
  );
}

function LogsPage({ auditLogs }: { auditLogs: AuditEntry[] }) {
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

function ModulesPage({ modules }: { modules: ModuleStatus[] }) {
  return (
    <section className="sa-page-stack">
      <div className="sa-strip">
        <div>
          <span className="sa-kicker">Modül kontrolü</span>
          <h2>Ürün yüzeyleri ve servis sağlığı</h2>
        </div>
        <div className="sa-inline-controls">
          <StatusBadge value="operational" />
          <StatusBadge value="planned" />
        </div>
      </div>

      <section className="sa-module-grid">
        {modules.map((module) => (
          <div className="sa-module-card" key={module.name}>
            <div className="sa-module-icon">{moduleIcon(module.name)}</div>
            <div>
              <strong>{module.name}</strong>
              <p>{module.description}</p>
            </div>
            <StatusBadge value={module.status} />
          </div>
        ))}
      </section>
    </section>
  );
}

function SettingsPage({
  settings,
  onRefresh,
  onSystemStatusChange
}: {
  settings?: PlatformSettings;
  onRefresh: () => Promise<void>;
  onSystemStatusChange: (status: SystemStatus) => void;
}) {
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("Sistem bakımı devam ediyor. Kısa süre sonra tekrar deneyebilirsiniz.");
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [clearValues, setClearValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) {
      return;
    }
    setSaving(true);
    setSettingsError(null);
    try {
      const updated = await api.updateSuperAdminSettings({
        maintenance: {
          enabled: maintenanceEnabled,
          message: maintenanceMessage
        },
        credentials: settings.credentials.map((credential) => ({
          key: credential.key,
          value: credentialValues[credential.key] ?? "",
          clear: Boolean(clearValues[credential.key])
        }))
      });
      onSystemStatusChange({ maintenance: updated.maintenance });
      setCredentialValues({});
      setClearValues({});
      await onRefresh();
    } catch (updateError) {
      setSettingsError(updateError instanceof Error ? updateError.message : "Ayarlar güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!settings) {
      return;
    }
    setMaintenanceEnabled(settings.maintenance.enabled);
    setMaintenanceMessage(settings.maintenance.message);
    setCredentialValues({});
    setClearValues({});
  }, [settings]);

  return (
    <section className="sa-page-stack">
      <section className="sa-settings-hero">
        <div>
          <span className="sa-kicker">Sistem ayarları</span>
          <h2>Entegrasyon anahtarları ve bakım modu</h2>
        </div>
        <div className={maintenanceEnabled ? "sa-maint-pill enabled" : "sa-maint-pill"}>
          <Power size={18} />
          {maintenanceEnabled ? "Bakım açık" : "Bakım kapalı"}
        </div>
      </section>

      {settingsError && <div className="form-error workspace-error sa-alert">{settingsError}</div>}

      <form className="sa-settings-grid" onSubmit={(event) => void saveSettings(event)}>
        <section className="sa-card">
          <PanelHeader kicker="Bakım" title="Bakım modu" icon={<Power size={22} />} />
          <div className="sa-card-body">
            <label className="toggle-row">
              <input type="checkbox" checked={maintenanceEnabled} onChange={(event) => setMaintenanceEnabled(event.target.checked)} />
              <span />
              <strong>{maintenanceEnabled ? "Aktif" : "Pasif"}</strong>
            </label>
            <label className="field">
              <span>Bakım mesajı</span>
              <textarea value={maintenanceMessage} onChange={(event) => setMaintenanceMessage(event.target.value)} rows={5} />
            </label>
            <div className="sa-settings-meta">
              <span>Son güncelleme</span>
              <strong>{settings?.maintenance.updatedAt ? new Date(settings.maintenance.updatedAt).toLocaleString("tr-TR") : "-"}</strong>
            </div>
          </div>
        </section>

        <section className="sa-card">
          <PanelHeader kicker="Anahtarlar" title="Servis bağlantıları" icon={<KeyRound size={22} />} />
          <div className="sa-card-body sa-cred-list">
            {(settings?.credentials ?? []).map((credential) => (
              <CredentialEditor
                credential={credential}
                key={credential.key}
                value={credentialValues[credential.key] ?? ""}
                clear={Boolean(clearValues[credential.key])}
                onValueChange={(value) => setCredentialValues((current) => ({ ...current, [credential.key]: value }))}
                onClearChange={(value) => setClearValues((current) => ({ ...current, [credential.key]: value }))}
              />
            ))}
          </div>
        </section>

        <section className="sa-save-bar" style={{ gridColumn: "1 / -1" }}>
          <button className="primary-action" type="submit" disabled={saving || !settings}>
            {saving ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
            Ayarları kaydet
          </button>
        </section>
      </form>
    </section>
  );
}

function CredentialEditor({
  credential,
  value,
  clear,
  onValueChange,
  onClearChange
}: {
  credential: IntegrationCredential;
  value: string;
  clear: boolean;
  onValueChange: (value: string) => void;
  onClearChange: (value: boolean) => void;
}) {
  return (
    <article className="sa-credential">
      <div className="sa-cred-icon">{credentialIcon(credential.key)}</div>
      <div className="sa-cred-rows">
        <div className="sa-credential-title">
          <div>
            <strong>{credential.label}</strong>
            <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--sa-muted)" }}>{credential.provider}</span>
          </div>
          <StatusBadge value={credential.configured ? "configured" : "missing"} />
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--sa-muted)", lineHeight: 1.45 }}>{credential.description}</p>
        <div className="credential-input-row">
          <div className="field-control">
            <KeyRound size={17} />
            <input
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={credential.configured ? credential.maskedValue : "Anahtar gir"}
              type="password"
              autoComplete="off"
              disabled={clear}
            />
          </div>
          <label className="clear-check">
            <input type="checkbox" checked={clear} onChange={(event) => onClearChange(event.target.checked)} />
            Temizle
          </label>
        </div>
        <small style={{ color: "var(--sa-muted)", fontWeight: 600 }}>{credential.updatedAt ? new Date(credential.updatedAt).toLocaleString("tr-TR") : "Henüz kaydedilmedi"}</small>
      </div>
    </article>
  );
}

function SupportContactForm({ session }: { session: AuthSession }) {
  const [form, setForm] = useState({ type: "support", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const created = await api.createSupportTicket(form);
      setResult(`${created.subject} talebi destek ekibine iletildi.`);
      setForm({ type: "support", subject: "", message: "" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Destek talebi gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="sa-card support-contact-pane">
      <PanelHeader kicker="Destek ekibiyle iletişim" title="Bize ulaş" icon={<LifeBuoy size={22} />} />
      <div className="sa-card-body">
        <div className="sa-contact-meta">
          <span>{session.principal.name}</span>
          <strong>{session.principal.email || roleLabel(session.principal.role)}</strong>
        </div>
        {result && <div className="form-success">{result}</div>}
        {error && <div className="form-error">{error}</div>}
        <form className="support-contact-form sa-form-stack" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>Talep tipi</span>
            <div className="field-control">
              <MessageSquare size={17} />
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                <option value="support">Destek talebi</option>
                <option value="complaint">Şikayet</option>
                <option value="suggestion">Öneri</option>
                <option value="report">Rapor / hata bildirimi</option>
              </select>
            </div>
          </label>
          <label className="field">
            <span>Konu</span>
            <div className="field-control">
              <Inbox size={17} />
              <input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Kısa konu başlığı"
                maxLength={180}
                required
              />
            </div>
          </label>
          <label className="field">
            <span>Mesaj</span>
            <textarea
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Yaşadığınız sorunu, önerinizi veya raporunuzu yazın"
              rows={6}
              maxLength={2500}
              required
            />
          </label>
          <button className="primary-action" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            Destek ekibine ilet
          </button>
        </form>
      </div>
    </section>
  );
}

function RoleFallback({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  return (
    <main className="fallback-shell">
      <div className="fallback-grid">
        <section className="sa-card">
          <PanelHeader kicker="Oturum" title="Bu kullanıcı süper admin değil" icon={<ShieldCheck size={22} />} />
          <div className="sa-card-body">
            <p>
              {session.principal.name} hesabı `{session.principal.role}` rolüyle giriş yaptı.
            </p>
            <button className="ghost-action" type="button" onClick={onLogout}>
              <LogOut size={18} />
              Çıkış
            </button>
          </div>
        </section>
        <SupportContactForm session={session} />
      </div>
    </main>
  );
}

function Metric({ icon, label, value, tone, hint }: { icon: ReactNode; label: string; value: string | number; tone: string; hint?: string }) {
  const slate = tone === "sky";
  return (
    <article className={slate ? "sa-kpi sa-kpi--slate" : "sa-kpi"}>
      <div className="sa-kpi-icon">{icon}</div>
      <label>{label}</label>
      <span className="sa-kpi-value">{value}</span>
      {hint ? <span className="sa-kpi-hint">{hint}</span> : null}
    </article>
  );
}

function PanelHeader({
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

function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${value}`}>{statusLabel(value)}</span>;
}

function SeverityBadge({ value }: { value: string }) {
  return <span className={`severity-badge ${value}`}>{value}</span>;
}

function SensitivityBadge({ value }: { value: string }) {
  return <span className="sensitivity-badge">{value}</span>;
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <article className="sa-mini-card">
      <div className="sa-mini-card-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function moduleIcon(name: string) {
  const icons: Record<string, ReactNode> = {
    Auth: <ShieldCheck size={20} />,
    Scheduling: <CalendarCheck2 size={20} />,
    Attendance: <CheckCircle2 size={20} />,
    Guidance: <GraduationCap size={20} />,
    Billing: <DatabaseZap size={20} />
  };
  return icons[name] ?? <CircuitBoard size={20} />;
}

function credentialIcon(key: string) {
  if (key.includes("ai")) {
    return <Bot size={20} />;
  }
  if (key.includes("sms")) {
    return <Network size={20} />;
  }
  if (key.includes("mail")) {
    return <Mail size={20} />;
  }
  return <KeyRound size={20} />;
}

function supportTypeIcon(type: string) {
  const icons: Record<string, ReactNode> = {
    complaint: <AlertCircle size={18} />,
    suggestion: <MessageSquare size={18} />,
    report: <Flag size={18} />,
    support: <LifeBuoy size={18} />
  };
  return icons[type] ?? <LifeBuoy size={18} />;
}

function handleLogout(setSession: (session: AuthSession | null) => void) {
  clearAuthSession();
  setSession(null);
}

function pageTitle(tab: AdminTab) {
  const match = tabs.find((item) => item.id === tab);
  return match?.label ?? "Genel";
}

function pageDescription(tab: AdminTab) {
  const descriptions: Record<AdminTab, string> = {
    overview: "Canlı platformun metrik, güvenlik ve servis durum özeti.",
    institutions: "Kurum tenantları, lisans planları ve kullanım yoğunluğu.",
    users: "Rol bazlı erişim, kullanıcı durumu ve hesap yönetimi.",
    support: "Kurum talepleri, şikayetler, öneriler ve hata raporları.",
    logs: "Hassas işlem izleri, audit kayıtları ve sistem denetimi.",
    modules: "Ürün modülleri, çalışma durumu ve geliştirme yüzeyleri.",
    settings: "Bakım modu, AI, SMS ve e-posta servis anahtarları."
  };
  return descriptions[tab];
}

function roleLabel(value: string) {
  const labels: Record<string, string> = {
    super_admin: "Süper Admin",
    system_admin: "Sistem Yöneticisi",
    principal: "Müdür",
    guidance: "Rehberlik",
    teacher: "Öğretmen",
    guardian: "Veli"
  };
  return labels[value] ?? value;
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    active: "Aktif",
    trial: "Deneme",
    review: "İncelemede",
    invited: "Davetli",
    first_login: "İlk giriş bekliyor",
    passive: "Pasif",
    configured: "Tanımlı",
    missing: "Eksik",
    operational: "Çalışıyor",
    limited: "Sınırlı",
    planned: "Planlandı",
    healthy: "Sağlıklı",
    warning: "Uyarı",
    critical: "Kritik",
    loading: "Yükleniyor",
    open: "Açık",
    in_review: "İncelemede",
    resolved: "Çözüldü",
    closed: "Kapalı",
    support: "Destek",
    complaint: "Şikayet",
    suggestion: "Öneri",
    report: "Rapor",
    low: "Düşük",
    normal: "Normal",
    high: "Yüksek",
    urgent: "Acil"
  };
  return labels[value] ?? value;
}

function formatTRY(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(value);
}
