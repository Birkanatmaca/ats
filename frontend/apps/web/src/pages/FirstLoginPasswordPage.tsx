import { KeyRound, Loader2, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { AuthSession } from "../lib/api";
import { api, storeAuthSession } from "../lib/api";
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
              <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" />
            </div>
          </label>
          <label className="field">
            <span>Yeni şifre tekrar</span>
            <div className="field-control">
              <ShieldCheck size={18} />
              <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" />
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
