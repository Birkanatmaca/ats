import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { GuardianAttendanceRecord } from "../types";

const statusMeta: Record<
  GuardianAttendanceRecord["status"],
  { label: string; className: string; icon: React.ReactNode }
> = {
  present: { label: "Geldi", className: "active", icon: <CheckCircle2 size={15} /> },
  absent: { label: "Gelmedi", className: "critical", icon: <XCircle size={15} /> },
  late: { label: "Geç", className: "warning", icon: <Clock3 size={15} /> },
  excused: { label: "İzinli", className: "normal", icon: <AlertCircle size={15} /> },
  unknown: { label: "Bekliyor", className: "normal", icon: <AlertCircle size={15} /> }
};

export function GuardianAttendanceList({ records, limit }: { records: GuardianAttendanceRecord[]; limit?: number }) {
  const visibleRecords = typeof limit === "number" ? records.slice(0, limit) : records;

  if (visibleRecords.length === 0) {
    return <p className="empty-text guardian-empty-pad">Devamsızlık kaydı bulunamadı.</p>;
  }

  return (
    <div className="guardian-attendance-list">
      {visibleRecords.map((record) => {
        const meta = statusMeta[record.status] ?? statusMeta.unknown;
        return (
          <article className="guardian-attendance-row" key={record.id}>
            <div>
              <strong>{record.lesson}</strong>
              <span>{formatDate(record.date)} · {record.note}</span>
            </div>
            <span className={`status-badge ${meta.className}`}>
              {meta.icon}
              {meta.label}
            </span>
          </article>
        );
      })}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    weekday: "short"
  }).format(date);
}
