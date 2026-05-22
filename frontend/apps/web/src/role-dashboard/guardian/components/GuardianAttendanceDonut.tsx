import { CheckCircle2, Clock3, XCircle } from "lucide-react";

type AttendanceStats = {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
};

const SEGMENTS = [
  { key: "presentCount" as const, label: "Geldi", color: "#059669", icon: CheckCircle2 },
  { key: "absentCount" as const, label: "Gelmedi", color: "#dc2626", icon: XCircle },
  { key: "lateCount" as const, label: "Geç", color: "#eab308", icon: Clock3 }
];

export function GuardianAttendanceDonut({ stats, compact = false }: { stats: AttendanceStats; compact?: boolean }) {
  const radius = 54;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  const total = stats.presentCount + stats.absentCount + stats.lateCount + stats.excusedCount;

  const arcs = SEGMENTS.map((segment) => ({
    ...segment,
    value: stats[segment.key]
  })).filter((segment) => segment.value > 0);

  let offset = 0;
  const slices =
    total > 0
      ? arcs.map((segment) => {
          const length = (segment.value / total) * circumference;
          const slice = {
            ...segment,
            dashArray: `${length} ${circumference - length}`,
            dashOffset: -offset
          };
          offset += length;
          return slice;
        })
      : [];

  const attendanceRate = total > 0 ? Math.round((stats.presentCount / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className={`guardian-attendance-donut guardian-attendance-donut--empty${compact ? " guardian-attendance-donut--compact" : ""}`}>
        <div className="guardian-attendance-donut-chart">
          <svg viewBox="0 0 140 140" aria-hidden>
            <circle className="guardian-attendance-donut-bg" cx="70" cy="70" r={radius} strokeWidth={stroke} />
            <text className="guardian-attendance-donut-center" x="70" y="72">
              0
            </text>
          </svg>
        </div>
        <p className="guidance-empty-pad">Henüz yoklama kaydı yok.</p>
      </div>
    );
  }

  return (
    <div className={`guardian-attendance-donut${compact ? " guardian-attendance-donut--compact" : ""}`}>
      <div className="guardian-attendance-donut-chart">
        <svg viewBox="0 0 140 140" aria-hidden>
          <circle className="guardian-attendance-donut-bg" cx="70" cy="70" r={radius} strokeWidth={stroke} />
          {slices.map((slice) => (
            <circle
              key={slice.key}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              transform="rotate(-90 70 70)"
            />
          ))}
          <text className="guardian-attendance-donut-center" x="70" y="66">
            {total}
          </text>
          <text className="guardian-attendance-donut-sub" x="70" y="84">
            kayıt
          </text>
        </svg>
        <div className="guardian-attendance-donut-summary">
          <strong>%{attendanceRate}</strong>
          <span>Katılım oranı</span>
        </div>
      </div>

      <div className="guardian-attendance-donut-legend">
        {SEGMENTS.map((segment) => {
          const Icon = segment.icon;
          const value = stats[segment.key];
          return (
            <div className="guardian-attendance-donut-legend-item" key={segment.key}>
              <span className="guardian-attendance-donut-dot" style={{ background: segment.color }} />
              <Icon size={15} aria-hidden />
              <span>{segment.label}</span>
              <strong>{value}</strong>
            </div>
          );
        })}
        {stats.excusedCount > 0 ? (
          <div className="guardian-attendance-donut-legend-item">
            <span className="guardian-attendance-donut-dot" style={{ background: "#6366f1" }} />
            <span>İzinli</span>
            <strong>{stats.excusedCount}</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}
