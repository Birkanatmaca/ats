import {
  Activity,
  AlertCircle,
  ArrowLeft,
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
  UsersRound,
  X
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
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";
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
  const [showAdminLoginOnMaintenance, setShowAdminLoginOnMaintenance] = useState(false);

  useEffect(() => {
    api.systemStatus()
      .then(setSystemStatus)
      .catch(() => setSystemStatus(null));
  }, []);

  const homePath = session
    ? session.principal.mustChangePassword
      ? "/first-login"
      : session.principal.role === "super_admin"
        ? "/admin/overview"
        : "/dashboard"
    : "/login";

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session ? (
            <Navigate to={homePath} replace />
          ) : systemStatus?.maintenance.enabled && !showAdminLoginOnMaintenance ? (
            <MaintenancePage status={systemStatus} onAdminLogin={() => setShowAdminLoginOnMaintenance(true)} />
          ) : (
            <LoginPage onLogin={setSession} />
          )
        }
      />

      <Route
        path="/maintenance"
        element={
          systemStatus ? (
            session?.principal.role === "super_admin" && !session.principal.mustChangePassword ? (
              <Navigate to="/admin/overview" replace />
            ) : (
              <MaintenancePage status={systemStatus} onLogout={session ? () => handleLogout(setSession) : undefined} />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/first-login"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : !session.principal.mustChangePassword ? (
            <Navigate to={homePath} replace />
          ) : (
            <FirstLoginPasswordPage
              session={session}
              onSessionUpdated={setSession}
              onLogout={() => handleLogout(setSession)}
            />
          )
        }
      />

      <Route
        path="/admin/*"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : session.principal.mustChangePassword ? (
            <Navigate to="/first-login" replace />
          ) : session.principal.role !== "super_admin" ? (
            <Navigate to="/dashboard" replace />
          ) : systemStatus?.maintenance.enabled && session.principal.role !== "super_admin" ? (
            <Navigate to="/maintenance" replace />
          ) : (
            <SuperAdminConsole
              session={session}
              onLogout={() => handleLogout(setSession)}
              onSystemStatusChange={setSystemStatus}
            />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : systemStatus?.maintenance.enabled && session.principal.role !== "super_admin" ? (
            <Navigate to="/maintenance" replace />
          ) : session.principal.mustChangePassword ? (
            <Navigate to="/first-login" replace />
          ) : session.principal.role === "super_admin" ? (
            <Navigate to="/admin/overview" replace />
          ) : (
            <RoleFallback session={session} onLogout={() => handleLogout(setSession)} />
          )
        }
      />

      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  );
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
  const [state, setState] = useState<SuperAdminState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const subPath = location.pathname.replace(/^\/admin\/?/, "");
  const activeTab = (subPath.split("/")[0] || "overview") as AdminTab;
  const isInstitutionDetail = /^institutions\/[^/]+/.test(subPath);

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

  const showHeader = activeTab !== "overview" && !isInstitutionDetail;

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
            <NavLink
              className={({ isActive }) => (isActive ? "nav-button active" : "nav-button")}
              key={tab.id}
              to={`/admin/${tab.id}`}
              end={tab.id === "overview"}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
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
          {showHeader && (
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

          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route
              path="overview"
              element={<OverviewPage overview={state.overview} systemMetrics={state.systemMetrics} />}
            />
            <Route
              path="institutions"
              element={<InstitutionsListPage institutions={state.institutions ?? []} onRefresh={load} />}
            />
            <Route
              path="institutions/:id"
              element={<InstitutionDetailPage institutions={state.institutions ?? []} onRefresh={load} />}
            />
            <Route
              path="users"
              element={
                <UsersPage users={state.users ?? []} institutions={state.institutions ?? []} onRefresh={load} />
              }
            />
            <Route
              path="support"
              element={<SupportPage tickets={state.supportTickets ?? []} onRefresh={load} />}
            />
            <Route path="logs" element={<LogsPage auditLogs={state.auditLogs ?? []} />} />
            <Route path="modules" element={<ModulesPage modules={state.overview?.modules ?? []} />} />
            <Route
              path="settings"
              element={
                <SettingsPage
                  settings={state.settings}
                  onRefresh={load}
                  onSystemStatusChange={onSystemStatusChange}
                />
              }
            />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
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

function Modal({
  open,
  onClose,
  title,
  kicker,
  icon,
  children,
  size = "md"
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="sa-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`sa-modal sa-modal--${size}`}>
        <div className="sa-modal-header">
          <div className="sa-modal-heading">
            {kicker && <span className="sa-kicker">{kicker}</span>}
            <h2>
              {icon && <span className="sa-modal-title-icon">{icon}</span>}
              {title}
            </h2>
          </div>
          <button className="sa-modal-close" type="button" aria-label="Kapat" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sa-modal-body">{children}</div>
      </div>
    </div>
  );
}

function planVariant(plan: string): string {
  const key = plan.toLowerCase();
  if (key.includes("mvp")) return "mvp";
  if (key.includes("starter")) return "starter";
  if (key.includes("growth")) return "growth";
  if (key.includes("premium")) return "premium";
  if (key.includes("trial")) return "trial";
  return "default";
}

function roleVariant(role: string): string {
  const key = role.toLowerCase();
  if (key.includes("super")) return "super";
  if (key.includes("system")) return "system";
  if (key.includes("principal")) return "principal";
  if (key.includes("guidance")) return "guidance";
  if (key.includes("teacher")) return "teacher";
  if (key.includes("guardian")) return "guardian";
  return "default";
}

function initials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}

function InstitutionsListPage({
  institutions,
  onRefresh
}: {
  institutions: Institution[];
  onRefresh: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const totalStudents = institutions.reduce((sum, institution) => sum + institution.students, 0);
  const totalUsers = institutions.reduce((sum, institution) => sum + institution.users, 0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", plan: "MVP", timezone: "Europe/Istanbul" });
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function createInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setCreateError(null);
    try {
      const created = await api.createSuperAdminInstitution(createForm);
      setCreateForm({ name: "", plan: "MVP", timezone: "Europe/Istanbul" });
      setShowCreate(false);
      await onRefresh();
      navigate(`/admin/institutions/${created.id}`);
    } catch (createErr) {
      setCreateError(createErr instanceof Error ? createErr.message : "Kurum oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sa-page-stack">
      <div className="sa-kpi-mini-row sa-inst-summary">
        <MiniStat label="Toplam öğrenci" value={totalStudents} icon={<GraduationCap size={19} />} />
        <MiniStat label="Toplam kullanıcı" value={totalUsers} icon={<UsersRound size={19} />} />
        <MiniStat
          label="Aktif kurum"
          value={institutions.filter((item) => item.status === "active").length}
          icon={<CheckCircle2 size={19} />}
        />
        <MiniStat label="Kayıtlı tenant" value={institutions.length} icon={<Building2 size={19} />} />
      </div>

      <div className="sa-inst-grid">
        <button
          type="button"
          className="sa-inst-card sa-inst-card--add"
          onClick={() => setShowCreate(true)}
          aria-label="Yeni kurum ekle"
        >
          <div className="sa-inst-card-add-icon">
            <Plus size={28} />
          </div>
          <strong>Yeni kurum ekle</strong>
          <span>Kart şeklinde yeni bir tenant oluştur</span>
        </button>

        {institutions.map((institution) => {
          const variant = planVariant(institution.plan);
          return (
            <Link
              key={institution.id}
              to={`/admin/institutions/${institution.id}`}
              className={`sa-inst-card sa-inst-card--plan-${variant}`}
            >
              <div className="sa-inst-card-band" />
              <div className="sa-inst-card-head">
                <div className="sa-inst-card-icon">
                  <Building2 size={22} />
                </div>
                <div className="sa-inst-card-badges">
                  <span className={`sa-plan-badge sa-plan-badge--${variant}`}>{institution.plan}</span>
                  <StatusBadge value={institution.status} />
                </div>
              </div>
              <div className="sa-inst-card-body">
                <h3>{institution.name}</h3>
                <p className="sa-inst-card-meta">
                  <Globe2 size={13} />
                  <span>{institution.timezone}</span>
                </p>
              </div>
              <div className="sa-inst-card-stats">
                <div>
                  <GraduationCap size={15} />
                  <div>
                    <span>Öğrenci</span>
                    <strong>{institution.students}</strong>
                  </div>
                </div>
                <div>
                  <UsersRound size={15} />
                  <div>
                    <span>Kullanıcı</span>
                    <strong>{institution.users}</strong>
                  </div>
                </div>
              </div>
              <div className="sa-inst-card-foot">
                <span>
                  son aktivite{" "}
                  {new Date(institution.lastActivityAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
                <span className="sa-inst-card-cta">
                  Detay
                  <ArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setCreateError(null);
        }}
        title="Kurum oluştur"
        kicker="Yeni tenant"
        icon={<Building2 size={20} />}
      >
        {createError && <div className="form-error">{createError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void createInstitution(event)}>
          <label className="field">
            <span>Kurum adı</span>
            <div className="field-control">
              <Building2 size={17} />
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))}
                placeholder="Örn. Özel Deniz Koleji"
                required
                autoFocus
              />
            </div>
          </label>
          <label className="field">
            <span>Plan</span>
            <div className="field-control">
              <Database size={17} />
              <select
                value={createForm.plan}
                onChange={(event) => setCreateForm((form) => ({ ...form, plan: event.target.value }))}
              >
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
              <input
                value={createForm.timezone}
                onChange={(event) => setCreateForm((form) => ({ ...form, timezone: event.target.value }))}
              />
            </div>
          </label>
          <div className="sa-modal-actions">
            <button
              type="button"
              className="ghost-action"
              onClick={() => {
                setShowCreate(false);
                setCreateError(null);
              }}
            >
              Vazgeç
            </button>
            <button className="primary-action" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Kuruma oluştur
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function InstitutionDetailPage({
  institutions,
  onRefresh
}: {
  institutions: Institution[];
  onRefresh: () => Promise<void>;
}) {
  const params = useParams<{ id: string }>();
  const institutionId = params.id ?? "";
  const navigate = useNavigate();

  const [detail, setDetail] = useState<InstitutionDetail | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [credential, setCredential] = useState<CreatedUserCredential | null>(null);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", fullName: "", role: "principal" });
  const [savingCreate, setSavingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editForm, setEditForm] = useState({
    tenantId: "",
    email: "",
    fullName: "",
    role: "principal",
    status: "active"
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fallbackInstitution = institutions.find((item) => item.id === institutionId);

  async function loadDetail(id: string) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [institutionDetail, usersList] = await Promise.all([
        api.superAdminInstitution(id),
        api.superAdminInstitutionUsers(id)
      ]);
      setDetail(institutionDetail);
      setUsers(usersList);
    } catch (loadError) {
      setDetail(null);
      setUsers([]);
      setDetailError(loadError instanceof Error ? loadError.message : "Kurum detayları alınamadı.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!institutionId) {
      return;
    }
    void loadDetail(institutionId);
  }, [institutionId]);

  useEffect(() => {
    if (!editingUser) {
      return;
    }
    setEditForm({
      tenantId: editingUser.tenantId,
      email: editingUser.email,
      fullName: editingUser.fullName,
      role: editingUser.role === "super_admin" ? "principal" : editingUser.role,
      status: editingUser.status === "passive" ? "passive" : "active"
    });
    setEditError(null);
  }, [editingUser]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!institutionId) {
      return;
    }
    setSavingCreate(true);
    setCreateError(null);
    try {
      const created = await api.createSuperAdminInstitutionUser(institutionId, createForm);
      setCredential(created);
      setCreateForm({ email: "", fullName: "", role: "principal" });
      setShowCreateUser(false);
      const usersList = await api.superAdminInstitutionUsers(institutionId);
      setUsers(usersList);
      await onRefresh();
    } catch (createErr) {
      setCreateError(createErr instanceof Error ? createErr.message : "Kullanıcı oluşturulamadı.");
    } finally {
      setSavingCreate(false);
    }
  }

  async function updateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) {
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await api.updateSuperAdminUser(editingUser.id, editForm);
      const usersList = await api.superAdminInstitutionUsers(institutionId);
      setUsers(usersList);
      setEditingUser(null);
      await onRefresh();
    } catch (updateErr) {
      setEditError(updateErr instanceof Error ? updateErr.message : "Kullanıcı güncellenemedi.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteUser(user: UserAccount) {
    if (user.role === "super_admin") {
      setDetailError("Süper admin hesabı silinemez.");
      return;
    }
    const confirmed = window.confirm(`${user.fullName} hesabı pasifleştirilsin mi?`);
    if (!confirmed) {
      return;
    }
    try {
      await api.deleteSuperAdminUser(user.id, user.tenantId);
      const usersList = await api.superAdminInstitutionUsers(institutionId);
      setUsers(usersList);
      await onRefresh();
    } catch (deleteErr) {
      setDetailError(deleteErr instanceof Error ? deleteErr.message : "Kullanıcı silinemedi.");
    }
  }

  const headInstitution = detail ?? fallbackInstitution;
  const variant = headInstitution ? planVariant(headInstitution.plan) : "default";

  return (
    <section className="sa-page-stack">
      <div className="sa-detail-back">
        <button type="button" className="sa-back-link" onClick={() => navigate("/admin/institutions")}>
          <ArrowLeft size={16} />
          Kurumlar
        </button>
      </div>

      <header className={`sa-detail-hero sa-detail-hero--${variant}`}>
        <div className="sa-detail-hero-icon">
          <Building2 size={26} />
        </div>
        <div className="sa-detail-hero-text">
          <span className="sa-kicker">Kurum detayı</span>
          <h1>{headInstitution?.name ?? (detailLoading ? "Yükleniyor..." : "Kurum bulunamadı")}</h1>
          {headInstitution && (
            <div className="sa-detail-hero-badges">
              <span className={`sa-plan-badge sa-plan-badge--${variant}`}>{headInstitution.plan}</span>
              <StatusBadge value={headInstitution.status} />
              <span className="sa-detail-hero-meta">
                <Globe2 size={13} />
                {headInstitution.timezone}
              </span>
            </div>
          )}
        </div>
        {detailLoading && (
          <div className="sa-detail-hero-loading">
            <Loader2 className="spin" size={20} />
          </div>
        )}
      </header>

      {detailError && <div className="form-error workspace-error sa-alert">{detailError}</div>}

      {detail && (
        <section className="sa-detail-info">
          <div className="sa-kpi-mini-row">
            <MiniStat label="Plan" value={detail.plan} icon={<DatabaseZap size={19} />} />
            <MiniStat label="Öğrenci" value={detail.students} icon={<GraduationCap size={19} />} />
            <MiniStat label="Kullanıcı" value={users.length} icon={<UsersRound size={19} />} />
            <MiniStat label="Durum" value={statusLabel(detail.status)} icon={<CheckCircle2 size={19} />} />
          </div>
          <div className="sa-detail-meta">
            <div>
              <span className="sa-kicker">ID</span>
              <strong>{detail.id}</strong>
            </div>
            <div>
              <span className="sa-kicker">Zaman dilimi</span>
              <strong>{detail.timezone}</strong>
            </div>
            <div>
              <span className="sa-kicker">Oluşturma</span>
              <strong>{new Date(detail.createdAt).toLocaleDateString("tr-TR")}</strong>
            </div>
            <div>
              <span className="sa-kicker">Son güncelleme</span>
              <strong>{new Date(detail.updatedAt).toLocaleDateString("tr-TR")}</strong>
            </div>
          </div>
        </section>
      )}

      <section className="sa-detail-users">
        <div className="sa-detail-users-head">
          <div>
            <span className="sa-kicker">Kurum kullanıcıları</span>
            <h2>{users.length} hesap</h2>
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreateUser(true);
            }}
          >
            <Plus size={17} />
            Yeni kullanıcı ekle
          </button>
        </div>

        {credential && (
          <div className="sa-credential-banner">
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sa-muted)", textTransform: "uppercase" }}>
                Geçici giriş bilgisi
              </span>
              <strong>{credential.user.email}</strong>
              <code>{credential.temporaryPassword}</code>
            </div>
            <button
              className="ghost-action"
              type="button"
              onClick={() =>
                void navigator.clipboard?.writeText(`${credential.user.email} / ${credential.temporaryPassword}`)
              }
            >
              <Clipboard size={17} />
              Kopyala
            </button>
          </div>
        )}

        <div className="sa-user-card-grid">
          {users.map((user) => {
            const rVariant = roleVariant(user.role);
            return (
              <article className={`sa-user-card sa-user-card--${rVariant}`} key={user.id}>
                <div className={`sa-user-avatar sa-user-avatar--${rVariant}`}>{initials(user.fullName)}</div>
                <div className="sa-user-card-body">
                  <strong>{user.fullName}</strong>
                  <span className="sa-user-email">{user.email}</span>
                  <div className="sa-user-card-badges">
                    <span className={`sa-role-badge sa-role-badge--${rVariant}`}>{roleLabel(user.role)}</span>
                    <StatusBadge value={user.status} />
                  </div>
                </div>
                <div className="sa-user-card-actions">
                  <button
                    className="sa-icon-btn"
                    type="button"
                    aria-label={`${user.fullName} düzenle`}
                    onClick={() => setEditingUser(user)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="sa-icon-btn danger"
                    type="button"
                    aria-label={`${user.fullName} sil`}
                    onClick={() => void deleteUser(user)}
                    disabled={user.role === "super_admin"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
          {users.length === 0 && !detailLoading && (
            <p className="empty-text" style={{ gridColumn: "1 / -1" }}>
              Bu kuruma bağlı kullanıcı yok. Sağ üstteki "Yeni kullanıcı ekle" ile başlayabilirsin.
            </p>
          )}
        </div>
      </section>

      <Modal
        open={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        title="Yeni kullanıcı"
        kicker={headInstitution?.name ?? "Kurum"}
        icon={<UserCog size={20} />}
      >
        {createError && <div className="form-error">{createError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void createUser(event)}>
          <label className="field">
            <span>E-posta</span>
            <div className="field-control">
              <Mail size={17} />
              <input
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))}
                placeholder="kullanici@kurum.com"
                required
                autoFocus
              />
            </div>
          </label>
          <label className="field">
            <span>Ad soyad</span>
            <div className="field-control">
              <UserCog size={17} />
              <input
                value={createForm.fullName}
                onChange={(event) => setCreateForm((form) => ({ ...form, fullName: event.target.value }))}
                placeholder="Boş bırakılırsa mailden üretilir"
              />
            </div>
          </label>
          <label className="field">
            <span>Rol</span>
            <div className="field-control">
              <ShieldCheck size={17} />
              <select
                value={createForm.role}
                onChange={(event) => setCreateForm((form) => ({ ...form, role: event.target.value }))}
              >
                <option value="principal">Müdür</option>
                <option value="guidance">Rehberlik</option>
                <option value="teacher">Öğretmen</option>
                <option value="guardian">Veli</option>
              </select>
            </div>
          </label>
          <div className="sa-modal-actions">
            <button type="button" className="ghost-action" onClick={() => setShowCreateUser(false)}>
              Vazgeç
            </button>
            <button className="primary-action" type="submit" disabled={savingCreate}>
              {savingCreate ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Kullanıcı oluştur
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Kullanıcı düzenle"
        kicker={editingUser?.fullName ?? ""}
        icon={<Pencil size={20} />}
      >
        {editError && <div className="form-error">{editError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void updateUser(event)}>
          <label className="field">
            <span>Kurum</span>
            <div className="field-control">
              <Building2 size={17} />
              <select
                value={editForm.tenantId}
                onChange={(event) => setEditForm((form) => ({ ...form, tenantId: event.target.value }))}
              >
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
              <input
                type="email"
                value={editForm.email}
                onChange={(event) => setEditForm((form) => ({ ...form, email: event.target.value }))}
              />
            </div>
          </label>
          <label className="field">
            <span>Ad soyad</span>
            <div className="field-control">
              <UserCog size={17} />
              <input
                value={editForm.fullName}
                onChange={(event) => setEditForm((form) => ({ ...form, fullName: event.target.value }))}
              />
            </div>
          </label>
          <label className="field">
            <span>Rol</span>
            <div className="field-control">
              <ShieldCheck size={17} />
              <select
                value={editForm.role}
                onChange={(event) => setEditForm((form) => ({ ...form, role: event.target.value }))}
              >
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
              <select
                value={editForm.status}
                onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))}
              >
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </div>
          </label>
          <div className="sa-modal-actions">
            <button type="button" className="ghost-action" onClick={() => setEditingUser(null)}>
              Vazgeç
            </button>
            <button className="primary-action" type="submit" disabled={savingEdit}>
              {savingEdit ? <Loader2 className="spin" size={18} /> : <Pencil size={18} />}
              Kaydet
            </button>
          </div>
        </form>
      </Modal>
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
