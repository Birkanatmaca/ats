import { BarChart3, Bus, CalendarDays, CircleDollarSign, ClipboardCheck, FolderOpen, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type PrincipalReportOverview } from "../../../lib/api";
import "./PrincipalReportsPage.css";

const DAY_MS = 24 * 60 * 60 * 1000;

const CHART_TOOLTIP = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#0f172a",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)"
};

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
    <article className={`prp-kpi prp-kpi--${tone}`}>
      <div className="prp-kpi-icon">{icon}</div>
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

  const chartData = useMemo(
    () =>
      (report?.attendance.daily ?? []).map((item) => ({
        date: dateLabel(item.date),
        absent: item.absent,
        late: item.late,
        attention: item.absent + item.late
      })),
    [report?.attendance.daily]
  );

  const activePreset = [30, 60, 90].find((days) => {
    const next = defaultRange(days);
    return next.from === from && next.to === to;
  });

  function applyPreset(days: number) {
    const next = defaultRange(days);
    setFrom(next.from);
    setTo(next.to);
  }

  const currency = report?.billing.currency ?? "TRY";
  const generatedAt = report ? new Date(report.generatedAt).toLocaleString("tr-TR") : "Yükleniyor";

  return (
    <section className="prp">
      <header className="prp-hero">
        <div>
          <p className="prp-kicker">Raporlar</p>
          <h1>Yönetici rapor özeti</h1>
          <p>Yoklama, tahsilat, rehberlik ve servis operasyonlarını seçili tarih aralığında izleyin.</p>
        </div>
        <button className="prp-refresh" type="button" onClick={() => void reload()} disabled={loading}>
          {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          Yenile
        </button>
      </header>

      <article className="prp-filters">
        <div className="prp-presets" aria-label="Hızlı tarih aralığı">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              type="button"
              className={activePreset === days ? "is-active" : undefined}
              onClick={() => applyPreset(days)}
            >
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

      {error ? <p className="prp-error">{error}</p> : null}

      <div className="prp-kpi-grid">
        <StatCard
          icon={<ClipboardCheck size={18} />}
          label="Yoklama tamamlanma"
          value={loading ? "…" : `${report?.attendance.completionPct ?? 0}%`}
          detail={`${count(report?.attendance.finalizedSessions ?? 0)} / ${count(report?.attendance.sessions ?? 0)} ders`}
          tone="blue"
        />
        <StatCard
          icon={<CircleDollarSign size={18} />}
          label="Tahsilat"
          value={loading ? "…" : money(report?.billing.collectedAmount ?? 0, currency)}
          detail={`${count(report?.billing.paymentCount ?? 0)} ödeme, ${count(report?.billing.overdueCount ?? 0)} gecikmiş`}
          tone="green"
        />
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Rehberlik"
          value={loading ? "…" : count((report?.guidance.openCases ?? 0) + (report?.guidance.monitoringCases ?? 0))}
          detail={`${count(report?.guidance.highPriorityOpen ?? 0)} yüksek öncelik, ${count(report?.guidance.newCases ?? 0)} yeni vaka`}
          tone="amber"
        />
        <StatCard
          icon={<Bus size={18} />}
          label="Servis"
          value={loading ? "…" : count(report?.transport.trips ?? 0)}
          detail={`${count(report?.transport.delayEvents ?? 0)} gecikme, ${count(report?.transport.incidentEvents ?? 0)} olay`}
          tone="rose"
        />
      </div>

      <div className="prp-grid">
        <article className="prp-card">
          <div className="prp-card-head">
            <div>
              <span>Trend</span>
              <h2>Günlük yoklama hareketi</h2>
              <small>{report ? `${dateLabel(report.from)} – ${dateLabel(report.to)}` : "Yükleniyor"}</small>
            </div>
            <BarChart3 size={18} aria-hidden />
          </div>
          {loading ? <p className="prp-loading">Rapor yükleniyor…</p> : null}
          {!loading && chartData.length === 0 ? (
            <p className="prp-empty">Bu aralıkta kesinleşmiş yoklama kaydı yok.</p>
          ) : null}
          {!loading && chartData.length > 0 ? (
            <div className="prp-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="prpAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#fb7185" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="prpLate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP}
                    formatter={(value: number, name: string) => [count(value), name === "absent" ? "Devamsız" : "Geç"]}
                  />
                  <Area type="monotone" dataKey="absent" stroke="#fb7185" fill="url(#prpAbsent)" strokeWidth={2} name="absent" />
                  <Area type="monotone" dataKey="late" stroke="#38bdf8" fill="url(#prpLate)" strokeWidth={2} name="late" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </article>

        <article className="prp-card">
          <div className="prp-card-head">
            <div>
              <span>Kırılım</span>
              <h2>Dönem özeti</h2>
              <small>Güncellendi: {generatedAt}</small>
            </div>
            <CalendarDays size={18} aria-hidden />
          </div>
          <div className="prp-breakdown">
            <div className="prp-break prp-kpi--blue">
              <div className="prp-break-icon">
                <ClipboardCheck size={16} />
              </div>
              <div>
                <small>Yoklama</small>
                <strong>{count(report?.attendance.absent ?? 0)} devamsız</strong>
                <span>
                  {count(report?.attendance.late ?? 0)} geç, {count(report?.attendance.excused ?? 0)} izinli
                </span>
              </div>
            </div>
            <div className="prp-break prp-kpi--green">
              <div className="prp-break-icon">
                <CircleDollarSign size={16} />
              </div>
              <div>
                <small>Tahsilat</small>
                <strong>{money(report?.billing.overdueAmount ?? 0, currency)}</strong>
                <span>{money(report?.billing.upcomingAmount ?? 0, currency)} yaklaşan vade</span>
              </div>
            </div>
            <div className="prp-break prp-kpi--amber">
              <div className="prp-break-icon">
                <FolderOpen size={16} />
              </div>
              <div>
                <small>Rehberlik</small>
                <strong>{count(report?.guidance.events ?? 0)} olay kaydı</strong>
                <span>{count(report?.guidance.closedCases ?? 0)} kapalı vaka</span>
              </div>
            </div>
            <div className="prp-break prp-kpi--rose">
              <div className="prp-break-icon">
                <Bus size={16} />
              </div>
              <div>
                <small>Servis</small>
                <strong>{count(report?.transport.completedTrips ?? 0)} tamamlanan</strong>
                <span>{count(report?.transport.activeTrips ?? 0)} aktif sefer</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
