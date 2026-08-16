import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { isValidEmail } from "../auth/formValidation";
import { useToast } from "../components/toast/ToastProvider";
import type { AuthSession } from "../lib/api";
import { api, storeAuthSession } from "../lib/api";
import { OgtaLogoLink } from "../components/OgtaLogoLink";
import "./LoginPage.css";

export function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      toast.error("E-posta ve şifreyi giriniz.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      toast.error("E-posta formatını düzgün girin.");
      return;
    }

    setLoading(true);
    try {
      const session = await api.login({ email: trimmedEmail, password });
      storeAuthSession(session);
      onLogin(session);
    } catch {
      toast.error("Hatalı giriş yaptınız, tekrar deneyiniz.");
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
          <div className="login-form__titles">
            <h1>Panele giriş</h1>
            <p>Kurum hesabınızla okul yönetim paneline devam edin.</p>
          </div>
        </div>

        <form className="login-form" noValidate onSubmit={(event) => void submit(event)}>
          <label className="field login-field">
            <span>E-posta</span>
            <div className="field-control login-field-control">
              <Mail aria-hidden size={18} />
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@kurum.com"
                type="text"
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
                placeholder="Şifrenizi girin"
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                className="login-password-toggle"
                onClick={() => setShowPassword((open) => !open)}
                type="button"
              >
                {showPassword ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
              </button>
            </div>
          </label>

          <button className="primary-action login-submit" disabled={loading} type="submit">
            {loading ? <Loader2 aria-hidden className="spin" size={18} /> : <KeyRound aria-hidden size={18} />}
            Giriş yap
          </button>

          <p className="login-footer-link">
            <Link to="/forgot-password">Şifremi unuttum</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
