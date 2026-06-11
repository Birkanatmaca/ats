import { useState } from "react";
import { api, type Announcement } from "../../../lib/api";

export function GuardianAnnouncementList({ announcements, detailed = false }: { announcements: Announcement[]; detailed?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(announcements.filter((item) => item.readAt).map((item) => item.id)));

  if (announcements.length === 0) {
    return <p className="empty-text guardian-empty-pad">Yayınlanmış duyuru yok.</p>;
  }

  async function handleToggle(announcement: Announcement) {
    const next = expandedId === announcement.id ? null : announcement.id;
    setExpandedId(next);
    if (!next || readIds.has(announcement.id)) {
      return;
    }
    try {
      await api.markAnnouncementRead(announcement.id);
      setReadIds((current) => new Set(current).add(announcement.id));
    } catch {
      // Read tracking should not block viewing the announcement body.
    }
  }

  return (
    <div className={detailed ? "guardian-announcement-list guardian-announcement-list--detailed" : "guardian-announcement-list"}>
      {announcements.map((announcement) => {
        const expanded = expandedId === announcement.id;
        const unread = !readIds.has(announcement.id) && !announcement.readAt;
        return (
          <article className="guardian-announcement-row" key={announcement.id}>
            <button className="guardian-announcement-trigger" onClick={() => void handleToggle(announcement)} type="button">
              <div>
                <strong>{announcement.title}</strong>
                <span>
                  {audienceLabel(announcement.audience)} · {formatDateTime(announcement.publishedAt)}
                  {unread ? " · Okunmadı" : " · Okundu"}
                </span>
              </div>
              {detailed || expanded ? <p>{announcement.body}</p> : null}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function audienceLabel(value: string) {
  const labels: Record<string, string> = {
    guardians: "Veliler",
    teachers: "Öğretmenler",
    all: "Tüm kurum"
  };
  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
