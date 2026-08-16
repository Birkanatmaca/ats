import { KeyRound, Loader2, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useToast } from "../components/toast/ToastProvider";
import type { AuthSession } from "../lib/api";
import { api, storeAuthSession } from "../lib/api";
import { OgtaLogoLink } from "../components/OgtaLogoLink";
import "./LoginPage.css";
import "./FirstLoginPasswordPage.css";

export function FirstLoginPasswordPage({
  session,
  onSessionUpdated,
  onLogout
}: {
  session: AuthSession;
  onSessionUpdated: (session: AuthSession) => void;
  onLogout: () => void;
}) {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Şifre tekrarı aynı olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const updatedSession = await api.changePassword({ newPassword });
      storeAuthSession(updatedSession);
      onSessionUpdated(updatedSession);
    } catch {
      toast.error("İşlem tamamlanamadı, tekrar deneyiniz.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-label="İlk giriş">
        <div className="login-form__brand">
          <OgtaLogoLink />
          <div className="login-form__titles">
            <h1>Şifreni belirle</h1>
            <p>
              <strong>{session.principal.email}</strong> için geçici şifreyi kalıcı bir şifreyle değiştir.
            </p>
          </div>
        </div>

        <form className="login-form" noValidate onSubmit={(event) => void submit(event)}>
          <label className="field login-field">
            <span>Yeni şifre</span>
            <div className="field-control login-field-control">
              <LockKeyhole size={18} />
              <input
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="En az 8 karakter"
                type="password"
                value={newPassword}
              />
            </div>
          </label>
          <label className="field login-field">
            <span>Yeni şifre tekrar</span>
            <div className="field-control login-field-control">
              <ShieldCheck size={18} />
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Şifreyi tekrar yazın"
                type="password"
                value={confirmPassword}
              />
            </div>
          </label>
          <div className="first-login-actions">
            <button className="primary-action login-submit" disabled={loading} type="submit">
              {loading ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
              Şifreyi kaydet
            </button>
            <button className="ghost-action first-login-logout" onClick={onLogout} type="button">
              <LogOut size={18} />
              Çıkış
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
