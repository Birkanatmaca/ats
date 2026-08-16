import { Eye, EyeOff, Loader2, Mail, MessageSquare, Power, Save, ShieldCheck, Zap } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MailSettings, PlatformSettings, SMSSettings, SystemStatus } from "../../lib/api";
import { api } from "../../lib/api";
import "./SettingsPage.css";

type SettingsTab = "maintenance" | "mail" | "sms";

const defaultMail = (): MailSettings => ({
  enabled: false,
  provider: "smtp",
  host: "",
  port: 587,
  username: "",
  fromName: "OGTA",
  fromEmail: "",
  useTls: true,
  passwordSet: false
});

const defaultSMS = (): SMSSettings => ({
  enabled: false,
  provider: "netgsm",
  username: "",
  sender: "",
  baseUrl: "",
  apiKeySet: false
});

export function SettingsPage({
  settings,
  onRefresh,
  onSystemStatusChange
}: {
  settings?: PlatformSettings;
  onRefresh: () => Promise<void>;
  onSystemStatusChange: (status: SystemStatus) => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("maintenance");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("Sistem bakımı devam ediyor. Kısa süre sonra tekrar deneyebilirsiniz.");
  const [mailDraft, setMailDraft] = useState<MailSettings>(defaultMail);
  const [mailPassword, setMailPassword] = useState("");
  const [clearMailPassword, setClearMailPassword] = useState(false);
  const [showMailPassword, setShowMailPassword] = useState(false);
  const [smsDraft, setSMSDraft] = useState<SMSSettings>(defaultSMS);
  const [smsApiKey, setSMSApiKey] = useState("");
  const [clearSMSKey, setClearSMSKey] = useState(false);
  const [showSMSKey, setShowSMSKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }
    setMaintenanceEnabled(settings.maintenance.enabled);
    setMaintenanceMessage(settings.maintenance.message);
    setMailDraft({ ...defaultMail(), ...settings.mail });
    setSMSDraft({ ...defaultSMS(), ...settings.sms });
    setMailPassword("");
    setSMSApiKey("");
    setClearMailPassword(false);
    setClearSMSKey(false);
  }, [settings]);

  async function applyUpdated(updated: PlatformSettings, success: string) {
    onSystemStatusChange({ maintenance: updated.maintenance });
    setNotice(success);
    await onRefresh();
  }

  async function saveMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateSuperAdminSettings({
        maintenance: { enabled: maintenanceEnabled, message: maintenanceMessage }
      });
      await applyUpdated(updated, maintenanceEnabled ? "Bakım modu açıldı." : "Bakım ayarları kaydedildi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Bakım ayarları kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    setTestResult(null);
    try {
      const updated = await api.updateSuperAdminSettings({
        mail: {
          ...mailDraft,
          password: clearMailPassword ? undefined : mailPassword.trim() || undefined,
          clearPassword: clearMailPassword
        }
      });
      setMailPassword("");
      setClearMailPassword(false);
      await applyUpdated(updated, "E-posta bağlantısı kaydedildi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "E-posta ayarları kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSMS(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    setTestResult(null);
    try {
      const updated = await api.updateSuperAdminSettings({
        sms: {
          ...smsDraft,
          apiKey: clearSMSKey ? undefined : smsApiKey.trim() || undefined,
          clearApiKey: clearSMSKey
        }
      });
      setSMSApiKey("");
      setClearSMSKey(false);
      await applyUpdated(updated, "SMS bağlantısı kaydedildi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "SMS ayarları kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(kind: "mail" | "sms") {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const result = kind === "mail" ? await api.testSuperAdminMail() : await api.testSuperAdminSMS();
      setTestResult(result.ok ? `${result.message}${result.latencyMs ? ` (${result.latencyMs} ms)` : ""}` : result.message);
    } catch (testError) {
      setTestResult(testError instanceof Error ? testError.message : "Bağlantı testi çalıştırılamadı.");
    } finally {
      setTesting(false);
    }
  }

  const mailReady = Boolean(settings?.mail.enabled && (settings.mail.provider !== "smtp" || settings.mail.host));
  const smsReady = Boolean(settings?.sms.enabled && settings.sms.apiKeySet);

  return (
    <section className="set">
      <header className="set-hero">
        <div>
          <p className="set-kicker">Sistem</p>
          <h1>Ayarlar</h1>
        </div>
        <p className="set-hero-note">Bakım, e-posta ve SMS bağlantıları</p>
      </header>

      <div className="set-status">
        <div>
          <span>Bakım</span>
          <strong>{settings?.maintenance.enabled ? "Açık" : "Kapalı"}</strong>
        </div>
        <div>
          <span>E-posta</span>
          <strong>{mailReady ? "Bağlı" : "Tanımsız"}</strong>
        </div>
        <div>
          <span>SMS</span>
          <strong>{smsReady ? "Bağlı" : "Tanımsız"}</strong>
        </div>
        <div>
          <span>ogta.ai</span>
          <strong>
            <Link to="/admin/ai">Sağlayıcıdan yönet</Link>
          </strong>
        </div>
      </div>

      <div className="set-tabs">
        <button className={tab === "maintenance" ? "is-active" : undefined} onClick={() => setTab("maintenance")} type="button">
          <Power size={16} />
          Bakım
        </button>
        <button className={tab === "mail" ? "is-active" : undefined} onClick={() => setTab("mail")} type="button">
          <Mail size={16} />
          E-posta
        </button>
        <button className={tab === "sms" ? "is-active" : undefined} onClick={() => setTab("sms")} type="button">
          <MessageSquare size={16} />
          SMS
        </button>
      </div>

      {error ? <div className="form-error sa-alert">{error}</div> : null}
      {notice ? <div className="set-notice">{notice}</div> : null}

      {tab === "maintenance" ? (
        <article className="set-card">
          <div className="set-card-head">
            <div>
              <h2>Bakım modu</h2>
              <p className="set-note">Açıkken kurum kullanıcıları bakım ekranını görür. Süper admin girişi çalışmaya devam eder.</p>
            </div>
            <span className={`set-pill ${maintenanceEnabled ? "set-pill--warn" : "set-pill--ok"}`}>
              {maintenanceEnabled ? "Bakım açık" : "Bakım kapalı"}
            </span>
          </div>
          <form className="set-form" onSubmit={(event) => void saveMaintenance(event)}>
            <label className="set-switch">
              <input checked={maintenanceEnabled} onChange={(event) => setMaintenanceEnabled(event.target.checked)} type="checkbox" />
              Bakım modunu aç
            </label>
            <label>
              Kullanıcılara gösterilecek mesaj
              <textarea onChange={(event) => setMaintenanceMessage(event.target.value)} rows={5} value={maintenanceMessage} />
            </label>
            <small>Son güncelleme: {settings?.maintenance.updatedAt ? new Date(settings.maintenance.updatedAt).toLocaleString("tr-TR") : "—"}</small>
            <button className="set-btn set-btn--primary" disabled={saving || !settings} type="submit">
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              Bakımı kaydet
            </button>
          </form>
        </article>
      ) : tab === "mail" ? (
        <article className="set-card">
          <div className="set-card-head">
            <div>
              <h2>E-posta bağlantısı</h2>
              <p className="set-note">Duyuru, şifre sıfırlama ve veli bildirimleri bu SMTP / API hesabından gider.</p>
            </div>
            <span className={`set-pill ${mailReady ? "set-pill--ok" : "set-pill--muted"}`}>{mailReady ? "Hazır" : "Eksik"}</span>
          </div>
          <form className="set-form" onSubmit={(event) => void saveMail(event)}>
            <label className="set-switch">
              <input checked={mailDraft.enabled} onChange={(event) => setMailDraft((current) => ({ ...current, enabled: event.target.checked }))} type="checkbox" />
              E-posta gönderimini aç
            </label>
            <div className="set-fields-2">
              <label>
                Sağlayıcı
                <select onChange={(event) => setMailDraft((current) => ({ ...current, provider: event.target.value }))} value={mailDraft.provider}>
                  <option value="smtp">SMTP</option>
                  <option value="resend">Resend</option>
                  <option value="sendgrid">SendGrid</option>
                </select>
              </label>
              <label>
                Gönderen adı
                <input onChange={(event) => setMailDraft((current) => ({ ...current, fromName: event.target.value }))} value={mailDraft.fromName} />
              </label>
              <label>
                Gönderen e-posta
                <input onChange={(event) => setMailDraft((current) => ({ ...current, fromEmail: event.target.value }))} placeholder="noreply@okul.local" type="email" value={mailDraft.fromEmail} />
              </label>
              {mailDraft.provider === "smtp" ? (
                <>
                  <label>
                    SMTP sunucu
                    <input onChange={(event) => setMailDraft((current) => ({ ...current, host: event.target.value }))} placeholder="smtp.ornek.com" value={mailDraft.host} />
                  </label>
                  <label>
                    Port
                    <input
                      min={1}
                      onChange={(event) => setMailDraft((current) => ({ ...current, port: Number(event.target.value) }))}
                      type="number"
                      value={mailDraft.port}
                    />
                  </label>
                  <label>
                    Kullanıcı adı
                    <input onChange={(event) => setMailDraft((current) => ({ ...current, username: event.target.value }))} value={mailDraft.username} />
                  </label>
                </>
              ) : null}
              <label>
                {mailDraft.provider === "smtp" ? "Şifre" : "API anahtarı"}
                <div className="set-secret">
                  <input
                    autoComplete="off"
                    disabled={clearMailPassword}
                    onChange={(event) => setMailPassword(event.target.value)}
                    placeholder={mailDraft.passwordSet ? `Kayıtlı: ${mailDraft.passwordHint}` : "Yeni değer"}
                    type={showMailPassword ? "text" : "password"}
                    value={mailPassword}
                  />
                  <button className="set-btn set-btn--ghost set-btn--icon" onClick={() => setShowMailPassword((current) => !current)} type="button">
                    {showMailPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            </div>
            {mailDraft.provider === "smtp" ? (
              <label className="set-switch">
                <input checked={mailDraft.useTls} onChange={(event) => setMailDraft((current) => ({ ...current, useTls: event.target.checked }))} type="checkbox" />
                TLS kullan
              </label>
            ) : null}
            <label className="set-switch">
              <input checked={clearMailPassword} onChange={(event) => setClearMailPassword(event.target.checked)} type="checkbox" />
              Kayıtlı şifreyi / anahtarı sil
            </label>
            <div className="set-actions">
              <button className="set-btn set-btn--primary" disabled={saving || !settings} type="submit">
                {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                E-postayı kaydet
              </button>
              <button className="set-btn set-btn--ghost" disabled={testing} onClick={() => void testConnection("mail")} type="button">
                {testing ? <Loader2 className="spin" size={16} /> : <Zap size={16} />}
                Bağlantıyı test et
              </button>
            </div>
            {testResult ? <p className="set-note">{testResult}</p> : null}
          </form>
        </article>
      ) : (
        <article className="set-card">
          <div className="set-card-head">
            <div>
              <h2>SMS bağlantısı</h2>
              <p className="set-note">Yoklama ve duyuru SMS’leri bu hesap üzerinden gider. Gerçek SMS testte gönderilmez.</p>
            </div>
            <span className={`set-pill ${smsReady ? "set-pill--ok" : "set-pill--muted"}`}>{smsReady ? "Hazır" : "Eksik"}</span>
          </div>
          <form className="set-form" onSubmit={(event) => void saveSMS(event)}>
            <label className="set-switch">
              <input checked={smsDraft.enabled} onChange={(event) => setSMSDraft((current) => ({ ...current, enabled: event.target.checked }))} type="checkbox" />
              SMS gönderimini aç
            </label>
            <div className="set-fields-2">
              <label>
                Sağlayıcı
                <select onChange={(event) => setSMSDraft((current) => ({ ...current, provider: event.target.value }))} value={smsDraft.provider}>
                  <option value="netgsm">Netgsm</option>
                  <option value="iletimerkezi">İleti Merkezi</option>
                  <option value="twilio">Twilio</option>
                  <option value="custom">Özel</option>
                </select>
              </label>
              <label>
                Kullanıcı adı
                <input onChange={(event) => setSMSDraft((current) => ({ ...current, username: event.target.value }))} value={smsDraft.username} />
              </label>
              <label>
                SMS başlığı
                <input onChange={(event) => setSMSDraft((current) => ({ ...current, sender: event.target.value }))} placeholder="OGTA" value={smsDraft.sender} />
              </label>
              <label>
                API adresi (isteğe bağlı)
                <input onChange={(event) => setSMSDraft((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="https://..." value={smsDraft.baseUrl} />
              </label>
              <label>
                API anahtarı / şifre
                <div className="set-secret">
                  <input
                    autoComplete="off"
                    disabled={clearSMSKey}
                    onChange={(event) => setSMSApiKey(event.target.value)}
                    placeholder={smsDraft.apiKeySet ? `Kayıtlı: ${smsDraft.apiKeyHint}` : "Yeni değer"}
                    type={showSMSKey ? "text" : "password"}
                    value={smsApiKey}
                  />
                  <button className="set-btn set-btn--ghost set-btn--icon" onClick={() => setShowSMSKey((current) => !current)} type="button">
                    {showSMSKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            </div>
            <label className="set-switch">
              <input checked={clearSMSKey} onChange={(event) => setClearSMSKey(event.target.checked)} type="checkbox" />
              Kayıtlı anahtarı sil
            </label>
            <div className="set-actions">
              <button className="set-btn set-btn--primary" disabled={saving || !settings} type="submit">
                {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                SMS’i kaydet
              </button>
              <button className="set-btn set-btn--ghost" disabled={testing} onClick={() => void testConnection("sms")} type="button">
                {testing ? <Loader2 className="spin" size={16} /> : <Zap size={16} />}
                Bilgileri doğrula
              </button>
            </div>
            {testResult ? <p className="set-note">{testResult}</p> : null}
          </form>
        </article>
      )}

      <article className="set-card set-card--soft">
        <div className="set-card-head">
          <div>
            <h2>ogta.ai anahtarları</h2>
            <p className="set-note">API anahtarı havuzu, model ve kota ayarları ogta.ai sayfasındadır.</p>
          </div>
          <Link className="set-btn set-btn--ghost" to="/admin/ai">
            <ShieldCheck size={16} />
            ogta.ai’ye git
          </Link>
        </div>
      </article>
    </section>
  );
}
