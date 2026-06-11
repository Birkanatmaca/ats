import { CreditCard, Loader2, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type GuardianBillingSummary, type PaymentInstallment } from "../../../lib/api";
import "./GuardianBillingCard.css";

function money(value?: number) {
  return `${Math.round(value ?? 0).toLocaleString("tr-TR")} TL`;
}

export function GuardianBillingCard({ studentId }: { studentId: string }) {
  const [summary, setSummary] = useState<GuardianBillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setHidden(false);
    void api
      .guardianBilling(studentId)
      .then((next) => {
        if (active) setSummary(next);
      })
      .catch(() => {
        if (active) setHidden(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  if (hidden) return null;

  return (
    <div className="guardian-billing-card">
      <div className="guardian-billing-card-head">
        <div className="guardian-billing-card-icon">
          <CreditCard size={18} aria-hidden />
        </div>
        <div>
          <h3>Tahsilat özeti</h3>
          <p>{loading ? "Yükleniyor…" : `${summary?.upcomingInstallments.length ?? 0} bekleyen taksit`}</p>
        </div>
        <strong>{loading ? "…" : money(summary?.outstandingAmount)}</strong>
      </div>

      {(summary?.overdueInstallments ?? []).slice(0, 2).map((item: PaymentInstallment) => (
        <div key={item.id} className="guardian-billing-row is-danger">
          <ReceiptText size={14} aria-hidden />
          <div>
            <strong>Gecikmiş taksit</strong>
            <span>{item.dueDate}</span>
          </div>
          <em>{money(item.remainingAmount)}</em>
        </div>
      ))}

      {(summary?.upcomingInstallments ?? []).slice(0, 3).map((item) => (
        <div key={item.id} className="guardian-billing-row">
          <ReceiptText size={14} aria-hidden />
          <div>
            <strong>{item.planName ?? "Ödeme planı"}</strong>
            <span>{item.dueDate}</span>
          </div>
          <em>{money(item.remainingAmount)}</em>
        </div>
      ))}

      {summary?.paymentHistory?.[0] ? (
        <p className="guardian-billing-history">
          Son ödeme: {money(summary.paymentHistory[0].amount)} · {summary.paymentHistory[0].paidAt.slice(0, 10)}
        </p>
      ) : null}
    </div>
  );
}
