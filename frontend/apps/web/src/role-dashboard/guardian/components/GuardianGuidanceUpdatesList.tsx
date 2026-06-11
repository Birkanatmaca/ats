import { CalendarClock, ClipboardList } from "lucide-react";
import type { GuardianGuidanceUpdate } from "../../../lib/api";
import "./GuardianGuidanceUpdatesList.css";

function eventTypeLabel(eventType: GuardianGuidanceUpdate["eventType"]) {
  switch (eventType) {
    case "meeting":
      return "Görüşme";
    case "plan":
      return "Plan";
    case "follow_up":
      return "Takip";
    case "risk":
      return "Risk";
    case "status_change":
      return "Durum";
    default:
      return "Bilgi";
  }
}

function formatOccurredAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function GuardianGuidanceUpdatesList({ items, limit = 4 }: { items: GuardianGuidanceUpdate[]; limit?: number }) {
  const visible = items.slice(0, limit);

  if (visible.length === 0) {
    return <p className="guardian-guidance-updates-empty">Okulun sizinle paylaştığı rehberlik güncellemesi yok.</p>;
  }

  return (
    <ul className="guardian-guidance-updates-list">
      {visible.map((item) => (
        <li className="guardian-guidance-updates-row" key={item.id}>
          <div className="guardian-guidance-updates-icon" aria-hidden>
            {item.eventType === "meeting" ? <CalendarClock size={16} /> : <ClipboardList size={16} />}
          </div>
          <div className="guardian-guidance-updates-copy">
            <div className="guardian-guidance-updates-meta">
              <span>{eventTypeLabel(item.eventType)}</span>
              <time dateTime={item.occurredAt}>{formatOccurredAt(item.occurredAt)}</time>
            </div>
            <strong>{item.title || item.caseTitle}</strong>
            {item.body ? <p>{item.body}</p> : null}
            <small>{item.actorName}</small>
          </div>
        </li>
      ))}
    </ul>
  );
}
