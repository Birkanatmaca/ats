import { BarChart3, Bus, CalendarDays, CircleDollarSign, ClipboardCheck, FolderOpen, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, type PrincipalReportOverview } from "../../../lib/api";
import "../../guidance/GuidanceDataPage.css";
import "./PrincipalReportsPage.css";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaultRange(days = 30) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * DAY_MS);
  return { from: isoDate(from), to: isoDate(to) };
}

function money(value: number, currency: string) {
  return `${Math.round(value).toLocaleString("tr-TR")} ${currency || "TRY"}`;
}

function count(value: number) {
  return value.toLocaleString("tr-TR");
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "rose";
}) {
  return (
    <article className={`principal-report-stat principal-report-stat--${tone}`}>
      <div className="principal-report-stat-icon">{icon}</div>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
  );
}

export function PrincipalReportsPage() {
  const initialRange = useMemo(() => defaultRange(30), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [report, setReport] = useState<PrincipalReportOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextReport = await api.principalReports({ from, to });
      setReport(nextReport);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Rapor verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const maxDailyTotal = useMemo(() => {
    const totals = report?.attendance.daily.map((item) => item.absent + item.late) ?? [];
    return Math.max(1, ...totals);
  }, [report?.attendance.daily]);

  function applyPreset(days: number) {
    const next = defaultRange(days);
    setFrom(next.from);
    setTo(next.to);
  }

  const currency = report?.billing.currency ?? "TRY";

  return (
    <section className="principal-page-stack guidance-data-page principal-reports-page">
      <header className="principal-reports-hero">
        <div>
          <span className="sa-kicker">Raporlar</span>
          <h1>Yönetici rapor özeti</h1>
          <p>Yoklama, tahsilat, rehberlik ve servis operasyonlarını seçili tarih aralığında takip edin.</p>
        </div>
        <button className="sa-secondary-btn" type="button" onClick={() => void reload()} disabled={loading}>
          {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          Yenile
        </button>
      </header>

      <article className="principal-reports-filters">
        <div className="principal-reports-presets" aria-label="Hızlı tarih aralığı">
          {[30, 60, 90].map((days) => (
            <button key={days} type="button" onClick={() => applyPreset(days)}>
              {days} gün
            </button>
          ))}
        </div>
        <label>
          <span>Başlangıç</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          <span>Bitiş</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </article>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="principal-report-grid">
        <StatCard
          icon={<ClipboardCheck size={18} />}
          label="Yoklama tamamlanma"
          value={loading ? "..." : `${report?.attendance.completionPct ?? 0}%`}
          detail={`${count(report?.attendance.finalizedSessions ?? 0)} / ${count(report?.attendance.sessions ?? 0)} ders`}
          tone="blue"
        />
        <StatCard
          icon={<CircleDollarSign size={18} />}
          label="Tahsilat"
          value={loading ? "..." : money(report?.billing.collectedAmount ?? 0, currency)}
          detail={`${count(report?.billing.paymentCount ?? 0)} ödeme, ${count(report?.billing.overdueCount ?? 0)} gecikmiş`}
          tone="green"
        />
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Rehberlik"
          value={loading ? "..." : count((report?.guidance.openCases ?? 0) + (report?.guidance.monitoringCases ?? 0))}
          detail={`${count(report?.guidance.highPriorityOpen ?? 0)} yüksek öncelik, ${count(report?.guidance.newCases ?? 0)} yeni vaka`}
          tone="amber"
        />
        <StatCard
          icon={<Bus size={18} />}
          label="Servis"
          value={loading ? "..." : count(report?.transport.trips ?? 0)}
          detail={`${count(report?.transport.delayEvents ?? 0)} gecikme, ${count(report?.transport.incidentEvents ?? 0)} olay`}
          tone="rose"
        />
      </div>

      <div className="principal-reports-sections">
        <article className="guidance-data-card principal-report-panel">
          <header className="guidance-data-card-head">
            <div>
              <h2>Günlük yoklama trendi</h2>
              <span>{report ? `${report.from} - ${report.to}` : "Yükleniyor"}</span>
            </div>
            <BarChart3 size={18} aria-hidden />
          </header>
          {loading ? <p className="guidance-data-empty">Rapor yükleniyor...</p> : null}
          {!loading && report?.attendance.daily.length === 0 ? (
            <p className="guidance-data-empty">Bu aralıkta kesinleşmiş yoklama kaydı yok.</p>
          ) : null}
          {!loading && report && report.attendance.daily.length > 0 ? (
            <div className="principal-report-daily-list">
              {report.attendance.daily.slice(-14).map((item) => {
                const attentionTotal = item.absent + item.late;
                const width = Math.max(6, Math.round((attentionTotal / maxDailyTotal) * 100));
                return (
                  <div className="principal-report-daily-row" key={item.date}>
                    <span>{dateLabel(item.date)}</span>
                    <div className="principal-report-daily-bar" aria-label={`${item.date} devamsız ve geç kayıt toplamı ${attentionTotal}`}>
                      <i style={{ width: `${width}%` }} />
                    </div>
                    <strong>{count(attentionTotal)}</strong>
                  </div>
                );
              })}
            </div>
          ) : null}
        </article>

        <article className="guidance-data-card principal-report-panel">
          <header className="guidance-data-card-head">
            <div>
              <h2>Dönem kırılımı</h2>
              <span>{report ? `Güncellendi: ${new Date(report.generatedAt).toLocaleString("tr-TR")}` : "Yükleniyor"}</span>
            </div>
            <CalendarDays size={18} aria-hidden />
          </header>
          <div className="principal-report-breakdown">
            <div>
              <small>Yoklama</small>
              <strong>{count(report?.attendance.absent ?? 0)} devamsız</strong>
              <span>{count(report?.attendance.late ?? 0)} geç, {count(report?.attendance.excused ?? 0)} izinli</span>
            </div>
            <div>
              <small>Tahsilat</small>
              <strong>{money(report?.billing.overdueAmount ?? 0, currency)}</strong>
              <span>{money(report?.billing.upcomingAmount ?? 0, currency)} yaklaşan vade</span>
            </div>
            <div>
              <small>Rehberlik</small>
              <strong>{count(report?.guidance.events ?? 0)} olay kaydı</strong>
              <span>{count(report?.guidance.closedCases ?? 0)} kapalı vaka</span>
            </div>
            <div>
              <small>Servis</small>
              <strong>{count(report?.transport.completedTrips ?? 0)} tamamlanan</strong>
              <span>{count(report?.transport.activeTrips ?? 0)} aktif sefer</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
