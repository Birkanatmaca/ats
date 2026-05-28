import { ArrowLeft, KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { AuthSession } from "../lib/api";
import { api, storeAuthSession } from "../lib/api";
import { OgtaLogoLink } from "../components/OgtaLogoLink";
import "./LoginPage.css";

export function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <a className="login-home-link" href="https://ogtasis.com/">
        <ArrowLeft aria-hidden size={18} />
        Anasayfaya dön
      </a>

      <section aria-label="Giriş" className="login-card">
        <div className="login-form__brand">
          <OgtaLogoLink />
          <h1>Giriş yap</h1>
        </div>

        <form className="login-form" onSubmit={(event) => void submit(event)}>
          {error ? <div className="form-error">{error}</div> : null}

        <label className="field login-field">
          <span>E-posta</span>
          <div className="field-control login-field-control">
            <Mail aria-hidden size={18} />
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ornek@kurum.com"
              required
              type="email"
              value={email}
            />
          </div>
        </label>

        <label className="field login-field">
          <span>Şifre</span>
          <div className="field-control login-field-control">
            <LockKeyhole aria-hidden size={18} />
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              type="password"
              value={password}
            />
          </div>
        </label>

        <button className="primary-action login-submit" disabled={loading} type="submit">
          {loading ? <Loader2 aria-hidden className="spin" size={18} /> : <KeyRound aria-hidden size={18} />}
          Giriş yap
        </button>

        <p className="login-footer-link">
          <a href="/forgot-password">Şifremi unuttum</a>
        </p>
        </form>
      </section>
    </main>
  );
}
