import { Loader2, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { AuthSession, UserProfile } from "../../lib/api";
import { api, storeAuthSession } from "../../lib/api";
import { roleLabel } from "../utils/labels";
import "./ProfilePage.css";

export function ProfilePage({
  session,
  onSessionUpdate
}: {
  session: AuthSession;
  onSessionUpdate: (session: AuthSession) => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState(session.principal.name);
  const [email, setEmail] = useState(session.principal.email ?? "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .profile()
      .then((data) => {
        if (!active) {
          return;
        }
        setProfile(data);
        setFullName(data.fullName);
        setEmail(data.email);
        setPhone(data.phone ?? "");
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Profil alınamadı.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
      setProfile(updated);
      const nextSession: AuthSession = {
        ...session,
        principal: {
          ...session.principal,
          name: updated.fullName,
          email: updated.email
        }
      };
      storeAuthSession(nextSession);
      onSessionUpdate(nextSession);
      setNotice("Profil kaydedildi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profil kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  const initial = (fullName || session.principal.name).slice(0, 1).toLocaleUpperCase("tr-TR");

  return (
    <section className="prf">
      <header className="prf-hero">
        <div>
          <p className="prf-kicker">Sistem</p>
          <h1>Profil</h1>
        </div>
        <p className="prf-hero-note">Ad, e-posta ve iletişim bilgileriniz</p>
      </header>

      {error ? <div className="form-error sa-alert">{error}</div> : null}
      {notice ? <div className="prf-notice">{notice}</div> : null}

      {loading && !profile ? (
        <div className="loading-line">
          <Loader2 className="spin" size={18} />
          Profil yükleniyor
        </div>
      ) : (
        <div className="prf-grid">
          <article className="prf-card prf-card--identity">
            <div className="prf-avatar">{initial}</div>
            <h2>{fullName || "İsimsiz"}</h2>
            <p>{email || "E-posta yok"}</p>
            <span className="prf-pill">{roleLabel(profile?.role ?? session.principal.role)}</span>
          </article>

          <article className="prf-card">
            <div className="prf-card-head">
              <div>
                <h2>Hesap bilgileri</h2>
                <p className="prf-note">Bu bilgiler menüde ve sistem kayıtlarında görünür.</p>
              </div>
            </div>
            <form className="prf-form" onSubmit={(event) => void save(event)}>
              <label>
                Ad soyad
                <div className="prf-field">
                  <UserRound size={16} />
                  <input onChange={(event) => setFullName(event.target.value)} required value={fullName} />
                </div>
              </label>
              <label>
                E-posta
                <div className="prf-field">
                  <Mail size={16} />
                  <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
                </div>
              </label>
              <label>
                Telefon
                <input onChange={(event) => setPhone(event.target.value)} placeholder="05xx xxx xx xx" value={phone} />
              </label>
              <button className="prf-btn" disabled={saving} type="submit">
                {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                Profili kaydet
              </button>
            </form>
          </article>

          <article className="prf-card">
            <div className="prf-card-head">
              <h2>Hesap özeti</h2>
            </div>
            <dl className="prf-meta">
              <div>
                <dt>Rol</dt>
                <dd>{roleLabel(profile?.role ?? session.principal.role)}</dd>
              </div>
              <div>
                <dt>Durum</dt>
                <dd>{profile?.status === "active" ? "Aktif" : profile?.status ?? "—"}</dd>
              </div>
              <div>
                <dt>Kayıt</dt>
                <dd>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("tr-TR") : "—"}</dd>
              </div>
            </dl>
            <p className="prf-note">
              <ShieldCheck size={14} /> Şifre değişimi ilk giriş veya şifremi unuttum akışından yapılır.
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
