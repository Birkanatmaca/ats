import { statusLabel } from "../utils/labels";

export function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${value}`}>{statusLabel(value)}</span>;
}
