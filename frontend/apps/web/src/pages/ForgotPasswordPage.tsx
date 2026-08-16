import { ArrowLeft, Loader2, Mail, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { isValidEmail } from "../auth/formValidation";
import { useToast } from "../components/toast/ToastProvider";
import { api } from "../lib/api";
import { OgtaLogoLink } from "../components/OgtaLogoLink";
import "./LoginPage.css";

const FORGOT_NOTICE = "İşlem alındı. E-posta kutunuzu kontrol edin.";

export function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ resetToken?: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      toast.error("E-posta adresini giriniz.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      toast.error("E-posta formatını düzgün girin.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.passwordForgot({ email: trimmedEmail });
      setResult({ resetToken: response.resetToken });
    } catch {
      setResult({});
    } finally {
      toast.success(FORGOT_NOTICE);
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <Link className="login-home-link" to="/login">
        <ArrowLeft aria-hidden size={18} />
        Girişe dön
      </Link>

      <section aria-label="Şifremi unuttum" className="login-card">
        <div className="login-form__brand">
          <OgtaLogoLink />
          <div className="login-form__titles">
            <h1>Şifremi unuttum</h1>
            <p>
              {result
                ? "Sıfırlama adımlarını e-posta kutunuzdan takip edebilirsiniz."
                : "Kayıtlı e-posta adresinize şifre sıfırlama bağlantısı gönderilir."}
            </p>
          </div>
        </div>

        {result ? (
          <div className="login-form">
            {result.resetToken ? (
              <div className="login-success">
                <p>
                  Geliştirme ortamı:{" "}
                  <Link to={`/reset-password?token=${encodeURIComponent(result.resetToken)}`}>
                    Yeni şifre belirle
                  </Link>
                </p>
              </div>
            ) : null}
            <p className="login-footer-link">
              <Link to="/login">Giriş sayfasına dön</Link>
            </p>
          </div>
        ) : (
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

            <button className="primary-action login-submit" disabled={loading} type="submit">
              {loading ? <Loader2 aria-hidden className="spin" size={18} /> : <Send aria-hidden size={18} />}
              Bağlantı gönder
            </button>

            <p className="login-footer-link">
              <Link to="/login">Şifrenizi hatırlıyor musunuz? Giriş yapın</Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
