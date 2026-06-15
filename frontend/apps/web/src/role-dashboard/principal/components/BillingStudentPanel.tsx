import { FileText, Loader2, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, type BillingAccount, type PaymentInstallment, type PaymentMethod } from "../../../lib/api";
import { ResourceFileManager } from "../../components/ResourceFileManager";
import type { ClassStudent } from "../types";
import "./BillingStudentPanel.css";

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Nakit" },
  { value: "bank_transfer", label: "Havale/EFT" },
  { value: "card", label: "Kart" },
  { value: "other", label: "Diğer" }
];

function money(value?: number) {
  return `${Math.round(value ?? 0).toLocaleString("tr-TR")} TL`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(status: PaymentInstallment["status"]) {
  if (status === "paid") return "Ödendi";
  if (status === "partial") return "Kısmi";
  if (status === "overdue") return "Gecikmiş";
  if (status === "cancelled") return "İptal";
  return "Bekliyor";
}

export function BillingStudentPanel({
  student,
  onChanged
}: {
  student: ClassStudent;
  onChanged?: () => void;
}) {
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportRefresh, setReportRefresh] = useState(0);

  const [planName, setPlanName] = useState("Eğitim ücreti");
  const [planAmount, setPlanAmount] = useState("30000");
  const [installmentCount, setInstallmentCount] = useState("3");
  const [startDate, setStartDate] = useState(todayIso());

  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentNote, setPaymentNote] = useState("");

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const next = await api.billingStudentAccount(student.id);
      setAccount(next);
    } catch (loadError) {
      const status = (loadError as { status?: number })?.status;
      if (status === 404) {
        setAccount(null);
        setNotFound(true);
      } else {
        setError(loadError instanceof Error ? loadError.message : "Tahsilat hesabı alınamadı.");
      }
    } finally {
      setLoading(false);
    }
  }, [student.id]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const installments =
    account?.plans.flatMap((plan) =>
      plan.installments.map((installment) => ({
        ...installment,
        planName: installment.planName ?? plan.name
      }))
    ) ?? [];
  const openInstallments = installments.filter((item) => item.remainingAmount > 0 && item.status !== "cancelled");
  const outstanding = openInstallments.reduce((total, item) => total + item.remainingAmount, 0);
  const overdueAmount = openInstallments
    .filter((item) => item.status === "overdue")
    .reduce((total, item) => total + item.remainingAmount, 0);
  const hasReceiptPayment = installments.some((item) => (item.payments ?? []).some((payment) => !payment.void));

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const amount = Number(planAmount.replace(",", "."));
      const count = Number.parseInt(installmentCount, 10);
      if (!planName.trim() || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(count) || count <= 0 || !startDate.trim()) {
        throw new Error("Plan adı, tutar, taksit ve başlangıç tarihi zorunludur.");
      }
      const next = await api.createBillingPlan(student.id, {
        name: planName.trim(),
        totalAmount: amount,
        currency: "TRY",
        startDate: startDate.trim(),
        installmentCount: count
      });
      setAccount(next);
      setNotFound(false);
      onChanged?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Plan oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  function openPaymentForm(item: PaymentInstallment) {
    setPayingInstallmentId(item.id);
    setPaymentAmount(String(Math.round(item.remainingAmount)));
    setPaymentMethod("cash");
    setPaymentNote("");
  }

  async function submitPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!payingInstallmentId) return;
    setBusy(true);
    setError(null);
    try {
      const amount = Number(paymentAmount.replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Geçerli bir ödeme tutarı girin.");
      }
      await api.createBillingPayment(payingInstallmentId, {
        amount,
        method: paymentMethod,
        note: paymentNote.trim() || undefined
      });
      setPayingInstallmentId(null);
      await loadAccount();
      onChanged?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ödeme kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function voidPayment(paymentId: string) {
    if (!window.confirm("Bu ödeme kaydını iptal etmek istediğinize emin misiniz?")) return;
    setBusy(true);
    setError(null);
    try {
      await api.voidBillingPayment(paymentId);
      await loadAccount();
      onChanged?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ödeme iptal edilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function generateReceipt(paymentId?: string) {
    setReportBusy(paymentId ?? "latest");
    setReportMessage(null);
    setError(null);
    try {
      const report = await api.generateBillingReceiptReport({ studentId: student.id, paymentId });
      setReportMessage(`${report.title} oluşturuldu.`);
      setReportRefresh((value) => value + 1);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Makbuz oluşturulamadı.");
    } finally {
      setReportBusy(null);
    }
  }

  return (
    <article className="billing-student-panel">
      <header className="billing-student-panel-head">
        <div>
          <h3>
            {student.firstName} {student.lastName}
          </h3>
          <p>
            {student.schoolNumber} · {account?.className ?? "—"}
          </p>
        </div>
        <div className="billing-student-panel-head-actions">
          <button
            className="ghost-action small-action"
            type="button"
            onClick={() => void generateReceipt()}
            disabled={loading || !account || !hasReceiptPayment || reportBusy !== null}
          >
            {reportBusy === "latest" ? <Loader2 className="spin" size={15} /> : <FileText size={15} />}
            Son makbuz PDF
          </button>
          <strong className="billing-student-panel-total">{loading ? "…" : money(outstanding)}</strong>
        </div>
      </header>

      {loading ? (
        <p className="billing-student-panel-loading">
          <Loader2 className="spin" size={16} aria-hidden />
          Tahsilat hesabı yükleniyor…
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {reportMessage ? <p className="form-success">{reportMessage}</p> : null}

      {!loading ? (
        <>
          <div className="billing-student-metrics">
            <div>
              <small>Bekleyen</small>
              <strong>{money(outstanding)}</strong>
            </div>
            <div>
              <small>Gecikmiş</small>
              <strong className={overdueAmount > 0 ? "is-danger" : undefined}>{money(overdueAmount)}</strong>
            </div>
            <div>
              <small>Plan</small>
              <strong>{account?.plans.length ?? 0}</strong>
            </div>
          </div>

          {openInstallments.length > 0 ? (
            <div className="billing-installment-list">
              {openInstallments.map((item) => (
                <div key={item.id} className="billing-installment-row">
                  <ReceiptText size={15} aria-hidden />
                  <div className="billing-installment-copy">
                    <strong>{item.planName ?? "Ödeme planı"}</strong>
                    <span>
                      {item.dueDate} · {statusLabel(item.status)} · {money(item.remainingAmount)}
                    </span>
                  </div>
                  <button className="sa-secondary-btn" type="button" onClick={() => openPaymentForm(item)} disabled={busy}>
                    Tahsil et
                  </button>
                </div>
              ))}
            </div>
          ) : notFound ? (
            <p className="empty-text">Henüz ödeme planı yok. Aşağıdan yeni plan oluşturabilirsiniz.</p>
          ) : (
            <p className="empty-text">Açık taksit bulunmuyor.</p>
          )}

          {payingInstallmentId ? (
            <form className="billing-payment-form" onSubmit={submitPayment}>
              <h4>Ödeme kaydı</h4>
              <div className="billing-payment-grid">
                <label>
                  <span>Tutar (TL)</span>
                  <input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} inputMode="decimal" />
                </label>
                <label>
                  <span>Yöntem</span>
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                    {paymentMethods.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="billing-payment-note">
                  <span>Not</span>
                  <input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Opsiyonel" />
                </label>
              </div>
              <div className="billing-payment-actions">
                <button className="sa-secondary-btn" type="button" onClick={() => setPayingInstallmentId(null)} disabled={busy}>
                  Vazgeç
                </button>
                <button className="primary-action" type="submit" disabled={busy}>
                  {busy ? <Loader2 className="spin" size={16} /> : "Kaydet"}
                </button>
              </div>
            </form>
          ) : null}

          {account?.plans.some((plan) => plan.installments.some((item) => (item.payments ?? []).length > 0)) ? (
            <div className="billing-payment-history">
              <h4>Ödeme geçmişi</h4>
              {account.plans.flatMap((plan) =>
                plan.installments.flatMap((installment) =>
                  (installment.payments ?? []).map((payment) => (
                    <div key={payment.id} className="billing-payment-history-row">
                      <div>
                        <strong>{money(payment.amount)}</strong>
                        <span>
                          {payment.paidAt.slice(0, 10)} · {plan.name}
                          {payment.void ? " · İptal" : ""}
                        </span>
                      </div>
                      {!payment.void ? (
                        <div className="billing-payment-history-actions">
                          <button className="ghost-action" type="button" onClick={() => void generateReceipt(payment.id)} disabled={reportBusy !== null}>
                            {reportBusy === payment.id ? <Loader2 className="spin" size={14} /> : <FileText size={14} />}
                            Makbuz PDF
                          </button>
                          <button className="ghost-action danger" type="button" onClick={() => void voidPayment(payment.id)} disabled={busy}>
                            İptal
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )
              )}
            </div>
          ) : null}

          {account ? (
            <ResourceFileManager
              title="Makbuzlar"
              category="report"
              resourceType="billing_account"
              resourceId={account.id}
              canUpload={false}
              compact
              emptyText="Bu hesap için henüz makbuz üretilmedi."
              refreshSignal={reportRefresh}
            />
          ) : null}

          <form className="billing-plan-form" onSubmit={createPlan}>
            <h4>Yeni ödeme planı</h4>
            <div className="billing-plan-grid">
              <label>
                <span>Plan adı</span>
                <input value={planName} onChange={(event) => setPlanName(event.target.value)} />
              </label>
              <label>
                <span>Toplam tutar</span>
                <input value={planAmount} onChange={(event) => setPlanAmount(event.target.value)} inputMode="decimal" />
              </label>
              <label>
                <span>Taksit sayısı</span>
                <input value={installmentCount} onChange={(event) => setInstallmentCount(event.target.value)} inputMode="numeric" />
              </label>
              <label>
                <span>Başlangıç</span>
                <input value={startDate} onChange={(event) => setStartDate(event.target.value)} placeholder="YYYY-MM-DD" />
              </label>
            </div>
            <button className="primary-action" type="submit" disabled={busy}>
              {busy ? <Loader2 className="spin" size={16} /> : "Plan oluştur"}
            </button>
          </form>
        </>
      ) : null}
    </article>
  );
}
