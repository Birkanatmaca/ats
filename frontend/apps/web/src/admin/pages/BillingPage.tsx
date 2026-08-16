import { Building2, Check, Download, GraduationCap, Loader2, Plus, RefreshCw, Save } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BillingLicensePackage, BillingOverview, BillingQuotePreview, BillingSettings } from "../../lib/api";
import { api } from "../../lib/api";
import {
  calculateLicenseSubtotal,
  extraPackageFeatures,
  minStudentsEquivalent,
  packageHasFeature,
  PLAN_FEATURE_CATALOG,
  PLAN_INCLUDES_PREVIOUS
} from "../utils/billingPackages";
import { downloadBillingQuotePdf } from "../utils/billingQuotePdf";
import { formatTRY } from "../utils/labels";
import "./BillingPage.css";

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

type QuoteFormState = {
  tenantId: string;
  institutionName: string;
  contactName: string;
  contactEmail: string;
  packageId: string;
  studentCount: number;
  termYears: number;
  discountPercent: number;
  notes: string;
  pricePerStudentUsd: number;
  minOrderUsd: number;
};

const defaultQuoteForm = (): QuoteFormState => ({
  tenantId: "",
  institutionName: "",
  contactName: "",
  contactEmail: "",
  packageId: "core",
  studentCount: 200,
  termYears: 1,
  discountPercent: 0,
  notes: "",
  pricePerStudentUsd: 10,
  minOrderUsd: 2000
});

export function BillingPage() {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<BillingSettings | null>(null);
  const [packagesDraft, setPackagesDraft] = useState<BillingLicensePackage[]>([]);
  const [quoteForm, setQuoteForm] = useState<QuoteFormState>(defaultQuoteForm);
  const [quotePreview, setQuotePreview] = useState<BillingQuotePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [previewingQuote, setPreviewingQuote] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [fetchingTcmb, setFetchingTcmb] = useState(false);
  const [tcmbLabel, setTcmbLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"quote" | "plans" | "settings">("quote");
  const [customFeature, setCustomFeature] = useState<Record<string, string>>({});

  const packages = packagesDraft.length > 0 ? packagesDraft : overview?.packages ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.superAdminBillingOverview();
      const packages = data.packages ?? [];
      let settings = data.settings;
      if (data.tcmb?.usdTryRate) {
        settings = { ...settings, usdTryRate: data.tcmb.usdTryRate, packages };
        setTcmbLabel(`${data.tcmb.bulletinDate} · satış ${data.tcmb.forexSelling}`);
      } else {
        try {
          const rate = await api.superAdminBillingTcmbRate();
          settings = { ...settings, usdTryRate: rate.usdTryRate, packages };
          setTcmbLabel(`${rate.bulletinDate} · satış ${rate.forexSelling}`);
        } catch {
          setTcmbLabel(null);
        }
      }
      setOverview(data);
      setSettingsDraft(settings);
      setPackagesDraft(packages);
      setQuoteForm((current) => {
        const selected = packages.find((item) => item.id === current.packageId) ?? packages[0];
        if (!selected) {
          return current;
        }
        return {
          ...current,
          packageId: selected.id,
          pricePerStudentUsd: selected.pricePerStudentUsd,
          minOrderUsd: selected.minOrderUsd
        };
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Faturalama verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const institutions = overview?.institutions ?? [];
  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === quoteForm.packageId),
    [packages, quoteForm.packageId]
  );

  const estimate = useMemo(() => {
    const pricing = calculateLicenseSubtotal(
      quoteForm.studentCount,
      quoteForm.pricePerStudentUsd,
      quoteForm.minOrderUsd,
      quoteForm.termYears
    );
    const discountUsd = pricing.subtotalUsd * (quoteForm.discountPercent / 100);
    return { ...pricing, discountUsd, totalUsd: pricing.subtotalUsd - discountUsd };
  }, [quoteForm.discountPercent, quoteForm.minOrderUsd, quoteForm.pricePerStudentUsd, quoteForm.studentCount, quoteForm.termYears]);

  function patchQuote(patch: Partial<QuoteFormState>) {
    setQuoteForm((current) => ({ ...current, ...patch }));
    setQuotePreview(null);
  }

  function selectPackage(packageId: string) {
    const pkg = packages.find((item) => item.id === packageId);
    patchQuote({
      packageId,
      pricePerStudentUsd: pkg?.pricePerStudentUsd ?? quoteForm.pricePerStudentUsd,
      minOrderUsd: pkg?.minOrderUsd ?? quoteForm.minOrderUsd
    });
  }

  function applyInstitutionToQuote(tenantId: string) {
    const institution = institutions.find((item) => item.tenantId === tenantId);
    patchQuote({
      tenantId,
      institutionName: institution?.institutionName ?? quoteForm.institutionName,
      studentCount: institution?.studentCount || quoteForm.studentCount
    });
  }

  async function applyTcmbRate() {
    if (!settingsDraft) {
      return;
    }
    setFetchingTcmb(true);
    setError(null);
    setNotice(null);
    try {
      const rate = await api.superAdminBillingTcmbRate();
      const next = { ...settingsDraft, usdTryRate: rate.usdTryRate, packages: packagesDraft };
      setSettingsDraft(next);
      setTcmbLabel(`${rate.bulletinDate} · satış ${rate.forexSelling}`);
      await api.updateSuperAdminBillingSettings(next);
      setNotice(`TCMB USD/TRY satış kuru uygulandı: ${rate.usdTryRate}`);
    } catch (rateError) {
      setError(rateError instanceof Error ? rateError.message : "TCMB kuru alınamadı.");
    } finally {
      setFetchingTcmb(false);
    }
  }

  function updatePackage(packageId: string, patch: Partial<BillingLicensePackage>) {
    setPackagesDraft((current) => current.map((item) => (item.id === packageId ? { ...item, ...patch } : item)));
  }

  function toggleFeature(packageId: string, feature: string) {
    const pkg = packagesDraft.find((item) => item.id === packageId);
    if (!pkg) {
      return;
    }
    const next = packageHasFeature(pkg.features, feature)
      ? pkg.features.filter((item) => item.trim() !== feature)
      : [...pkg.features, feature];
    updatePackage(packageId, { features: next });
  }

  function addCustomFeature(packageId: string) {
    const value = (customFeature[packageId] ?? "").trim();
    if (!value) {
      return;
    }
    const pkg = packagesDraft.find((item) => item.id === packageId);
    if (!pkg || packageHasFeature(pkg.features, value)) {
      setCustomFeature((current) => ({ ...current, [packageId]: "" }));
      return;
    }
    updatePackage(packageId, { features: [...pkg.features, value] });
    setCustomFeature((current) => ({ ...current, [packageId]: "" }));
  }

  async function savePlansAndSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsDraft) {
      return;
    }
    setSavingSettings(true);
    setNotice(null);
    setError(null);
    try {
      const updated = await api.updateSuperAdminBillingSettings({ ...settingsDraft, packages: packagesDraft });
      setSettingsDraft(updated);
      if (updated.packages?.length) {
        setPackagesDraft(updated.packages);
      }
      setNotice("Planlar ve teklif ayarları kaydedildi.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function buildPreview() {
    if (!settingsDraft || !selectedPackage) {
      return null;
    }
    setPreviewingQuote(true);
    setNotice(null);
    setError(null);
    try {
      const preview = await api.previewSuperAdminBillingQuote({
        tenantId: quoteForm.tenantId || undefined,
        institutionName: quoteForm.institutionName,
        contactName: quoteForm.contactName,
        contactEmail: quoteForm.contactEmail,
        packageId: quoteForm.packageId,
        studentCount: quoteForm.studentCount,
        termYears: quoteForm.termYears,
        discountPercent: quoteForm.discountPercent,
        usdTryRate: settingsDraft.usdTryRate,
        notes: quoteForm.notes,
        pricePerStudentUsd: quoteForm.pricePerStudentUsd,
        minOrderUsd: quoteForm.minOrderUsd
      });
      setQuotePreview(preview);
      return preview;
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Teklif oluşturulamadı.");
      return null;
    } finally {
      setPreviewingQuote(false);
    }
  }

  async function downloadPdf() {
    const preview = quotePreview ?? (await buildPreview());
    if (!preview) {
      return;
    }
    setDownloadingPdf(true);
    setError(null);
    try {
      await downloadBillingQuotePdf(preview);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "PDF oluşturulamadı.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <section className="bill">
      <header className="bill-hero">
        <div>
          <p className="bill-kicker">Satış</p>
          <h1>Faturalama</h1>
        </div>
        <button className="bill-btn bill-btn--ghost" disabled={loading} onClick={() => void load()} type="button">
          <RefreshCw className={loading ? "spin" : undefined} size={15} />
          Yenile
        </button>
      </header>

      <div className="bill-kpi-grid">
        <article className="bill-kpi">
          <div className="bill-kpi-icon">
            <Building2 size={18} />
          </div>
          <span>Kurum</span>
          <strong>{formatNumber(overview?.totalInstitutions ?? 0)}</strong>
        </article>
        <article className="bill-kpi">
          <div className="bill-kpi-icon bill-kpi-icon--green">
            <GraduationCap size={18} />
          </div>
          <span>Öğrenci</span>
          <strong>{formatNumber(overview?.totalStudents ?? 0)}</strong>
        </article>
        <article className="bill-kpi">
          <span>USD / TRY</span>
          <strong>{settingsDraft?.usdTryRate ?? "—"}</strong>
          <button className="bill-btn bill-btn--ghost bill-btn--small" disabled={fetchingTcmb || !settingsDraft} onClick={() => void applyTcmbRate()} type="button">
            {fetchingTcmb ? <Loader2 className="spin" size={14} /> : null}
            TCMB kuru
          </button>
          {tcmbLabel ? <small>{tcmbLabel}</small> : <small>Merkez Bankası satış kuru</small>}
        </article>
        <article className="bill-kpi">
          <span>Geçerlilik</span>
          <strong>{settingsDraft ? `${settingsDraft.quoteValidityDays} gün` : "—"}</strong>
        </article>
      </div>

      <div className="bill-tabs">
        <button className={tab === "quote" ? "is-active" : undefined} onClick={() => setTab("quote")} type="button">
          Fiyat teklifi
        </button>
        <button className={tab === "plans" ? "is-active" : undefined} onClick={() => setTab("plans")} type="button">
          Plan düzenleme
        </button>
        <button className={tab === "settings" ? "is-active" : undefined} onClick={() => setTab("settings")} type="button">
          Ayarlar
        </button>
      </div>

      {error ? <div className="form-error sa-alert">{error}</div> : null}
      {notice ? <div className="bill-notice">{notice}</div> : null}

      {loading && !overview ? (
        <div className="loading-line">
          <Loader2 className="spin" size={18} />
          Faturalama verileri yükleniyor
        </div>
      ) : tab === "quote" ? (
        <article className="bill-card">
            <h2>Fiyat teklifi</h2>
            <div className="bill-quote">
              <form className="bill-form" onSubmit={(event) => { event.preventDefault(); void downloadPdf(); }}>
                <div className="bill-form-row">
                  <label>
                    Kurum
                    <select onChange={(event) => applyInstitutionToQuote(event.target.value)} value={quoteForm.tenantId}>
                      <option value="">Manuel / yeni kurum</option>
                      {institutions.map((row) => (
                        <option key={row.tenantId} value={row.tenantId}>
                          {row.institutionName} · {formatNumber(row.studentCount)} öğrenci
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Kurum adı
                    <input
                      onChange={(event) => patchQuote({ institutionName: event.target.value })}
                      placeholder="Örn. Priente Koleji"
                      value={quoteForm.institutionName}
                    />
                  </label>
                </div>
                <div className="bill-form-row">
                  <label>
                    Yetkili
                    <input onChange={(event) => patchQuote({ contactName: event.target.value })} value={quoteForm.contactName} />
                  </label>
                  <label>
                    E-posta
                    <input onChange={(event) => patchQuote({ contactEmail: event.target.value })} type="email" value={quoteForm.contactEmail} />
                  </label>
                </div>

                <div className="bill-plan-picks">
                  {packages.map((pkg) => (
                    <button
                      className={quoteForm.packageId === pkg.id ? "is-active" : undefined}
                      key={pkg.id}
                      onClick={() => selectPackage(pkg.id)}
                      type="button"
                    >
                      <strong>{pkg.name}</strong>
                      <small>{formatUSD(pkg.pricePerStudentUsd)} / öğrenci</small>
                    </button>
                  ))}
                </div>

                <div className="bill-form-row bill-form-row--five">
                  <label>
                    Öğrenci
                    <input min={1} onChange={(event) => patchQuote({ studentCount: Number(event.target.value) })} type="number" value={quoteForm.studentCount} />
                  </label>
                  <label>
                    Süre
                    <select onChange={(event) => patchQuote({ termYears: Number(event.target.value) })} value={quoteForm.termYears}>
                      <option value={1}>1 yıl</option>
                      <option value={2}>2 yıl</option>
                      <option value={3}>3 yıl</option>
                    </select>
                  </label>
                  <label>
                    Birim (USD)
                    <input min={0.01} onChange={(event) => patchQuote({ pricePerStudentUsd: Number(event.target.value) })} step="0.01" type="number" value={quoteForm.pricePerStudentUsd} />
                  </label>
                  <label>
                    İndirim %
                    <input max={100} min={0} onChange={(event) => patchQuote({ discountPercent: Number(event.target.value) })} step="0.5" type="number" value={quoteForm.discountPercent} />
                  </label>
                  <label>
                    Min. (USD)
                    <input min={0} onChange={(event) => patchQuote({ minOrderUsd: Number(event.target.value) })} step="1" type="number" value={quoteForm.minOrderUsd} />
                  </label>
                </div>

                <label>
                  Notlar
                  <textarea
                    onChange={(event) => patchQuote({ notes: event.target.value })}
                    placeholder="Ödeme koşulları veya özel notlar"
                    rows={3}
                    value={quoteForm.notes}
                  />
                </label>
              </form>

              <aside className="bill-total">
                <span>Canlı toplam</span>
                <strong>{formatUSD(estimate.totalUsd)}</strong>
                <small>{formatTRY(estimate.totalUsd * (settingsDraft?.usdTryRate ?? 0))}</small>
                <dl>
                  <div>
                    <dt>Ara toplam</dt>
                    <dd>{formatUSD(estimate.subtotalUsd)}</dd>
                  </div>
                  {quoteForm.discountPercent > 0 ? (
                    <div>
                      <dt>İndirim (%{quoteForm.discountPercent})</dt>
                      <dd>-{formatUSD(estimate.discountUsd)}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Plan</dt>
                    <dd>{selectedPackage?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Kur</dt>
                    <dd>1 USD = {settingsDraft?.usdTryRate ?? "—"} TRY</dd>
                  </div>
                </dl>
                {quotePreview ? (
                  <div className="bill-quote-ready">
                    <Check size={14} />
                    {quotePreview.quoteNumber} · {new Date(quotePreview.validUntil).toLocaleDateString("tr-TR")}
                  </div>
                ) : null}
                <button className="bill-btn bill-btn--primary" disabled={downloadingPdf || previewingQuote} onClick={() => void downloadPdf()} type="button">
                  {downloadingPdf || previewingQuote ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
                  PDF indir
                </button>
              </aside>
            </div>
          </article>
      ) : tab === "plans" ? (
          <form className="bill-card" onSubmit={(event) => void savePlansAndSettings(event)}>
            <div className="bill-section-head">
              <div>
                <h2>Plan düzenleme</h2>
                <p className="bill-section-note">Fiyat öğrenci başı yıllık ücrettir. Özellikleri listeden açıp kapatın.</p>
              </div>
              <button className="bill-btn bill-btn--primary" disabled={savingSettings} type="submit">
                {savingSettings ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                Kaydet
              </button>
            </div>
            <div className="bill-plan-grid">
              {packagesDraft.map((pkg) => {
                const tryRate = settingsDraft?.usdTryRate ?? 0;
                const minStudents = minStudentsEquivalent(pkg.pricePerStudentUsd, pkg.minOrderUsd);
                const includesPrevious = PLAN_INCLUDES_PREVIOUS[pkg.id];
                const extras = extraPackageFeatures(pkg.features);
                return (
                  <article className={`bill-plan-card bill-plan-card--${pkg.id}`} key={pkg.id}>
                    <header>
                      <span>{pkg.id}</span>
                      <input
                        aria-label={`${pkg.name} adı`}
                        onChange={(event) => updatePackage(pkg.id, { name: event.target.value })}
                        value={pkg.name}
                      />
                      <input
                        aria-label={`${pkg.name} açıklaması`}
                        className="bill-plan-tagline"
                        onChange={(event) => updatePackage(pkg.id, { tagline: event.target.value })}
                        value={pkg.tagline}
                      />
                    </header>

                    <div className="bill-plan-price">
                      <label>
                        Öğrenci başı / yıl
                        <div className="bill-plan-price-row">
                          <span>$</span>
                          <input
                            min={0.01}
                            onChange={(event) => updatePackage(pkg.id, { pricePerStudentUsd: Number(event.target.value) })}
                            step="0.01"
                            type="number"
                            value={pkg.pricePerStudentUsd}
                          />
                        </div>
                      </label>
                      <strong>{formatUSD(pkg.pricePerStudentUsd)}</strong>
                      <small>{tryRate > 0 ? `${formatTRY(pkg.pricePerStudentUsd * tryRate)} / öğrenci / yıl` : "Kur ayarlardan gelir"}</small>
                    </div>

                    <label className="bill-plan-min">
                      Yıllık minimum sipariş (USD)
                      <input
                        min={0}
                        onChange={(event) => updatePackage(pkg.id, { minOrderUsd: Number(event.target.value) })}
                        step="1"
                        type="number"
                        value={pkg.minOrderUsd}
                      />
                      <small>
                        {formatUSD(pkg.minOrderUsd)} taban · {minStudents > 0 ? `en az ${formatNumber(minStudents)} öğrenci` : "taban yok"}
                        {tryRate > 0 ? ` · ${formatTRY(pkg.minOrderUsd * tryRate)}` : ""}
                      </small>
                    </label>

                    <div className="bill-plan-features">
                      <span>Pakete dahil özellikler</span>
                      {includesPrevious ? (
                        <label className="bill-check">
                          <input
                            checked={packageHasFeature(pkg.features, includesPrevious)}
                            onChange={() => toggleFeature(pkg.id, includesPrevious)}
                            type="checkbox"
                          />
                          {includesPrevious}
                        </label>
                      ) : null}
                      {PLAN_FEATURE_CATALOG.map((feature) => (
                        <label className="bill-check" key={feature}>
                          <input
                            checked={packageHasFeature(pkg.features, feature)}
                            onChange={() => toggleFeature(pkg.id, feature)}
                            type="checkbox"
                          />
                          {feature}
                        </label>
                      ))}
                      {extras.map((feature) => (
                        <label className="bill-check" key={feature}>
                          <input checked onChange={() => toggleFeature(pkg.id, feature)} type="checkbox" />
                          {feature}
                        </label>
                      ))}
                      <div className="bill-plan-add">
                        <input
                          onChange={(event) => setCustomFeature((current) => ({ ...current, [pkg.id]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addCustomFeature(pkg.id);
                            }
                          }}
                          placeholder="Özel özellik ekle"
                          value={customFeature[pkg.id] ?? ""}
                        />
                        <button className="bill-btn bill-btn--ghost bill-btn--small" onClick={() => addCustomFeature(pkg.id)} type="button">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </form>
      ) : (
          <form className="bill-card" onSubmit={(event) => void savePlansAndSettings(event)}>
            <div className="bill-section-head">
              <h2>Ayarlar</h2>
              <button className="bill-btn bill-btn--primary" disabled={savingSettings || !settingsDraft} type="submit">
                {savingSettings ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                Kaydet
              </button>
            </div>
            {settingsDraft ? (
              <div className="bill-settings">
                <label>
                  USD / TRY
                  <div className="bill-rate-row">
                    <input
                      min={0.01}
                      onChange={(event) => setSettingsDraft({ ...settingsDraft, usdTryRate: Number(event.target.value) })}
                      step="0.01"
                      type="number"
                      value={settingsDraft.usdTryRate}
                    />
                    <button className="bill-btn bill-btn--ghost" disabled={fetchingTcmb} onClick={() => void applyTcmbRate()} type="button">
                      {fetchingTcmb ? <Loader2 className="spin" size={14} /> : null}
                      TCMB
                    </button>
                  </div>
                  {tcmbLabel ? <small>Son TCMB: {tcmbLabel}</small> : <small>TCMB döviz satış kuru alınır.</small>}
                </label>
                <label>
                  Geçerlilik (gün)
                  <input
                    min={1}
                    onChange={(event) => setSettingsDraft({ ...settingsDraft, quoteValidityDays: Number(event.target.value) })}
                    type="number"
                    value={settingsDraft.quoteValidityDays}
                  />
                </label>
                <label>
                  Şirket
                  <input onChange={(event) => setSettingsDraft({ ...settingsDraft, companyName: event.target.value })} value={settingsDraft.companyName} />
                </label>
                <label>
                  E-posta
                  <input onChange={(event) => setSettingsDraft({ ...settingsDraft, companyEmail: event.target.value })} type="email" value={settingsDraft.companyEmail} />
                </label>
              </div>
            ) : null}
          </form>
      )}
    </section>
  );
}
