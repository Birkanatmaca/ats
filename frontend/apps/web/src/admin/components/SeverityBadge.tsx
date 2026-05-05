export function SeverityBadge({ value }: { value: string }) {
  return <span className={`severity-badge ${value}`}>{value}</span>;
}
