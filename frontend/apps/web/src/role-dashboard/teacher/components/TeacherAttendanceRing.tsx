export function TeacherAttendanceRing({
  percent,
  caption
}: {
  percent: number;
  caption: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="teacher-attendance-ring-wrap">
      <svg className="teacher-attendance-ring" viewBox="0 0 88 88" aria-hidden>
        <circle className="teacher-attendance-ring-bg" cx="44" cy="44" r={radius} />
        <circle
          className="teacher-attendance-ring-fg"
          cx="44"
          cy="44"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text className="teacher-attendance-ring-label" x="44" y="48">
          {clamped}%
        </text>
      </svg>
      <p className="teacher-attendance-ring-caption">{caption}</p>
    </div>
  );
}
