import { KeyRound, Loader2, Power, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { PlatformSettings, SystemStatus } from "../../lib/api";
import { api } from "../../lib/api";
import { CredentialEditor } from "../components/CredentialEditor";
import { PanelHeader } from "../components/PanelHeader";
import "./SettingsPage.css";

export function SettingsPage({
  settings,
  onRefresh,
  onSystemStatusChange
}: {
  settings?: PlatformSettings;
  onRefresh: () => Promise<void>;
  onSystemStatusChange: (status: SystemStatus) => void;
}) {
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("Sistem bakımı devam ediyor. Kısa süre sonra tekrar deneyebilirsiniz.");
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [clearValues, setClearValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) {
      return;
    }
    setSaving(true);
    setSettingsError(null);
    try {
      const updated = await api.updateSuperAdminSettings({
        maintenance: {
          enabled: maintenanceEnabled,
          message: maintenanceMessage
        },
        credentials: settings.credentials.map((credential) => ({
          key: credential.key,
          value: credentialValues[credential.key] ?? "",
          clear: Boolean(clearValues[credential.key])
        }))
      });
      onSystemStatusChange({ maintenance: updated.maintenance });
      setCredentialValues({});
      setClearValues({});
      await onRefresh();
    } catch (updateError) {
      setSettingsError(updateError instanceof Error ? updateError.message : "Ayarlar güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!settings) {
      return;
    }
    setMaintenanceEnabled(settings.maintenance.enabled);
    setMaintenanceMessage(settings.maintenance.message);
    setCredentialValues({});
    setClearValues({});
  }, [settings]);

  return (
    <section className="sa-page-stack">
      <section className="sa-settings-hero">
        <div>
          <span className="sa-kicker">Sistem ayarları</span>
          <h2>Entegrasyon anahtarları ve bakım modu</h2>
        </div>
        <div className={maintenanceEnabled ? "sa-maint-pill enabled" : "sa-maint-pill"}>
          <Power size={18} />
          {maintenanceEnabled ? "Bakım açık" : "Bakım kapalı"}
        </div>
      </section>

      {settingsError && <div className="form-error workspace-error sa-alert">{settingsError}</div>}

      <form className="sa-settings-grid" onSubmit={(event) => void saveSettings(event)}>
        <section className="sa-card">
          <PanelHeader kicker="Bakım" title="Bakım modu" icon={<Power size={22} />} />
          <div className="sa-card-body">
            <label className="toggle-row">
              <input type="checkbox" checked={maintenanceEnabled} onChange={(event) => setMaintenanceEnabled(event.target.checked)} />
              <span />
              <strong>{maintenanceEnabled ? "Aktif" : "Pasif"}</strong>
            </label>
            <label className="field">
              <span>Bakım mesajı</span>
              <textarea value={maintenanceMessage} onChange={(event) => setMaintenanceMessage(event.target.value)} rows={5} />
            </label>
            <div className="sa-settings-meta">
              <span>Son güncelleme</span>
              <strong>{settings?.maintenance.updatedAt ? new Date(settings.maintenance.updatedAt).toLocaleString("tr-TR") : "-"}</strong>
            </div>
          </div>
        </section>

        <section className="sa-card">
          <PanelHeader kicker="Anahtarlar" title="Servis bağlantıları" icon={<KeyRound size={22} />} />
          <div className="sa-card-body sa-cred-list">
            {(settings?.credentials ?? []).map((credential) => (
              <CredentialEditor
                credential={credential}
                key={credential.key}
                value={credentialValues[credential.key] ?? ""}
                clear={Boolean(clearValues[credential.key])}
                onValueChange={(value) => setCredentialValues((current) => ({ ...current, [credential.key]: value }))}
                onClearChange={(value) => setClearValues((current) => ({ ...current, [credential.key]: value }))}
              />
            ))}
          </div>
        </section>

        <section className="sa-save-bar" style={{ gridColumn: "1 / -1" }}>
          <button className="primary-action" type="submit" disabled={saving || !settings}>
            {saving ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
            Ayarları kaydet
          </button>
        </section>
      </form>
    </section>
  );
}
