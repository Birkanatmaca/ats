import { KeyRound, Loader2, LockKeyhole } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../components/toast/ToastProvider";
import { api } from "../lib/api";
import { OgtaLogoLink } from "../components/OgtaLogoLink";
import "./LoginPage.css";

export function ResetPasswordPage() {
  const toast = useToast();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (password !== confirm) {
      toast.error("Şifre tekrarı aynı olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      await api.passwordReset({ token, newPassword: password });
      toast.success("Şifreniz güncellendi.");
      setTimeout(() => navigate("/login"), 900);
    } catch {
      toast.error("İşlem tamamlanamadı, tekrar deneyiniz.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-form__brand">
            <OgtaLogoLink />
            <div className="login-form__titles">
              <h1>Bağlantı geçersiz</h1>
              <p>Yeni bir sıfırlama isteği oluşturun.</p>
            </div>
          </div>
          <p className="login-footer-link">
            <Link to="/forgot-password">Yeni bağlantı iste</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-label="Şifre sıfırla">
        <div className="login-form__brand">
          <OgtaLogoLink />
          <div className="login-form__titles">
            <h1>Yeni şifre belirle</h1>
            <p>En az 8 karakterlik yeni şifrenizi girin.</p>
          </div>
        </div>

        <form className="login-form" noValidate onSubmit={(event) => void submit(event)}>
          <label className="field login-field">
            <span>Yeni şifre</span>
            <div className="field-control login-field-control">
              <LockKeyhole size={18} aria-hidden />
              <input
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </div>
          </label>

          <label className="field login-field">
            <span>Yeni şifre (tekrar)</span>
            <div className="field-control login-field-control">
              <KeyRound size={18} aria-hidden />
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirm(event.target.value)}
                type="password"
                value={confirm}
              />
            </div>
          </label>

          <button className="primary-action login-submit" disabled={loading} type="submit">
            {loading ? <Loader2 className="spin" size={18} aria-hidden /> : null}
            Şifreyi güncelle
          </button>
        </form>
      </section>
    </main>
  );
}
