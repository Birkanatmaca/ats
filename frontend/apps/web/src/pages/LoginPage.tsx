import {
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { AuthSession } from "../lib/api";
import { api, storeAuthSession } from "../lib/api";
import "./LoginPage.css";

/** Yerel geliştirme demo hesapları; TEST_CREDENTIALS.txt ile aynı. */
const DEMO_ACCOUNTS = [
  { label: "Süper admin", email: "superadmin@ots.local", password: "OtsAdmin!2026" },
  { label: "Müdür", email: "mudur@atlas.k12.tr", password: "OtsMudur!2026" },
  { label: "Öğretmen", email: "ogretmen@atlas.k12.tr", password: "OtsOgretmen!2026" },
  { label: "Veli", email: "veli@atlas.k12.tr", password: "OtsVeli!2026" },
  { label: "Rehberlik", email: "rehberlik@atlas.k12.tr", password: "OtsRehberlik!2026" }
] as const;

export function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState("superadmin@ots.local");
  const [password, setPassword] = useState("OtsAdmin!2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performLogin(loginEmail: string, loginPassword: string) {
    setLoading(true);
    setError(null);
    setEmail(loginEmail);
    setPassword(loginPassword);
    try {
      const session = await api.login({ email: loginEmail, password: loginPassword });
      storeAuthSession(session);
      onLogin(session);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performLogin(email, password);
  }

  function loginAsDemo(demoEmail: string, demoPassword: string) {
    void performLogin(demoEmail, demoPassword);
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="ÖTS">
        <div className="login-brand-aurora" aria-hidden="true">
          <span className="login-brand-aurora-blob login-brand-aurora-blob--a" />
          <span className="login-brand-aurora-blob login-brand-aurora-blob--b" />
          <span className="login-brand-aurora-blob login-brand-aurora-blob--c" />
        </div>
        <div className="login-brand-shimmer" aria-hidden="true" />
        <div className="login-brand-grid" aria-hidden="true" />
        <div className="login-brand-content">
          <div className="login-mark">
            <GraduationCap size={38} aria-hidden />
          </div>
          <p>ÖTS Platform</p>
          <h1>Akıllı Okul Yönetim Sistemi</h1>
          <h2>Eğitim kurumunuzu tek bir merkezden, güvenle ve kolayca yönetin.</h2>
          <ul className="login-brand-highlights" aria-hidden="true">
            <li>
              <ShieldCheck size={18} strokeWidth={2.25} />
              Güvenli erişim
            </li>
            <li>
              <Sparkles size={18} strokeWidth={2.25} />
              Tek panel
            </li>
            <li>
              <LayoutDashboard size={18} strokeWidth={2.25} />
              Rol tabanlı
            </li>
          </ul>
        </div>
      </section>

      <section className="login-panel" aria-label="Giriş">
        <div className="login-panel-glow" aria-hidden="true" />
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <div className="form-heading">
            <span>ÖTS hesabı</span>
            <h2>Giriş yap</h2>
          </div>

          {error && <div className="form-error">{error}</div>}

          <label className="field login-field">
            <span>E-posta</span>
            <div className="field-control login-field-control">
              <Mail size={18} aria-hidden />
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
            </div>
          </label>

          <label className="field login-field">
            <span>Şifre</span>
            <div className="field-control login-field-control">
              <LockKeyhole size={18} aria-hidden />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
            </div>
          </label>

          <button className="primary-action login-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} aria-hidden /> : <KeyRound size={18} aria-hidden />}
            Giriş yap
          </button>

          <p className="login-footer-link">
            <a href="/forgot-password">Şifremi unuttum</a>
          </p>

          <div className="login-demo" role="group" aria-label="Demo hesaplarla giriş">
            <p className="login-demo-title">Demo hesap</p>
            <div className="login-demo-buttons">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="login-demo-chip"
                  disabled={loading}
                  onClick={() => loginAsDemo(account.email, account.password)}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
