import type { Announcement } from "../../../lib/api";

export function GuardianAnnouncementList({ announcements, detailed = false }: { announcements: Announcement[]; detailed?: boolean }) {
  if (announcements.length === 0) {
    return <p className="empty-text guardian-empty-pad">Yayınlanmış duyuru yok.</p>;
  }

  return (
    <div className={detailed ? "guardian-announcement-list guardian-announcement-list--detailed" : "guardian-announcement-list"}>
      {announcements.map((announcement) => (
        <article className="guardian-announcement-row" key={announcement.id}>
          <div>
            <strong>{announcement.title}</strong>
            <span>{audienceLabel(announcement.audience)} · {formatDateTime(announcement.publishedAt)}</span>
          </div>
          {detailed && <p>{announcement.body}</p>}
        </article>
      ))}
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
