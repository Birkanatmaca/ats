import { BrainCircuit, Coins, KeyRound, Link2, Loader2, MessageSquare, RefreshCw, Sparkles, Trash2, UsersRound, Zap } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import type { AIPlatformAnalytics, AICostSettings, AIProviderSettings, AIProviderStatus, AiTenantQuota } from "../../lib/api";
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
  const [modelOptions, setModelOptions] = useState<string[]>(["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"]);
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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

  async function testProvider() {
    setTestingProvider(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await api.testSuperAdminAIProvider();
      if (result.ok) {
        setTestResult(`Bağlantı başarılı (${result.latencyMs} ms) — ${result.responseHint ?? "yanıt alındı"}`);
      } else {
        setTestResult(result.error ?? "Bağlantı testi başarısız.");
      }
    } catch (testError) {
      setTestResult(testError instanceof Error ? testError.message : "Bağlantı testi çalıştırılamadı.");
    } finally {
      setTestingProvider(false);
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
    <section className="sa-ai-usage">
      <div className="sa-panel-header">
        <div>
          <span className="sa-kicker">ogta.ai</span>
          <h1>Token & maliyet yönetimi</h1>
          <p className="sa-ai-subtitle">Platform genelinde AI kullanımını, token tüketimini ve tahmini maliyeti izleyin.</p>
        </div>
        <div className="sa-ai-toolbar">
          <div className="sa-ai-period">
            {periodOptions.map((option) => (
              <button
                className={option === days ? "active" : undefined}
                key={option}
                onClick={() => setDays(option)}
                type="button"
              >
                {option} gün
              </button>
            ))}
          </div>
          <button className="ghost-button" disabled={loading} onClick={() => void load(days)} type="button">
            <RefreshCw className={loading ? "spin" : undefined} size={16} />
            Yenile
          </button>
        </div>
      </div>

      {error && <div className="form-error sa-alert">{error}</div>}
      {notice && <div className="sa-ai-notice">{notice}</div>}

      {loading && !analytics ? (
        <div className="loading-line">
          <Loader2 className="spin" size={18} />
          AI analitik verileri yükleniyor
        </div>
      ) : (
        <>
          <div className="sa-card sa-ai-provider-card">
            <div className="sa-panel-header compact">
              <div>
                <span className="sa-kicker">Sağlayıcı</span>
                <h2>OpenAI & anahtar yönetimi</h2>
              </div>
              <KeyRound size={20} color="var(--sa-accent)" />
            </div>
            <div className="sa-card-body sa-ai-provider-grid">
              <div className="sa-ai-provider-status">
                <div className={`sa-ai-status-pill ${providerStatus?.llmReady ? "is-ready" : "is-off"}`}>
                  <Zap size={16} />
                  {providerStatus?.llmReady ? "LLM aktif" : "LLM pasif / anahtar yok"}
                </div>
                <ul className="sa-ai-provider-meta">
                  <li>
                    <span>Anahtar kaynağı</span>
                    <strong>
                      {providerStatus?.keySource === "env"
                        ? "Sunucu ortam değişkeni"
                        : providerStatus?.keySource === "platform"
                          ? "Platform ayarları"
                          : "Tanımlı değil"}
                    </strong>
                  </li>
                  <li>
                    <span>Anahtar</span>
                    <strong>{providerStatus?.keyConfigured ? providerStatus.keyHint : "Eksik"}</strong>
                  </li>
                  <li>
                    <span>Model</span>
                    <strong>{providerStatus?.model ?? providerDraft.model}</strong>
                  </li>
                  <li>
                    <span>Yedek mod</span>
                    <strong>{providerStatus?.fallbackRuleEngine ? "Kural motoru açık" : "Kapalı"}</strong>
                  </li>
                </ul>
                {providerStatus?.envOverridesKey ? (
                  <p className="sa-ai-provider-note">
                    Sunucuda <code>OPENAI_API_KEY</code> tanımlı; paneldeki anahtar yedek olarak duruyor.
                  </p>
                ) : null}
                <Link className="ghost-button sa-ai-settings-link" to="/admin/settings">
                  <Link2 size={16} />
                  API anahtarını Ayarlar &gt; AI sekmesinden yönet
                </Link>
              </div>

              <form className="sa-ai-provider-form" onSubmit={(event) => void saveProviderSettings(event)}>
                <label>
                  Model
                  <select
                    onChange={(event) => setProviderDraft((current) => ({ ...current, model: event.target.value }))}
                    value={providerDraft.model}
                  >
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="toggle-row sa-ai-toggle">
                  <input
                    checked={providerDraft.useLlm}
                    onChange={(event) => setProviderDraft((current) => ({ ...current, useLlm: event.target.checked }))}
                    type="checkbox"
                  />
                  <span />
                  <strong>LLM (ChatGPT) kullan</strong>
                </label>
                <div className="sa-ai-provider-actions">
                  <button className="primary-button" disabled={savingProvider} type="submit">
                    {savingProvider ? <Loader2 className="spin" size={16} /> : "Sağlayıcı ayarlarını kaydet"}
                  </button>
                  <button className="ghost-button" disabled={testingProvider} onClick={() => void testProvider()} type="button">
                    {testingProvider ? <Loader2 className="spin" size={16} /> : "Bağlantıyı test et"}
                  </button>
                </div>
                {testResult ? <p className="sa-ai-test-result">{testResult}</p> : null}
              </form>
            </div>
          </div>

          <div className="sa-kpi-row">
            <article className="sa-kpi sa-kpi--blue">
              <div className="sa-kpi-icon">
                <MessageSquare size={20} />
              </div>
              <label>Kullanıcı mesajı</label>
              <span className="sa-kpi-value">{formatNumber(analytics?.totalUserMessages ?? 0)}</span>
              <span className="sa-kpi-hint">{formatNumber(analytics?.totalAssistantMessages ?? 0)} asistan yanıtı</span>
            </article>
            <article className="sa-kpi sa-kpi--purple">
              <div className="sa-kpi-icon">
                <Sparkles size={20} />
              </div>
              <label>Token (in/out)</label>
              <span className="sa-kpi-value">{formatNumber(analytics?.tokenInput ?? 0)}</span>
              <span className="sa-kpi-hint">{formatNumber(analytics?.tokenOutput ?? 0)} çıkış token</span>
            </article>
            <article className="sa-kpi sa-kpi--green">
              <div className="sa-kpi-icon">
                <Coins size={20} />
              </div>
              <label>Tahmini maliyet</label>
              <span className="sa-kpi-value">{formatTRY(analytics?.estCostTry ?? 0)}</span>
              <span className="sa-kpi-hint">{formatUSD(analytics?.estCostUsd ?? 0)}</span>
            </article>
            <article className="sa-kpi sa-kpi--rose">
              <div className="sa-kpi-icon">
                <UsersRound size={20} />
              </div>
              <label>Aktif kullanıcı</label>
              <span className="sa-kpi-value">{formatNumber(analytics?.activeUsers ?? 0)}</span>
              <span className="sa-kpi-hint">{formatNumber(analytics?.totalConversations ?? 0)} konuşma</span>
            </article>
          </div>

          <div className="sa-two-col">
            <div className="sa-card">
              <div className="sa-panel-header compact">
                <div>
                  <span className="sa-kicker">Trend</span>
                  <h2>Günlük kullanım</h2>
                </div>
                <BrainCircuit size={20} color="var(--sa-accent)" />
              </div>
              <div className="sa-card-body">
                <div className="sa-chart-frame sa-chart-frame--tall">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e2" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#919a9f" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#919a9f" }} />
                      <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbdbd9" }} />
                      <Legend />
                      <Line type="monotone" dataKey="mesaj" stroke="#3b82f6" strokeWidth={2} name="Mesaj" />
                      <Line type="monotone" dataKey="token" stroke="#8b5cf6" strokeWidth={2} name="Token" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="sa-card">
              <div className="sa-panel-header compact">
                <div>
                  <span className="sa-kicker">Kurum</span>
                  <h2>Kurum bazlı maliyet</h2>
                </div>
              </div>
              <div className="sa-card-body">
                <div className="sa-chart-frame sa-chart-frame--tall">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tenantChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e2" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#919a9f" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#919a9f" }} />
                      <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbdbd9" }} />
                      <Legend />
                      <Bar dataKey="mesaj" fill="#3b82f6" name="Mesaj" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="maliyet" fill="#10b981" name="Maliyet (TRY)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="sa-card">
            <div className="sa-panel-header compact">
              <div>
                <span className="sa-kicker">Rol</span>
                <h2>Rol bazlı kullanım</h2>
              </div>
            </div>
            <div className="sa-card-body">
              <div className="sa-chart-frame sa-chart-frame--tall">
                {roleChart.length === 0 ? (
                  <p className="muted-copy">Henüz rol bazlı kullanım kaydı yok.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roleChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e2" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#919a9f" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#919a9f" }} />
                      <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbdbd9" }} />
                      <Legend />
                      <Bar dataKey="mesaj" fill="#6366f1" name="Mesaj" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="token" fill="#f59e0b" name="Token" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="sa-two-col">
            <div className="sa-card">
              <div className="sa-panel-header compact">
                <div>
                  <span className="sa-kicker">Maliyet</span>
                  <h2>Token fiyatlandırma</h2>
                </div>
              </div>
              <form className="sa-card-body sa-ai-cost-form" onSubmit={(event) => void saveCostSettings(event)}>
                <label>
                  Giriş token / 1M USD
                  <input
                    min={0}
                    onChange={(event) =>
                      setCostSettings((current) => ({ ...current, inputCostPer1mUsd: Number(event.target.value) }))
                    }
                    step="0.01"
                    type="number"
                    value={costSettings.inputCostPer1mUsd}
                  />
                </label>
                <label>
                  Çıkış token / 1M USD
                  <input
                    min={0}
                    onChange={(event) =>
                      setCostSettings((current) => ({ ...current, outputCostPer1mUsd: Number(event.target.value) }))
                    }
                    step="0.01"
                    type="number"
                    value={costSettings.outputCostPer1mUsd}
                  />
                </label>
                <label>
                  USD / TRY kuru
                  <input
                    min={0}
                    onChange={(event) =>
                      setCostSettings((current) => ({ ...current, usdTryRate: Number(event.target.value) }))
                    }
                    step="0.01"
                    type="number"
                    value={costSettings.usdTryRate}
                  />
                </label>
                <button className="primary-button" disabled={savingCosts} type="submit">
                  {savingCosts ? <Loader2 className="spin" size={16} /> : "Maliyet ayarlarını kaydet"}
                </button>
              </form>
            </div>

            <div className="sa-card">
              <div className="sa-panel-header compact">
                <div>
                  <span className="sa-kicker">Operasyon</span>
                  <h2>Saklama & modeller</h2>
                </div>
              </div>
              <div className="sa-card-body sa-ai-side-panel">
                <button className="ghost-button" disabled={runningRetention} onClick={() => void runRetention()} type="button">
                  {runningRetention ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                  Saklama temizliğini çalıştır
                </button>
                <div className="sa-ai-model-list">
                  {(analytics?.byModel ?? []).length === 0 ? (
                    <p className="muted-copy">Henüz model bazlı kullanım kaydı yok.</p>
                  ) : (
                    analytics?.byModel.map((row) => (
                      <div className="sa-ai-model-row" key={row.model}>
                        <strong>{row.model}</strong>
                        <span>{formatNumber(row.messages)} yanıt</span>
                        <span>{formatNumber(row.tokenInput + row.tokenOutput)} token</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="sa-card">
            <div className="sa-panel-header compact">
              <div>
                <span className="sa-kicker">Detay</span>
                <h2>Kurum kırılımı</h2>
              </div>
            </div>
            <div className="sa-card-body sa-ai-table-wrap">
              <table className="sa-ai-table">
                <thead>
                  <tr>
                    <th>Kurum</th>
                    <th>Mesaj</th>
                    <th>Token (in)</th>
                    <th>Token (out)</th>
                    <th>USD</th>
                    <th>TRY</th>
                    <th>Gün limiti</th>
                    <th>Ay token</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.byTenant ?? []).map((row) => (
                    <tr key={row.tenantId}>
                      <td>{row.tenantName}</td>
                      <td>{formatNumber(row.userMessages)}</td>
                      <td>{formatNumber(row.tokenInput)}</td>
                      <td>{formatNumber(row.tokenOutput)}</td>
                      <td>{formatUSD(row.estCostUsd)}</td>
                      <td>{formatTRY(row.estCostTry)}</td>
                      <td>
                        <input
                          className="sa-ai-quota-input"
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
                          placeholder="∞"
                          type="number"
                          value={quotaDrafts[row.tenantId]?.dailyMessageLimit ?? ""}
                        />
                      </td>
                      <td>
                        <input
                          className="sa-ai-quota-input"
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
                          placeholder="∞"
                          type="number"
                          value={quotaDrafts[row.tenantId]?.monthlyTokenLimit ?? ""}
                        />
                      </td>
                      <td>
                        <button
                          className="ghost-button"
                          disabled={savingQuotaFor === row.tenantId}
                          onClick={() => void saveTenantQuota(row.tenantId)}
                          type="button"
                        >
                          {savingQuotaFor === row.tenantId ? <Loader2 className="spin" size={14} /> : "Kaydet"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
