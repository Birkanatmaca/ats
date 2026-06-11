import { CircleDollarSign, Download, Loader2, ReceiptText, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type BillingDashboard, type PaymentInstallment } from "../../../lib/api";
import type { ClassStudent, SchoolClass } from "../types";
import { BillingStudentPanel } from "../components/BillingStudentPanel";
import "../../guidance/GuidanceDataPage.css";
import "./PrincipalBillingPage.css";

function money(value?: number) {
  return `${Math.round(value ?? 0).toLocaleString("tr-TR")} TL`;
}

function statusLabel(status: PaymentInstallment["status"]) {
  if (status === "paid") return "Ödendi";
  if (status === "partial") return "Kısmi";
  if (status === "overdue") return "Gecikmiş";
  if (status === "cancelled") return "İptal";
  return "Bekliyor";
}

function exportOverdueCsv(rows: PaymentInstallment[]) {
  const header = ["Öğrenci", "Sınıf", "Plan", "Vade", "Kalan", "Durum"];
  const lines = rows.map((item) =>
    [
      item.studentName ?? "",
      item.className ?? "",
      item.planName ?? "",
      item.dueDate,
      String(Math.round(item.remainingAmount)),
      statusLabel(item.status)
    ]
      .map((cell) => `"${cell.replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([`\uFEFF${[header.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `geciken-taksitler-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PrincipalBillingPage({
  students,
  classes
}: {
  students: ClassStudent[];
  classes: SchoolClass[];
}) {
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [overdue, setOverdue] = useState<PaymentInstallment[]>([]);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const activeStudents = useMemo(() => students.filter((item) => item.status === "active"), [students]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextDashboard, nextOverdue, nextInstallments] = await Promise.all([
        api.billingDashboard(),
        api.billingOverdueReport(),
        api.billingInstallments({
          status: statusFilter || undefined,
          classId: classFilter || undefined
        })
      ]);
      setDashboard(nextDashboard);
      setOverdue(nextOverdue);
      setInstallments(nextInstallments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Tahsilat verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, classFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredInstallments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return installments.filter((item) => {
      if (!q) return true;
      const blob = `${item.studentName ?? ""} ${item.className ?? ""} ${item.planName ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [installments, search]);

  const selectedStudent = activeStudents.find((item) => item.id === selectedStudentId) ?? null;

  return (
    <section className="principal-page-stack guidance-data-page principal-billing-page">
      <header className="principal-billing-hero">
        <div>
          <h1>Tahsilat</h1>
          <p>Ödeme planları, taksit takibi ve geciken ödemeler</p>
        </div>
        <button className="sa-secondary-btn" type="button" onClick={() => void reload()} disabled={loading}>
          {loading ? <Loader2 className="spin" size={16} /> : <ReceiptText size={16} />}
          Yenile
        </button>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="principal-billing-kpis">
        <article>
          <CircleDollarSign size={18} aria-hidden />
          <small>Tahsil edilen</small>
          <strong>{loading ? "…" : money(dashboard?.collectedAmount)}</strong>
        </article>
        <article>
          <small>Bekleyen</small>
          <strong>{loading ? "…" : money(dashboard?.outstandingAmount)}</strong>
        </article>
        <article className="is-danger">
          <small>Gecikmiş</small>
          <strong>{loading ? "…" : money(dashboard?.overdueAmount)}</strong>
        </article>
        <article>
          <small>Aktif plan</small>
          <strong>{loading ? "…" : (dashboard?.activePlanCount ?? 0)}</strong>
        </article>
      </div>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head principal-billing-card-head">
          <div>
            <h2>Geciken taksitler</h2>
            <span>{overdue.length} kayıt</span>
          </div>
          <button className="sa-secondary-btn" type="button" onClick={() => exportOverdueCsv(overdue)} disabled={overdue.length === 0}>
            <Download size={16} />
            CSV indir
          </button>
        </header>
        {overdue.length === 0 ? (
          <p className="empty-text">Geciken taksit bulunmuyor.</p>
        ) : (
          <div className="guidance-data-table-wrap">
            <table className="guidance-data-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Sınıf</th>
                  <th>Plan</th>
                  <th>Vade</th>
                  <th>Kalan</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((item) => (
                  <tr key={item.id}>
                    <td>{item.studentName ?? "—"}</td>
                    <td>{item.className ?? "—"}</td>
                    <td>{item.planName ?? "—"}</td>
                    <td>{item.dueDate}</td>
                    <td>{money(item.remainingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Taksit listesi</h2>
          <span>Filtrele ve ara</span>
        </header>
        <div className="principal-billing-filters">
          <label>
            <span>Durum</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Tümü</option>
              <option value="pending">Bekliyor</option>
              <option value="partial">Kısmi</option>
              <option value="overdue">Gecikmiş</option>
              <option value="paid">Ödendi</option>
            </select>
          </label>
          <label>
            <span>Sınıf</span>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">Tümü</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="principal-billing-search">
            <span>Ara</span>
            <div className="principal-billing-search-field">
              <Search size={15} aria-hidden />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Öğrenci veya plan" />
            </div>
          </label>
        </div>
        {filteredInstallments.length === 0 ? (
          <p className="empty-text">Taksit kaydı bulunamadı.</p>
        ) : (
          <div className="guidance-data-table-wrap">
            <table className="guidance-data-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Sınıf</th>
                  <th>Plan</th>
                  <th>Vade</th>
                  <th>Kalan</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstallments.slice(0, 50).map((item) => (
                  <tr key={item.id}>
                    <td>{item.studentName ?? "—"}</td>
                    <td>{item.className ?? "—"}</td>
                    <td>{item.planName ?? "—"}</td>
                    <td>{item.dueDate}</td>
                    <td>{money(item.remainingAmount)}</td>
                    <td>{statusLabel(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Öğrenci tahsilatı</h2>
          <span>Plan oluştur ve ödeme kaydet</span>
        </header>
        <label className="principal-billing-student-select">
          <span>Öğrenci seç</span>
          <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
            <option value="">Seçin…</option>
            {activeStudents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.firstName} {item.lastName} · {item.schoolNumber}
              </option>
            ))}
          </select>
        </label>
        {selectedStudent ? (
          <BillingStudentPanel key={selectedStudent.id} student={selectedStudent} onChanged={() => void reload()} />
        ) : (
          <p className="empty-text">Tahsilat işlemi için öğrenci seçin.</p>
        )}
      </article>
    </section>
  );
}
