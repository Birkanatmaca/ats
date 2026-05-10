import { BrainCircuit, Loader2, Mail, MessageSquare, Power, ShieldCheck } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import type { IntegrationCredential, PlatformSettings, SystemStatus } from "../../lib/api";
import { api } from "../../lib/api";
import { CredentialEditor } from "../components/CredentialEditor";
import "./SettingsPage.css";

type SettingsTab = "maintenance" | "ai" | "sms" | "mail";

function credentialsForTab(credentials: IntegrationCredential[], tab: SettingsTab) {
  if (tab === "ai") return credentials.filter((credential) => credential.key.includes("ai"));
  if (tab === "sms") return credentials.filter((credential) => credential.key.includes("sms"));
  if (tab === "mail") return credentials.filter((credential) => credential.key.includes("mail") || credential.key.includes("smtp"));
  return [];
}

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
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("maintenance");

  const credentials = settings?.credentials ?? [];
  const activeCredentials = credentialsForTab(credentials, activeSettingsTab);
  const settingsTabs: Array<{ id: SettingsTab; label: string; icon: ReactNode; count?: number }> = [
    { id: "maintenance", label: "Bakım", icon: <Power size={16} /> },
    { id: "ai", label: "AI", icon: <BrainCircuit size={16} />, count: credentialsForTab(credentials, "ai").length },
    { id: "sms", label: "SMS", icon: <MessageSquare size={16} />, count: credentialsForTab(credentials, "sms").length },
    { id: "mail", label: "E-posta", icon: <Mail size={16} />, count: credentialsForTab(credentials, "mail").length }
  ];

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
      {settingsError && <div className="form-error workspace-error sa-alert">{settingsError}</div>}

      <form className="sa-settings-form" onSubmit={(event) => void saveSettings(event)}>
        <div className="sa-settings-tabs" role="tablist" aria-label="Ayar sekmeleri">
          {settingsTabs.map((tab) => (
            <button
              aria-selected={activeSettingsTab === tab.id}
              className={`sa-settings-tab ${activeSettingsTab === tab.id ? "is-active" : ""}`}
              key={tab.id}
              type="button"
              role="tab"
              onClick={() => setActiveSettingsTab(tab.id)}
            >
              <span className="sa-settings-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {typeof tab.count === "number" && <small>{tab.count}</small>}
            </button>
          ))}
        </div>

        <section className="sa-card sa-settings-tab-card">
          <div className="sa-card-body sa-cred-list">
            {activeSettingsTab === "maintenance" ? (
              <div className="sa-maintenance-tab">
                <div className="sa-maintenance-state">
                  <div className={maintenanceEnabled ? "sa-maint-pill enabled" : "sa-maint-pill"}>
                    <Power size={18} />
                    {maintenanceEnabled ? "Bakım açık" : "Bakım kapalı"}
                  </div>
                  <div className="sa-settings-meta">
                    <span>Son güncelleme</span>
                    <strong>{settings?.maintenance.updatedAt ? new Date(settings.maintenance.updatedAt).toLocaleString("tr-TR") : "-"}</strong>
                  </div>
                </div>

                <label className="toggle-row">
                  <input type="checkbox" checked={maintenanceEnabled} onChange={(event) => setMaintenanceEnabled(event.target.checked)} />
                  <span />
                  <strong>{maintenanceEnabled ? "Aktif" : "Pasif"}</strong>
                </label>

                <label className="field">
                  <span>Bakım mesajı</span>
                  <textarea value={maintenanceMessage} onChange={(event) => setMaintenanceMessage(event.target.value)} rows={6} />
                </label>
              </div>
            ) : (
              <>
                {activeCredentials.map((credential) => (
                  <CredentialEditor
                    credential={credential}
                    key={credential.key}
                    value={credentialValues[credential.key] ?? ""}
                    clear={Boolean(clearValues[credential.key])}
                    onValueChange={(value) => setCredentialValues((current) => ({ ...current, [credential.key]: value }))}
                    onClearChange={(value) => setClearValues((current) => ({ ...current, [credential.key]: value }))}
                  />
                ))}
                {activeCredentials.length === 0 && <p className="empty-text">Bu sekmede servis anahtarı bulunmuyor.</p>}
              </>
            )}
          </div>
        </section>

        <section className="sa-save-bar">
          <button className="primary-action" type="submit" disabled={saving || !settings}>
            {saving ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
            Ayarları kaydet
          </button>
        </section>
      </form>
    </section>
  );
}
