import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { GuardianAttendanceRecord } from "../types";
import { weekdayLabel } from "../../teacher/utils/lessonSchedule";

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

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatWeekday(record: GuardianAttendanceRecord) {
  if (record.dayOfWeek) {
    return weekdayLabel(record.dayOfWeek);
  }
  const date = new Date(`${record.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return weekdayLabel(date.getDay());
}

function formatTimeRange(record: GuardianAttendanceRecord) {
  const start = normalizeClock(record.startTime);
  const end = normalizeClock(record.endTime);
  if (start && end) {
    return `${start} – ${end}`;
  }
  if (start) {
    return start;
  }
  return "—";
}

function normalizeClock(value?: string) {
  if (!value?.trim()) {
    return "";
  }
  return value.trim().slice(0, 5);
}

export function GuardianAttendanceList({
  records,
  limit,
  variant = "compact"
}: {
  records: GuardianAttendanceRecord[];
  limit?: number;
  variant?: "compact" | "table";
}) {
  const visibleRecords = typeof limit === "number" ? records.slice(0, limit) : records;

  if (visibleRecords.length === 0) {
    return <p className="empty-text guardian-empty-pad">Devamsızlık kaydı bulunamadı.</p>;
  }

  if (variant === "table") {
    return (
      <div className="guidance-data-table-wrap guardian-attendance-table-wrap">
        <table className="guidance-data-table guardian-attendance-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Gün</th>
              <th>Saat</th>
              <th>Ders</th>
              <th>Durum</th>
              <th>Not</th>
            </tr>
          </thead>
          <tbody>
            {visibleRecords.map((record) => {
              const meta = statusMeta[record.status] ?? statusMeta.unknown;
              return (
                <tr key={record.id}>
                  <td className="guidance-data-date-cell">{formatDate(record.date)}</td>
                  <td>{formatWeekday(record)}</td>
                  <td className="guidance-data-date-cell">{formatTimeRange(record)}</td>
                  <td>
                    <span className="guidance-data-primary">{record.lesson}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${meta.className}`}>
                      {meta.icon}
                      {meta.label}
                    </span>
                  </td>
                  <td>
                    <span className="guidance-data-secondary">{record.note?.trim() || "—"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="guardian-attendance-list">
      {visibleRecords.map((record) => {
        const meta = statusMeta[record.status] ?? statusMeta.unknown;
        return (
          <article className="guardian-attendance-row" key={record.id}>
            <div>
              <strong>{record.lesson}</strong>
              <span>
                {formatWeekday(record)} · {formatTimeRange(record)} · {formatDate(record.date)}
                {record.note ? ` · ${record.note}` : ""}
              </span>
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
