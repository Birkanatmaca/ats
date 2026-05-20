import { KeyRound, Loader2, LockKeyhole } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import "./LoginPage.css";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.passwordReset({ token, newPassword: password });
      setSuccess(response.message);
      setTimeout(() => navigate("/login"), 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Şifre sıfırlanamadı.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="login-page">
        <section className="login-panel login-panel--solo">
          <div className="login-form">
            <div className="form-error">Geçersiz sıfırlama bağlantısı.</div>
            <p className="login-footer-link">
              <Link to="/forgot-password">Yeni bağlantı iste</Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel login-panel--solo" aria-label="Şifre sıfırla">
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <div className="form-heading">
            <span>ÖTS hesabı</span>
            <h2>Yeni şifre belirle</h2>
          </div>

          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <label className="field login-field">
            <span>Yeni şifre</span>
            <div className="field-control login-field-control">
              <LockKeyhole size={18} aria-hidden />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required />
            </div>
          </label>

          <label className="field login-field">
            <span>Yeni şifre (tekrar)</span>
            <div className="field-control login-field-control">
              <KeyRound size={18} aria-hidden />
              <input value={confirm} onChange={(event) => setConfirm(event.target.value)} type="password" minLength={8} required />
            </div>
          </label>

          <button className="primary-action login-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} aria-hidden /> : null}
            Şifreyi güncelle
          </button>
        </form>
      </section>
    </main>
  );
}
