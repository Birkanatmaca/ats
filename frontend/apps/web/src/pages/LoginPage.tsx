import { GraduationCap, KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { AuthSession } from "../lib/api";
import { api, storeAuthSession } from "../lib/api";
import "./LoginPage.css";

export function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
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
        <div className="login-brand-content">
          <div className="login-mark">
            <GraduationCap size={38} />
          </div>
          <p>ÖTS Platform</p>
          <h1>Akıllı Okul Yönetim Sistemi</h1>
          <h2>Eğitim kurumunuzu tek bir merkezden, güvenle ve kolayca yönetin.</h2>
        </div>
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
