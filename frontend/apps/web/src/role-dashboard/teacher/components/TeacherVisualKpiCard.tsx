import type { ReactNode } from "react";

type Tone = "sky" | "emerald" | "amber" | "violet" | "rose";
type Variant = "square" | "wide" | "chart";

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="teacher-visual-bars" aria-hidden>
      {values.map((value, index) => (
        <span key={index} style={{ height: `${Math.max(12, Math.round((value / max) * 100))}%` }} />
      ))}
    </div>
  );
}

function ProgressTrack({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="teacher-visual-progress" aria-hidden>
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function TeacherVisualKpiCard({
  detail,
  icon,
  label,
  progress,
  sparkValues,
  tone,
  value,
  variant = "square"
}: {
  detail?: string;
  icon: ReactNode;
  label: string;
  progress?: number;
  sparkValues?: number[];
  tone: Tone;
  value: ReactNode;
  variant?: Variant;
}) {
  const showChart = variant === "chart" && sparkValues && sparkValues.length > 0;
  const showProgress = typeof progress === "number";

  return (
    <article className={`teacher-visual-card teacher-visual-card--${tone} teacher-visual-card--${variant}`}>
      <div className="teacher-visual-card-top">
        <div className="teacher-visual-icon">{icon}</div>
        <div className="teacher-visual-copy">
          <span className="teacher-visual-label">{label}</span>
          <strong className="teacher-visual-value">{value}</strong>
          {detail ? <span className="teacher-visual-detail">{detail}</span> : null}
        </div>
      </div>
      {showChart ? <MiniBars values={sparkValues} /> : null}
      {showProgress ? <ProgressTrack value={progress} /> : null}
      {!showChart && !showProgress ? <div className="teacher-visual-accent-line" aria-hidden /> : null}
    </article>
  );
}

export function TeacherVisualMetricGrid({ children, columns }: { children: ReactNode; columns?: 4 | 5 }) {
  return (
    <div className={`teacher-visual-metric-grid${columns === 5 ? " teacher-visual-metric-grid--five" : ""}`} aria-label="Özet kartları">
      {children}
    </div>
  );
}
