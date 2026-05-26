import {
  Building2,
  Check,
  ChevronRight,
  Crown,
  Download,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Wallet,
  Zap
} from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BillingLicensePackage, BillingOverview, BillingQuotePreview, BillingSettings } from "../../lib/api";
import { api } from "../../lib/api";
import { calculateLicenseSubtotal, minStudentsEquivalent } from "../utils/billingPackages";
import { downloadBillingQuotePdf } from "../utils/billingQuotePdf";
import { formatTRY, statusLabel } from "../utils/labels";
import "../../role-dashboard/principal/PrincipalConsole.css";
import "../../role-dashboard/guidance/GuidanceDataPage.css";
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
  customPricingEnabled: boolean;
  customPricePerStudentUsd: number;
  customMinOrderUsd: number;
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
  customPricingEnabled: false,
  customPricePerStudentUsd: 10,
  customMinOrderUsd: 2000
});

const packageVisuals: Record<string, { icon: typeof Zap; label: string; popular?: boolean }> = {
  starter: { icon: Zap, label: "Başlangıç" },
  core: { icon: Layers, label: "Popüler", popular: true },
  premium: { icon: Crown, label: "Kurumsal" }
};

const PACKAGE_TONES: Record<string, { color: string; bg: string; badge: string }> = {
  starter: { color: "#64748b", bg: "#f8fafc", badge: "#e2e8f0" },
  core: { color: "#2563eb", bg: "#eff6ff", badge: "#dbeafe" },
  premium: { color: "#7c3aed", bg: "#faf5ff", badge: "#ede9fe" }
};

const DEFAULT_TONE = { color: "#475569", bg: "#f8fafc", badge: "#e2e8f0" };

export function BillingPage() {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<BillingSettings | null>(null);
  const [quoteForm, setQuoteForm] = useState<QuoteFormState>(defaultQuoteForm);
  const [quotePreview, setQuotePreview] = useState<BillingQuotePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [previewingQuote, setPreviewingQuote] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const packages = overview?.packages ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.superAdminBillingOverview();
      setOverview(data);
      setSettingsDraft(data.settings);
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
    [quoteForm.packageId, packages]
  );
  const effectivePricing = useMemo(() => {
    if (!selectedPackage) {
      return null;
    }
    if (quoteForm.customPricingEnabled) {
      return {
        pricePerStudentUsd: quoteForm.customPricePerStudentUsd,
        minOrderUsd: quoteForm.customMinOrderUsd
      };
    }
    return {
      pricePerStudentUsd: selectedPackage.pricePerStudentUsd,
      minOrderUsd: selectedPackage.minOrderUsd
    };
  }, [quoteForm.customMinOrderUsd, quoteForm.customPricePerStudentUsd, quoteForm.customPricingEnabled, selectedPackage]);
  const selectedInstitution = useMemo(
    () => institutions.find((item) => item.tenantId === quoteForm.tenantId),
    [institutions, quoteForm.tenantId]
  );

  const estimate = useMemo(() => {
    if (!effectivePricing) {
      return null;
    }
    const pricing = calculateLicenseSubtotal(
      quoteForm.studentCount,
      effectivePricing.pricePerStudentUsd,
      effectivePricing.minOrderUsd,
      quoteForm.termYears
    );
    const afterDiscount = pricing.subtotalUsd * (1 - quoteForm.discountPercent / 100);
    return { ...pricing, totalUsd: afterDiscount, ...effectivePricing };
  }, [effectivePricing, quoteForm.discountPercent, quoteForm.studentCount, quoteForm.termYears]);

  function selectPackage(packageId: string) {
    const pkg = packages.find((item) => item.id === packageId);
    setQuoteForm((current) => ({
      ...current,
      packageId,
      customPricePerStudentUsd: pkg?.pricePerStudentUsd ?? current.customPricePerStudentUsd,
      customMinOrderUsd: pkg?.minOrderUsd ?? current.customMinOrderUsd
    }));
    setQuotePreview(null);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsDraft) {
      return;
    }
    setSavingSettings(true);
    setNotice(null);
    setError(null);
    try {
      const updated = await api.updateSuperAdminBillingSettings(settingsDraft);
      setSettingsDraft(updated);
      setNotice("Faturalama ayarları kaydedildi.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Faturalama ayarları kaydedilemedi.");
    } finally {
      setSavingSettings(false);
    }
  }

  function applyInstitutionToQuote(tenantId: string) {
    const institution = institutions.find((item) => item.tenantId === tenantId);
    if (!institution) {
      return;
    }
    setQuoteForm((current) => ({
      ...current,
      tenantId,
      institutionName: institution.institutionName,
      studentCount: institution.studentCount || current.studentCount
    }));
    setQuotePreview(null);
  }

  async function previewQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsDraft || !selectedPackage) {
      return;
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
        ...(quoteForm.customPricingEnabled
          ? {
              pricePerStudentUsd: quoteForm.customPricePerStudentUsd,
              minOrderUsd: quoteForm.customMinOrderUsd
            }
          : {})
      });
      setQuotePreview(preview);
      setNotice("Teklif önizlemesi hazır. PDF indirebilirsiniz.");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Teklif oluşturulamadı.");
    } finally {
      setPreviewingQuote(false);
    }
  }

  async function downloadPdf() {
    if (!quotePreview) {
      return;
    }
    setDownloadingPdf(true);
    setError(null);
    try {
      await downloadBillingQuotePdf(quotePreview);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "PDF oluşturulamadı.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function renderPackageCard(pkg: BillingLicensePackage, index: number) {
    const active = quoteForm.packageId === pkg.id;
    const visual = packageVisuals[pkg.id] ?? { icon: Sparkles, label: pkg.name };
    const tone = PACKAGE_TONES[pkg.id] ?? DEFAULT_TONE;
    const Icon = visual.icon;
    const studentFloor = minStudentsEquivalent(pkg.pricePerStudentUsd, pkg.minOrderUsd);

    return (
      <article
        className={`sa-billing-plan-card ${active ? "is-active" : ""}`}
        key={pkg.id}
        style={
          {
            "--bp-tone": tone.color,
            "--bp-tone-bg": tone.bg,
            "--bp-tone-badge": tone.badge,
            animationDelay: `${index * 45}ms`
          } as CSSProperties
        }
      >
        <div aria-hidden className="sa-billing-plan-accent" />
        {visual.popular ? <span className="sa-billing-plan-badge">Önerilen</span> : null}

        <div className="sa-billing-plan-watermark" aria-hidden>
          {formatUSD(pkg.pricePerStudentUsd).replace(".00", "")}
        </div>

        <div className="sa-billing-plan-body">
          <div className="sa-billing-plan-head">
            <span className="sa-billing-plan-icon">
              <Icon size={18} />
            </span>
            <div>
              <p className="sa-billing-plan-label">Lisans planı</p>
              <strong>{pkg.name}</strong>
              <span>{pkg.tagline}</span>
            </div>
          </div>

          <div className="sa-billing-plan-chips">
            <span className="sa-billing-plan-chip">
              <Wallet size={11} aria-hidden />
              Min. {formatUSD(pkg.minOrderUsd)}/yıl
            </span>
            <span className="sa-billing-plan-chip">
              <GraduationCap size={11} aria-hidden />
              {formatNumber(studentFloor)} öğrenci eşdeğeri
            </span>
          </div>

          <ul className="sa-billing-plan-features">
            {pkg.features.slice(0, 4).map((feature) => (
              <li key={feature}>
                <Check size={13} strokeWidth={2.5} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          aria-pressed={active}
          className="sa-billing-plan-open"
          onClick={() => selectPackage(pkg.id)}
          type="button"
        >
          {active ? "Seçili plan" : "Planı seç"}
          <ChevronRight size={14} aria-hidden />
        </button>
      </article>
    );
  }

  return (
    <section className="principal-page-stack guidance-data-page sa-billing-page">
      <div className="sa-billing-topbar">
        <div className="sa-billing-topbar-title">
          <Wallet size={18} aria-hidden />
          <span>Faturalama</span>
        </div>
        <button
          className="sa-billing-btn sa-billing-btn--ghost"
          disabled={loading}
          onClick={() => void load()}
          type="button"
        >
          <RefreshCw className={loading ? "spin" : undefined} size={15} />
          Yenile
        </button>
      </div>

      <div className="sa-billing-hero">
        <div className="sa-billing-hero-left">
          <div aria-hidden className="sa-billing-hero-icon">
            <FileText size={22} strokeWidth={1.7} />
          </div>
          <div>
            <h1 className="sa-billing-hero-name">Faturalama & fiyat teklifi</h1>
            <p className="sa-billing-hero-sub">
              Starter, Core ve Premium paketlerle öğrenci bazlı lisanslama. Teklif oluştururken birim fiyat ve minimumu
              özelleştirebilirsiniz.
            </p>
          </div>
        </div>
        <div className="sa-billing-hero-stats">
          <div className="sa-billing-hero-stat">
            <strong>{formatNumber(overview?.totalInstitutions ?? 0)}</strong>
            <span>Kurum</span>
          </div>
          <div className="sa-billing-hero-stat">
            <strong>{formatNumber(overview?.totalStudents ?? 0)}</strong>
            <span>Öğrenci</span>
          </div>
          <div className="sa-billing-hero-stat">
            <strong>{formatUSD(overview?.totalAnnualUsd ?? 0)}</strong>
            <span>Core tahmini</span>
          </div>
        </div>
      </div>

      {error ? <div className="form-error sa-alert">{error}</div> : null}
      {notice ? <div className="sa-billing-notice">{notice}</div> : null}

      {loading && !overview ? (
        <div className="loading-line">
          <Loader2 className="spin" size={18} />
          Faturalama verileri yükleniyor
        </div>
      ) : (
        <>
          <div className="principal-stat-grid" aria-label="Faturalama özeti">
            <article className="principal-stat-card principal-stat-card--sky">
              <span aria-hidden className="principal-stat-icon">
                <Building2 size={20} />
              </span>
              <small>Aktif kurum</small>
              <strong>{formatNumber(overview?.totalInstitutions ?? 0)}</strong>
              <em>Platformdaki tenant sayısı</em>
            </article>
            <article className="principal-stat-card principal-stat-card--emerald">
              <span aria-hidden className="principal-stat-icon">
                <GraduationCap size={20} />
              </span>
              <small>Lisanslanabilir öğrenci</small>
              <strong>{formatNumber(overview?.totalStudents ?? 0)}</strong>
              <em>Tüm kurumlar toplamı</em>
            </article>
            <article className="principal-stat-card principal-stat-card--violet">
              <span aria-hidden className="principal-stat-icon">
                <Wallet size={20} />
              </span>
              <small>Core yıllık (USD)</small>
              <strong>{formatUSD(overview?.totalAnnualUsd ?? 0)}</strong>
              <em>{formatTRY(overview?.totalAnnualTry ?? 0)}</em>
            </article>
            <article className="principal-stat-card principal-stat-card--amber">
              <span aria-hidden className="principal-stat-icon">
                <Layers size={20} />
              </span>
              <small>Paket aralığı</small>
              <strong>$5 – $15</strong>
              <em>Min. $1.500 – $2.500 / yıl</em>
            </article>
          </div>

          <article className="principal-surface-card">
            <div className="principal-card-head">
              <h2>Lisans planları</h2>
              <p>Kuruma uygun planı seçin; teklif oluştururken fiyatı özelleştirebilirsiniz.</p>
            </div>
            <div className="sa-billing-plan-grid">{packages.map(renderPackageCard)}</div>
          </article>

          <div className="principal-visual-grid sa-billing-split">
            <article className="guidance-data-card">
              <header className="guidance-data-card-head">
                <h2>Kurum lisans özeti</h2>
                <div className="guidance-data-card-head-actions">
                  <span>{institutions.length} kurum</span>
                </div>
              </header>
              <div className="guidance-data-table-wrap">
                <table className="guidance-data-table">
                  <thead>
                    <tr>
                      <th>Kurum</th>
                      <th>Öğrenci</th>
                      <th>Plan</th>
                      <th>Yıllık (USD)</th>
                      <th>Yıllık (TRY)</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {institutions.length === 0 ? (
                      <tr>
                        <td colSpan={6}>Henüz kurum kaydı yok.</td>
                      </tr>
                    ) : (
                      institutions.map((row) => (
                        <tr key={row.tenantId}>
                          <td>
                            <span className="guidance-data-primary">{row.institutionName}</span>
                            <span className="guidance-data-secondary">{statusLabel(row.status)}</span>
                          </td>
                          <td>
                            <span className="guidance-data-num">{formatNumber(row.studentCount)}</span>
                          </td>
                          <td>
                            <span className="guidance-data-badge guidance-data-badge--slate">{row.plan || "—"}</span>
                          </td>
                          <td>
                            <span className="guidance-data-num">{formatUSD(row.annualUsd)}</span>
                          </td>
                          <td>
                            <span className="guidance-data-num">{formatTRY(row.annualTry)}</span>
                          </td>
                          <td>
                            <button
                              className="sa-billing-btn sa-billing-btn--ghost sa-billing-btn--compact"
                              onClick={() => applyInstitutionToQuote(row.tenantId)}
                              type="button"
                            >
                              Teklife al
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="principal-surface-card sa-billing-settings-card">
              <div className="principal-card-head">
                <h2>Teklif & kur ayarları</h2>
                <p>PDF tekliflerinde kullanılacak kur ve şirket bilgileri.</p>
              </div>
              {settingsDraft ? (
                <form className="sa-billing-form" onSubmit={(event) => void saveSettings(event)}>
                  <label>
                    USD / TRY kuru
                    <input
                      min={0.01}
                      onChange={(event) => setSettingsDraft({ ...settingsDraft, usdTryRate: Number(event.target.value) })}
                      step="0.01"
                      type="number"
                      value={settingsDraft.usdTryRate}
                    />
                  </label>
                  <label>
                    Teklif geçerlilik süresi (gün)
                    <input
                      min={1}
                      onChange={(event) =>
                        setSettingsDraft({ ...settingsDraft, quoteValidityDays: Number(event.target.value) })
                      }
                      type="number"
                      value={settingsDraft.quoteValidityDays}
                    />
                  </label>
                  <label>
                    Şirket adı
                    <input
                      onChange={(event) => setSettingsDraft({ ...settingsDraft, companyName: event.target.value })}
                      type="text"
                      value={settingsDraft.companyName}
                    />
                  </label>
                  <label>
                    Faturalama e-postası
                    <input
                      onChange={(event) => setSettingsDraft({ ...settingsDraft, companyEmail: event.target.value })}
                      type="email"
                      value={settingsDraft.companyEmail}
                    />
                  </label>
                  <button className="sa-billing-btn sa-billing-btn--primary" disabled={savingSettings} type="submit">
                    {savingSettings ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    Ayarları kaydet
                  </button>
                </form>
              ) : null}
            </article>
          </div>

          <div className="principal-visual-grid sa-billing-split">
            <article className="principal-surface-card sa-billing-quote-card">
              <div className="principal-card-head">
                <h2>Fiyat teklifi oluştur</h2>
                <p>Kurum bilgilerini doldurup teklif önizlemesi alın.</p>
              </div>
              <form className="sa-billing-form" onSubmit={(event) => void previewQuote(event)}>
                <label>
                  Seçili paket
                  <select onChange={(event) => selectPackage(event.target.value)} value={quoteForm.packageId}>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — {formatUSD(pkg.pricePerStudentUsd)}/öğrenci (min. {formatUSD(pkg.minOrderUsd)})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Kurum seç
                  <select
                    onChange={(event) => applyInstitutionToQuote(event.target.value)}
                    value={quoteForm.tenantId}
                  >
                    <option value="">Manuel / yeni kurum</option>
                    {institutions.map((row) => (
                      <option key={row.tenantId} value={row.tenantId}>
                        {row.institutionName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Kurum adı
                  <input
                    onChange={(event) => setQuoteForm({ ...quoteForm, institutionName: event.target.value })}
                    placeholder="Örn. Priente Koleji"
                    type="text"
                    value={quoteForm.institutionName}
                  />
                </label>
                <div className="sa-billing-form-row sa-billing-form-row--two">
                  <label>
                    Yetkili adı
                    <input
                      onChange={(event) => setQuoteForm({ ...quoteForm, contactName: event.target.value })}
                      type="text"
                      value={quoteForm.contactName}
                    />
                  </label>
                  <label>
                    E-posta
                    <input
                      onChange={(event) => setQuoteForm({ ...quoteForm, contactEmail: event.target.value })}
                      type="email"
                      value={quoteForm.contactEmail}
                    />
                  </label>
                </div>
                <div className="sa-billing-form-row">
                  <label>
                    Öğrenci sayısı
                    <input
                      min={1}
                      onChange={(event) => {
                        setQuoteForm({ ...quoteForm, studentCount: Number(event.target.value) });
                        setQuotePreview(null);
                      }}
                      type="number"
                      value={quoteForm.studentCount}
                    />
                  </label>
                  <label>
                    Süre (yıl)
                    <select
                      onChange={(event) => {
                        setQuoteForm({ ...quoteForm, termYears: Number(event.target.value) });
                        setQuotePreview(null);
                      }}
                      value={quoteForm.termYears}
                    >
                      <option value={1}>1 yıl</option>
                      <option value={2}>2 yıl</option>
                      <option value={3}>3 yıl</option>
                    </select>
                  </label>
                  <label>
                    İndirim (%)
                    <input
                      max={100}
                      min={0}
                      onChange={(event) =>
                        setQuoteForm({ ...quoteForm, discountPercent: Number(event.target.value) })
                      }
                      step="0.5"
                      type="number"
                      value={quoteForm.discountPercent}
                    />
                  </label>
                </div>
                <div className="sa-billing-custom-pricing">
                  <label className="sa-billing-toggle">
                    <input
                      checked={quoteForm.customPricingEnabled}
                      onChange={(event) => {
                        const enabled = event.target.checked;
                        setQuoteForm((current) => ({
                          ...current,
                          customPricingEnabled: enabled,
                          customPricePerStudentUsd: selectedPackage?.pricePerStudentUsd ?? current.customPricePerStudentUsd,
                          customMinOrderUsd: selectedPackage?.minOrderUsd ?? current.customMinOrderUsd
                        }));
                        setQuotePreview(null);
                      }}
                      type="checkbox"
                    />
                    <span>Özel fiyatlandırma (teklif bazlı)</span>
                  </label>
                  {quoteForm.customPricingEnabled && selectedPackage ? (
                    <div className="sa-billing-form-row sa-billing-form-row--two">
                      <label>
                        Birim fiyat (USD / öğrenci / yıl)
                        <input
                          min={0.01}
                          onChange={(event) => {
                            setQuoteForm({ ...quoteForm, customPricePerStudentUsd: Number(event.target.value) });
                            setQuotePreview(null);
                          }}
                          step="0.01"
                          type="number"
                          value={quoteForm.customPricePerStudentUsd}
                        />
                        <small>Varsayılan: {formatUSD(selectedPackage.pricePerStudentUsd)}</small>
                      </label>
                      <label>
                        Minimum sipariş (USD / yıl)
                        <input
                          min={0}
                          onChange={(event) => {
                            setQuoteForm({ ...quoteForm, customMinOrderUsd: Number(event.target.value) });
                            setQuotePreview(null);
                          }}
                          step="1"
                          type="number"
                          value={quoteForm.customMinOrderUsd}
                        />
                        <small>Varsayılan: {formatUSD(selectedPackage.minOrderUsd)} · 0 = minimum yok</small>
                      </label>
                    </div>
                  ) : null}
                </div>
                <label>
                  Notlar
                  <textarea
                    onChange={(event) => setQuoteForm({ ...quoteForm, notes: event.target.value })}
                    placeholder="Ödeme koşulları, lisans kapsamı veya özel notlar"
                    rows={3}
                    value={quoteForm.notes}
                  />
                </label>
                {estimate && selectedPackage ? (
                  <div className="sa-billing-estimate">
                    <div className="sa-billing-estimate-main">
                      <span>Tahmini toplam</span>
                      <strong>{formatUSD(estimate.totalUsd)}</strong>
                      <span>{formatTRY(estimate.totalUsd * (settingsDraft?.usdTryRate ?? 0))}</span>
                    </div>
                    <div className="sa-billing-estimate-detail">
                      <span>
                        Hesaplanan: {formatUSD(estimate.calculatedUsd)} ({formatNumber(quoteForm.studentCount)} ×{" "}
                        {formatUSD(estimate.pricePerStudentUsd)} × {quoteForm.termYears} yıl)
                      </span>
                      {quoteForm.customPricingEnabled ? (
                        <span className="sa-billing-custom-badge">Özel fiyatlandırma aktif</span>
                      ) : null}
                      {estimate.minimumApplied ? (
                        <span className="sa-billing-min-badge">
                          Minimum {formatUSD(estimate.minOrderUsd * quoteForm.termYears)} uygulandı
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <button className="sa-billing-btn sa-billing-btn--primary" disabled={previewingQuote} type="submit">
                  {previewingQuote ? <Loader2 className="spin" size={16} /> : <FileText size={16} />}
                  Teklif önizle
                </button>
              </form>
            </article>

            <article className="principal-surface-card sa-billing-preview-card">
              <div className="principal-card-head principal-card-head--split">
                <div>
                  <h2>PDF fiyat teklifi</h2>
                  <p>Önizleme ve indirme</p>
                </div>
                {quotePreview ? (
                  <button
                    className="sa-billing-btn sa-billing-btn--primary"
                    disabled={downloadingPdf}
                    onClick={() => void downloadPdf()}
                    type="button"
                  >
                    {downloadingPdf ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
                    PDF indir
                  </button>
                ) : null}
              </div>

              {!quotePreview ? (
                <div className="sa-billing-preview-empty">
                  <div className="sa-billing-preview-empty-icon">
                    <FileText size={28} />
                  </div>
                  <img alt="OGTA" className="sa-billing-logo" src="/ogta-wordmark.png" />
                  <h3>Teklif önizlemesi</h3>
                  <p>
                    Paket ve kurum bilgilerini doldurup teklif önizlemesi oluşturun. Minimum tutar otomatik uygulanır.
                  </p>
                  {selectedInstitution && selectedPackage ? (
                    <div className="sa-billing-preview-hint">
                      {selectedInstitution.institutionName} · {formatNumber(selectedInstitution.studentCount)} öğrenci ·{" "}
                      {selectedPackage.name} paketi
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="sa-billing-preview-body">
                  <div className="sa-billing-preview-hero">
                    <img alt="OGTA" className="sa-billing-logo" src="/ogta-wordmark.png" />
                    <div className="sa-billing-preview-hero-copy">
                      <span className="sa-billing-quote-no">{quotePreview.quoteNumber}</span>
                      <strong>{quotePreview.institutionName}</strong>
                      <span className={`sa-billing-package-badge sa-billing-package-badge--${quotePreview.packageId}`}>
                        {quotePreview.packageName} paketi
                      </span>
                    </div>
                    <div className="sa-billing-preview-hero-total">
                      <label>Toplam</label>
                      <strong>{formatUSD(quotePreview.totalUsd)}</strong>
                      <small>{formatTRY(quotePreview.totalTry)}</small>
                    </div>
                  </div>
                  <dl className="sa-billing-preview-meta">
                    <div>
                      <dt>Düzenleme</dt>
                      <dd>{new Date(quotePreview.issuedAt).toLocaleDateString("tr-TR")}</dd>
                    </div>
                    <div>
                      <dt>Geçerlilik</dt>
                      <dd>{new Date(quotePreview.validUntil).toLocaleDateString("tr-TR")}</dd>
                    </div>
                    <div>
                      <dt>Öğrenci</dt>
                      <dd>{formatNumber(quotePreview.studentCount)}</dd>
                    </div>
                    <div>
                      <dt>Birim fiyat</dt>
                      <dd>{formatUSD(quotePreview.pricePerStudentUsd)} / yıl</dd>
                    </div>
                  </dl>
                  <ul className="sa-billing-preview-features">
                    {quotePreview.packageFeatures.map((feature) => (
                      <li key={feature}>
                        <Check size={14} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="sa-billing-preview-lines">
                    {quotePreview.lineItems.map((item) => (
                      <div className="sa-billing-preview-line" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{formatUSD(item.amountUsd)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="sa-billing-preview-total">
                    <div>
                      <span>Toplam (USD)</span>
                      <strong>{formatUSD(quotePreview.totalUsd)}</strong>
                    </div>
                    <div>
                      <span>Toplam (TRY)</span>
                      <strong>{formatTRY(quotePreview.totalTry)}</strong>
                    </div>
                  </div>
                  {quotePreview.pricingCustomized ? (
                    <p className="sa-billing-preview-custom-note">
                      Bu teklifte varsayılandan farklı fiyatlandırma uygulanmıştır (birim:{" "}
                      {formatUSD(quotePreview.pricePerStudentUsd)}, min: {formatUSD(quotePreview.minOrderUsd)}).
                    </p>
                  ) : null}
                  {quotePreview.minimumApplied ? (
                    <p className="sa-billing-preview-min-note">
                      Minimum sipariş tutarı ({formatUSD(quotePreview.minOrderUsd)}/yıl) uygulanmıştır.
                    </p>
                  ) : null}
                  {quotePreview.notes ? <p className="sa-billing-preview-notes">{quotePreview.notes}</p> : null}
                </div>
              )}
            </article>
          </div>
        </>
      )}
    </section>
  );
}
