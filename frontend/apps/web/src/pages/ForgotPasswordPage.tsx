import { Loader2, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import "./LoginPage.css";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; resetToken?: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.passwordForgot({ email: email.trim() });
      setResult(response);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "İstek gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel login-panel--solo" aria-label="Şifremi unuttum">
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <div className="form-heading">
            <span>ÖTS hesabı</span>
            <h2>Şifremi unuttum</h2>
            <p className="login-subcopy">Kayıtlı e-posta adresinize sıfırlama bağlantısı gönderilir.</p>
          </div>

          {error && <div className="form-error">{error}</div>}
          {result && (
            <div className="form-success">
              <p>{result.message}</p>
              {result.resetToken ? (
                <p>
                  Demo ortamı:{" "}
                  <Link to={`/reset-password?token=${encodeURIComponent(result.resetToken)}`}>Şifreyi sıfırla</Link>
                </p>
              ) : null}
            </div>
          )}

          <label className="field login-field">
            <span>E-posta</span>
            <div className="field-control login-field-control">
              <Mail size={18} aria-hidden />
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email" />
            </div>
          </label>

          <button className="primary-action login-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} aria-hidden /> : null}
            Sıfırlama bağlantısı gönder
          </button>

          <p className="login-footer-link">
            <Link to="/login">Giriş sayfasına dön</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
