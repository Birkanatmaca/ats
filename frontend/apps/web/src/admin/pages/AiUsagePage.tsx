import { ChevronDown, ChevronUp, Coins, Eye, EyeOff, KeyRound, Loader2, MessageSquare, Plus, RefreshCw, RotateCcw, Sparkles, Trash2, UsersRound, Zap } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { AIPlatformAnalytics, AICostSettings, AIProviderKey, AIProviderSettings, AIProviderStatus, AiTenantQuota } from "../../lib/api";
import { api } from "../../lib/api";
import { formatTRY } from "../utils/labels";
import "./AiUsagePage.css";

const periodOptions = [7, 30, 90];

const roleLabels: Record<string, string> = {
  teacher: "Öğretmen",
  guidance: "Rehberlik",
  principal: "Müdür",
  guardian: "Veli",
  system_admin: "Sistem yöneticisi",
  unknown: "Diğer"
};

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function keyStatusLabel(status: string) {
  if (status === "exhausted") return "Tükendi";
  if (status === "error") return "Hata";
  if (status === "disabled") return "Kapalı";
  return "Hazır";
}

function keyStatusClass(status: string) {
  if (status === "exhausted") return "ai-pill--warn";
  if (status === "error") return "ai-pill--off";
  if (status === "disabled") return "ai-pill--muted";
  return "ai-pill--ok";
}

export function AiUsagePage() {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<AIPlatformAnalytics | null>(null);
  const [costSettings, setCostSettings] = useState<AICostSettings>({
    inputCostPer1mUsd: 0.15,
    outputCostPer1mUsd: 0.6,
    usdTryRate: 34.5
  });
  const [loading, setLoading] = useState(true);
  const [savingCosts, setSavingCosts] = useState(false);
  const [runningRetention, setRunningRetention] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, AiTenantQuota>>({});
  const [savingQuotaFor, setSavingQuotaFor] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<AIProviderStatus | null>(null);
  const [providerDraft, setProviderDraft] = useState<AIProviderSettings>({ model: "gpt-4o-mini", useLlm: true });
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [showNewKey, setShowNewKey] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>(["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"]);
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [tab, setTab] = useState<"usage" | "provider" | "quotas">("usage");
  const [providerPanel, setProviderPanel] = useState<"keys" | "model" | "costs" | "retention">("keys");

  const load = useCallback(async (periodDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.superAdminAIOverview(periodDays);
      setAnalytics(data);
      setCostSettings(data.costSettings);
      setProviderStatus(data.provider);
      setProviderDraft({
        model: data.provider?.model ?? "gpt-4o-mini",
        useLlm: data.provider?.useLlm ?? true
      });
      setQuotaDrafts(
        Object.fromEntries(
          data.byTenant.map((row) => [
            row.tenantId,
            {
              dailyMessageLimit: row.dailyMessageLimit ?? null,
              monthlyTokenLimit: row.monthlyTokenLimit ?? null
            }
          ])
        )
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "AI kullanım verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  async function saveCostSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCosts(true);
    setNotice(null);
    setError(null);
    try {
      const updated = await api.updateSuperAdminAICostSettings(costSettings);
      setCostSettings(updated);
      setNotice("Maliyet ayarları kaydedildi.");
      await load(days);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Maliyet ayarları kaydedilemedi.");
    } finally {
      setSavingCosts(false);
    }
  }

  async function saveTenantQuota(tenantId: string) {
    setSavingQuotaFor(tenantId);
    setNotice(null);
    setError(null);
    try {
      await api.updateSuperAdminInstitutionAIQuota(tenantId, quotaDrafts[tenantId] ?? {});
      setNotice("Kurum kotası güncellendi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Kurum kotası kaydedilemedi.");
    } finally {
      setSavingQuotaFor(null);
    }
  }

  useEffect(() => {
    void api.superAdminAIProvider().then((payload) => {
      setModelOptions(payload.models);
      if (!analytics) {
        setProviderStatus(payload.status);
        setProviderDraft({ model: payload.status.model, useLlm: payload.status.useLlm });
      }
    }).catch(() => undefined);
  }, [analytics]);

  async function saveProviderSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProvider(true);
    setNotice(null);
    setError(null);
    setTestResult(null);
    try {
      const updated = await api.updateSuperAdminAIProvider(providerDraft);
      setProviderStatus(updated.status);
      setProviderDraft({ model: updated.settings.model, useLlm: updated.settings.useLlm });
      setNotice("AI sağlayıcı ayarları kaydedildi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "AI sağlayıcı ayarları kaydedilemedi.");
    } finally {
      setSavingProvider(false);
    }
  }

  function applyProviderStatus(status: AIProviderStatus) {
    setProviderStatus(status);
    setProviderDraft({ model: status.model, useLlm: status.useLlm });
  }

  async function addProviderKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProvider(true);
    setNotice(null);
    setError(null);
    try {
      const updated = await api.addSuperAdminAIProviderKey({
        label: newKeyLabel.trim(),
        apiKey: newKeyValue.trim()
      });
      applyProviderStatus(updated.status);
      setNewKeyLabel("");
      setNewKeyValue("");
      setShowNewKey(false);
      setNotice("API anahtarı havuza eklendi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "API anahtarı eklenemedi.");
    } finally {
      setSavingProvider(false);
    }
  }

  async function runKeyAction(keyId: string, action: () => Promise<AIProviderStatus>, success: string) {
    setBusyKeyId(keyId);
    setNotice(null);
    setError(null);
    setTestResult(null);
    try {
      applyProviderStatus(await action());
      setNotice(success);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "İşlem başarısız.");
    } finally {
      setBusyKeyId(null);
    }
  }

  async function moveProviderKey(key: AIProviderKey, direction: -1 | 1) {
    const platformKeys = (providerStatus?.keys ?? []).filter((item) => item.source !== "env");
    const index = platformKeys.findIndex((item) => item.id === key.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= platformKeys.length) {
      return;
    }
    const ordered = [...platformKeys];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(next, 0, moved);
    await runKeyAction(key.id, async () => (await api.reorderSuperAdminAIProviderKeys(ordered.map((item) => item.id))).status, "Anahtar sırası güncellendi.");
  }

  async function testProvider(keyId?: string) {
    setTestingProvider(true);
    setTestResult(null);
    setError(null);
    if (keyId) {
      setBusyKeyId(keyId);
    }
    try {
      const result = keyId ? await api.testSuperAdminAIProviderKey(keyId) : await api.testSuperAdminAIProvider();
      if (result.ok) {
        const used = result.keyHint ? ` · ${result.keyHint}` : "";
        setTestResult(`Bağlantı başarılı (${result.latencyMs} ms)${used} — ${result.responseHint ?? "yanıt alındı"}`);
      } else {
        setTestResult(result.error ?? "Bağlantı testi başarısız.");
      }
    } catch (testError) {
      setTestResult(testError instanceof Error ? testError.message : "Bağlantı testi çalıştırılamadı.");
    } finally {
      setTestingProvider(false);
      setBusyKeyId(null);
    }
  }

  async function runRetention() {
    setRunningRetention(true);
    setNotice(null);
    setError(null);
    try {
      const result = await api.runSuperAdminAIRetention();
      setNotice(
        `Saklama temizliği tamamlandı: ${result.messagesDeleted} mesaj, ${result.conversationsArchived} konuşma arşivlendi.`
      );
      await load(days);
    } catch (retentionError) {
      setError(retentionError instanceof Error ? retentionError.message : "Saklama temizliği çalıştırılamadı.");
    } finally {
      setRunningRetention(false);
    }
  }

  const dailyChart = (analytics?.dailyUsage ?? []).map((point) => ({
    name: point.label.slice(5),
    mesaj: point.userMessages,
    token: point.tokenInput + point.tokenOutput
  }));
  const tenantChart = (analytics?.byTenant ?? []).slice(0, 8).map((row) => ({
    name: row.tenantName.length > 16 ? `${row.tenantName.slice(0, 14)}…` : row.tenantName,
    mesaj: row.userMessages,
    maliyet: row.estCostTry
  }));
  const roleChart = (analytics?.byRole ?? []).map((row) => ({
    name: roleLabels[row.role] ?? row.role,
    mesaj: row.userMessages,
    token: row.tokenInput + row.tokenOutput
  }));

  return (
    <section className="ai">
      <header className="ai-hero">
        <div>
          <p className="ai-kicker">ogta.ai</p>
          <h1>AI kullanımı</h1>
        </div>
        <div className="ai-toolbar">
          <div className="ai-period">
            {periodOptions.map((option) => (
              <button className={option === days ? "is-active" : undefined} key={option} onClick={() => setDays(option)} type="button">
                {option} gün
              </button>
            ))}
          </div>
          <button className="ai-btn ai-btn--ghost" disabled={loading} onClick={() => void load(days)} type="button">
            <RefreshCw className={loading ? "spin" : undefined} size={16} />
            Yenile
          </button>
        </div>
      </header>

      <div className="ai-kpi-grid">
        <article className="ai-kpi">
          <div className="ai-kpi-icon">
            <MessageSquare size={18} />
          </div>
          <span>Mesaj</span>
          <strong>{formatNumber(analytics?.totalUserMessages ?? 0)}</strong>
          <small>{formatNumber(analytics?.totalAssistantMessages ?? 0)} yanıt</small>
        </article>
        <article className="ai-kpi">
          <div className="ai-kpi-icon ai-kpi-icon--violet">
            <Sparkles size={18} />
          </div>
          <span>Token</span>
          <strong>{formatNumber(analytics?.tokenInput ?? 0)}</strong>
          <small>{formatNumber(analytics?.tokenOutput ?? 0)} çıkış</small>
        </article>
        <article className="ai-kpi">
          <div className="ai-kpi-icon ai-kpi-icon--green">
            <Coins size={18} />
          </div>
          <span>Maliyet</span>
          <strong>{formatTRY(analytics?.estCostTry ?? 0)}</strong>
          <small>{formatUSD(analytics?.estCostUsd ?? 0)}</small>
        </article>
        <article className="ai-kpi">
          <div className="ai-kpi-icon ai-kpi-icon--amber">
            <UsersRound size={18} />
          </div>
          <span>Kullanıcı</span>
          <strong>{formatNumber(analytics?.activeUsers ?? 0)}</strong>
          <small>{formatNumber(analytics?.totalConversations ?? 0)} konuşma</small>
        </article>
      </div>

      <div className="ai-tabs">
        <button className={tab === "usage" ? "is-active" : undefined} onClick={() => setTab("usage")} type="button">
          Kullanım
        </button>
        <button className={tab === "provider" ? "is-active" : undefined} onClick={() => setTab("provider")} type="button">
          Sağlayıcı
        </button>
        <button className={tab === "quotas" ? "is-active" : undefined} onClick={() => setTab("quotas")} type="button">
          Kota
        </button>
      </div>

      {error ? <div className="form-error sa-alert">{error}</div> : null}
      {notice ? <div className="ai-notice">{notice}</div> : null}

      {loading && !analytics ? (
        <div className="loading-line">
          <Loader2 className="spin" size={18} />
          AI verileri yükleniyor
        </div>
      ) : tab === "usage" ? (
        <>
          <div className="ai-chart-grid">
            <article className="ai-card">
              <h2>Günlük kullanım</h2>
              <div className="ai-chart">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={dailyChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0" }} />
                    <Legend />
                    <Line dataKey="mesaj" name="Mesaj" stroke="#2563eb" strokeWidth={2} type="monotone" />
                    <Line dataKey="token" name="Token" stroke="#7c3aed" strokeWidth={2} type="monotone" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="ai-card">
              <h2>Kurum maliyeti</h2>
              <div className="ai-chart">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={tenantChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0" }} />
                    <Legend />
                    <Bar dataKey="mesaj" fill="#2563eb" name="Mesaj" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="maliyet" fill="#059669" name="Maliyet (TRY)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
          <article className="ai-card">
            <h2>Rol bazlı kullanım</h2>
            <div className="ai-chart">
              {roleChart.length === 0 ? (
                <p className="ai-empty">Henüz rol bazlı kullanım yok.</p>
              ) : (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={roleChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0" }} />
                    <Legend />
                    <Bar dataKey="mesaj" fill="#2563eb" name="Mesaj" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="token" fill="#d97706" name="Token" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
          <article className="ai-card">
            <h2>Model kullanımı</h2>
            {(analytics?.byModel ?? []).length === 0 ? (
              <p className="ai-empty">Henüz model kullanımı yok.</p>
            ) : (
              <div className="ai-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Yanıt</th>
                      <th>Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.byModel.map((row) => (
                      <tr key={row.model}>
                        <td>
                          <strong>{row.model}</strong>
                        </td>
                        <td>{formatNumber(row.messages)}</td>
                        <td>{formatNumber(row.tokenInput + row.tokenOutput)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </>
      ) : tab === "provider" ? (
        <div className="ai-provider">
          <div className="ai-status-strip">
            <div>
              <span>Durum</span>
              <strong>{providerStatus?.llmReady ? "Çalışıyor" : "Kapalı"}</strong>
            </div>
            <div>
              <span>Hazır anahtar</span>
              <strong>{providerStatus?.readyKeyCount ?? 0}</strong>
            </div>
            <div>
              <span>Aktif model</span>
              <strong>{providerStatus?.model ?? providerDraft.model}</strong>
            </div>
            <div>
              <span>Sıradaki</span>
              <strong>{providerStatus?.keyHint ?? "Yok"}</strong>
            </div>
          </div>

          <div className="ai-subtabs">
            <button className={providerPanel === "keys" ? "is-active" : undefined} onClick={() => setProviderPanel("keys")} type="button">
              Anahtarlar
            </button>
            <button className={providerPanel === "model" ? "is-active" : undefined} onClick={() => setProviderPanel("model")} type="button">
              Model
            </button>
            <button className={providerPanel === "costs" ? "is-active" : undefined} onClick={() => setProviderPanel("costs")} type="button">
              Maliyet
            </button>
            <button className={providerPanel === "retention" ? "is-active" : undefined} onClick={() => setProviderPanel("retention")} type="button">
              Saklama
            </button>
          </div>

          {providerPanel === "keys" ? (
            <article className="ai-card">
              <div className="ai-card-head">
                <div>
                  <h2>API anahtar havuzu</h2>
                  <p className="ai-note">Üstteki önce denenir. Kota veya hata olunca sıradaki kullanılır. Tam anahtar gösterilmez.</p>
                </div>
                <button className="ai-btn ai-btn--ghost" disabled={testingProvider} onClick={() => void testProvider()} type="button">
                  {testingProvider && !busyKeyId ? <Loader2 className="spin" size={16} /> : <Zap size={16} />}
                  Havuzu test et
                </button>
              </div>
              {(providerStatus?.keys ?? []).length === 0 ? (
                <p className="ai-empty">Henüz anahtar yok. Aşağıdan ekleyin.</p>
              ) : (
                <div className="ai-table-wrap">
                  <table className="ai-key-table">
                    <thead>
                      <tr>
                        <th>Sıra</th>
                        <th>Anahtar</th>
                        <th>Durum</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(providerStatus?.keys ?? []).map((key, poolIndex) => {
                        const platformKeys = (providerStatus?.keys ?? []).filter((item) => item.source !== "env");
                        const platformIndex = platformKeys.findIndex((item) => item.id === key.id);
                        const busy = busyKeyId === key.id;
                        return (
                          <tr className={providerStatus?.activeKeyId === key.id ? "is-active" : undefined} key={key.id}>
                            <td>
                              <div className="ai-key-order">
                                <button
                                  className="ai-btn ai-btn--ghost ai-btn--icon"
                                  disabled={key.source === "env" || platformIndex <= 0 || busy}
                                  onClick={() => void moveProviderKey(key, -1)}
                                  type="button"
                                >
                                  <ChevronUp size={16} />
                                </button>
                                <strong>{poolIndex + 1}</strong>
                                <button
                                  className="ai-btn ai-btn--ghost ai-btn--icon"
                                  disabled={key.source === "env" || platformIndex < 0 || platformIndex >= platformKeys.length - 1 || busy}
                                  onClick={() => void moveProviderKey(key, 1)}
                                  type="button"
                                >
                                  <ChevronDown size={16} />
                                </button>
                              </div>
                            </td>
                            <td>
                              <strong>{key.label}</strong>
                              <small>
                                {key.keyHint}
                                {key.source === "env" ? " · sunucu" : ""}
                                {providerStatus?.activeKeyId === key.id ? " · sıradaki" : ""}
                              </small>
                              {key.lastError ? <small className="ai-key-error">{key.lastError}</small> : null}
                            </td>
                            <td>
                              <span className={`ai-pill ${keyStatusClass(key.status)}`}>{keyStatusLabel(key.status)}</span>
                            </td>
                            <td>
                              <div className="ai-key-actions">
                                <button className="ai-btn ai-btn--ghost" disabled={testingProvider || busy} onClick={() => void testProvider(key.id)} type="button">
                                  {busy && testingProvider ? <Loader2 className="spin" size={14} /> : "Test"}
                                </button>
                                {key.source !== "env" && (key.status === "exhausted" || key.status === "error") ? (
                                  <button
                                    className="ai-btn ai-btn--ghost"
                                    disabled={busy}
                                    onClick={() => void runKeyAction(key.id, async () => (await api.resetSuperAdminAIProviderKey(key.id)).status, "Anahtar yeniden denemeye açıldı.")}
                                    type="button"
                                  >
                                    <RotateCcw size={14} />
                                    Sıfırla
                                  </button>
                                ) : null}
                                {key.source !== "env" ? (
                                  <button
                                    className="ai-btn ai-btn--ghost"
                                    disabled={busy}
                                    onClick={() =>
                                      void runKeyAction(
                                        key.id,
                                        async () => (await api.updateSuperAdminAIProviderKey(key.id, { enabled: !key.enabled })).status,
                                        key.enabled ? "Anahtar kapatıldı." : "Anahtar açıldı."
                                      )
                                    }
                                    type="button"
                                  >
                                    {key.enabled ? "Kapat" : "Aç"}
                                  </button>
                                ) : null}
                                {key.source !== "env" ? (
                                  <button
                                    className="ai-btn ai-btn--danger"
                                    disabled={busy}
                                    onClick={() => void runKeyAction(key.id, async () => (await api.deleteSuperAdminAIProviderKey(key.id)).status, "Anahtar silindi.")}
                                    type="button"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <form className="ai-form ai-key-add" onSubmit={(event) => void addProviderKey(event)}>
                <label>
                  Etiket
                  <input onChange={(event) => setNewKeyLabel(event.target.value)} placeholder="Örn. Yedek hesap" value={newKeyLabel} />
                </label>
                <label>
                  OpenAI API anahtarı
                  <div className="ai-key-row">
                    <input
                      autoComplete="off"
                      onChange={(event) => setNewKeyValue(event.target.value)}
                      placeholder="sk-... yapıştırın"
                      type={showNewKey ? "text" : "password"}
                      value={newKeyValue}
                    />
                    <button className="ai-btn ai-btn--ghost ai-btn--icon" onClick={() => setShowNewKey((current) => !current)} type="button">
                      {showNewKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
                <button className="ai-btn ai-btn--primary" disabled={savingProvider || newKeyValue.trim().length < 8} type="submit">
                  {savingProvider ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                  Anahtar ekle
                </button>
              </form>
              {testResult ? <p className="ai-note">{testResult}</p> : null}
            </article>
          ) : providerPanel === "model" ? (
            <article className="ai-card">
              <div className="ai-card-head">
                <div>
                  <h2>Model ve LLM</h2>
                  <p className="ai-note">Tüm kurumlar bu modeli kullanır. LLM kapalıysa kural motoru devreye girer.</p>
                </div>
                <span className={`ai-pill ${providerStatus?.llmReady ? "ai-pill--ok" : "ai-pill--off"}`}>
                  {providerStatus?.llmReady ? "LLM açık" : "LLM kapalı"}
                </span>
              </div>
              <form className="ai-form ai-form--split" onSubmit={(event) => void saveProviderSettings(event)}>
                <label>
                  Varsayılan model
                  <select onChange={(event) => setProviderDraft((current) => ({ ...current, model: event.target.value }))} value={providerDraft.model}>
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ai-switch">
                  <input
                    checked={providerDraft.useLlm}
                    onChange={(event) => setProviderDraft((current) => ({ ...current, useLlm: event.target.checked }))}
                    type="checkbox"
                  />
                  ChatGPT / LLM kullan
                </label>
                <div className="ai-actions">
                  <button className="ai-btn ai-btn--primary" disabled={savingProvider} type="submit">
                    {savingProvider ? <Loader2 className="spin" size={16} /> : <KeyRound size={16} />}
                    Kaydet
                  </button>
                  <button className="ai-btn ai-btn--ghost" disabled={testingProvider} onClick={() => void testProvider()} type="button">
                    {testingProvider ? <Loader2 className="spin" size={16} /> : <Zap size={16} />}
                    Bağlantıyı test et
                  </button>
                </div>
              </form>
              {testResult ? <p className="ai-note">{testResult}</p> : null}
            </article>
          ) : providerPanel === "costs" ? (
            <article className="ai-card">
              <div className="ai-card-head">
                <div>
                  <h2>Maliyet tahmini</h2>
                  <p className="ai-note">Kullanım sekmesindeki tutarlar bu birim fiyatlarla hesaplanır. Gerçek fatura OpenAI hesabınızdan gelir.</p>
                </div>
              </div>
              <form className="ai-form" onSubmit={(event) => void saveCostSettings(event)}>
                <div className="ai-fields-3">
                  <label>
                    Giriş / 1M token
                    <input
                      min={0}
                      onChange={(event) => setCostSettings((current) => ({ ...current, inputCostPer1mUsd: Number(event.target.value) }))}
                      step="0.01"
                      type="number"
                      value={costSettings.inputCostPer1mUsd}
                    />
                    <small>USD</small>
                  </label>
                  <label>
                    Çıkış / 1M token
                    <input
                      min={0}
                      onChange={(event) => setCostSettings((current) => ({ ...current, outputCostPer1mUsd: Number(event.target.value) }))}
                      step="0.01"
                      type="number"
                      value={costSettings.outputCostPer1mUsd}
                    />
                    <small>USD</small>
                  </label>
                  <label>
                    USD / TRY
                    <input
                      min={0}
                      onChange={(event) => setCostSettings((current) => ({ ...current, usdTryRate: Number(event.target.value) }))}
                      step="0.01"
                      type="number"
                      value={costSettings.usdTryRate}
                    />
                    <small>Kur</small>
                  </label>
                </div>
                <button className="ai-btn ai-btn--primary" disabled={savingCosts} type="submit">
                  {savingCosts ? <Loader2 className="spin" size={16} /> : <Coins size={16} />}
                  Maliyeti kaydet
                </button>
              </form>
            </article>
          ) : (
            <article className="ai-card">
              <div className="ai-card-head">
                <div>
                  <h2>Saklama temizliği</h2>
                  <p className="ai-note">Eski konuşma ve mesaj kayıtlarını saklama süresine göre siler. Anahtarlar ve ayarlar etkilenmez.</p>
                </div>
              </div>
              <div className="ai-danger-box">
                <div>
                  <strong>Eski AI kayıtlarını temizle</strong>
                  <p>Bu işlem geri alınamaz. Süre dolmuş mesajlar silinir, konuşmalar arşivlenir.</p>
                </div>
                <button className="ai-btn ai-btn--danger" disabled={runningRetention} onClick={() => void runRetention()} type="button">
                  {runningRetention ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                  Temizliği çalıştır
                </button>
              </div>
            </article>
          )}
        </div>
      ) : (
        <article className="ai-card">
          <h2>Kurum kotaları</h2>
          {(analytics?.byTenant ?? []).length === 0 ? (
            <p className="ai-empty">Kurum kullanımı yok.</p>
          ) : (
            <div className="ai-table-wrap ai-table-wrap--wide">
              <table>
                <thead>
                  <tr>
                    <th>Kurum</th>
                    <th>Mesaj</th>
                    <th>Token</th>
                    <th>Maliyet</th>
                    <th>Günlük mesaj</th>
                    <th>Aylık token</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.byTenant ?? []).map((row) => (
                    <tr key={row.tenantId}>
                      <td>
                        <strong>{row.tenantName}</strong>
                      </td>
                      <td>{formatNumber(row.userMessages)}</td>
                      <td>
                        {formatNumber(row.tokenInput)} / {formatNumber(row.tokenOutput)}
                      </td>
                      <td>
                        {formatTRY(row.estCostTry)}
                        <small>{formatUSD(row.estCostUsd)}</small>
                      </td>
                      <td>
                        <input
                          min={0}
                          onChange={(event) =>
                            setQuotaDrafts((current) => ({
                              ...current,
                              [row.tenantId]: {
                                ...current[row.tenantId],
                                dailyMessageLimit: event.target.value ? Number(event.target.value) : null
                              }
                            }))
                          }
                          placeholder="Sınırsız"
                          type="number"
                          value={quotaDrafts[row.tenantId]?.dailyMessageLimit ?? ""}
                        />
                      </td>
                      <td>
                        <input
                          min={0}
                          onChange={(event) =>
                            setQuotaDrafts((current) => ({
                              ...current,
                              [row.tenantId]: {
                                ...current[row.tenantId],
                                monthlyTokenLimit: event.target.value ? Number(event.target.value) : null
                              }
                            }))
                          }
                          placeholder="Sınırsız"
                          type="number"
                          value={quotaDrafts[row.tenantId]?.monthlyTokenLimit ?? ""}
                        />
                      </td>
                      <td>
                        <button className="ai-btn ai-btn--ghost" disabled={savingQuotaFor === row.tenantId} onClick={() => void saveTenantQuota(row.tenantId)} type="button">
                          {savingQuotaFor === row.tenantId ? <Loader2 className="spin" size={14} /> : "Kaydet"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
