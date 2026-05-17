import type { Announcement } from "../../../lib/api";

export function GuidanceAnnouncementList({ announcements, detailed = false }: { announcements: Announcement[]; detailed?: boolean }) {
  if (announcements.length === 0) {
    return <p className="empty-text guidance-empty-pad">Yayınlanmış duyuru yok.</p>;
  }

  return (
    <div className={detailed ? "guidance-announcement-list guidance-announcement-list--detailed" : "guidance-announcement-list"}>
      {announcements.map((announcement) => (
        <article className="guidance-announcement-row" key={announcement.id}>
          <div>
            <strong>{announcement.title}</strong>
            <span>{announcement.audience} · {formatDateTime(announcement.publishedAt)}</span>
          </div>
          {detailed && <p>{announcement.body}</p>}
        </article>
      ))}
    </div>
  );
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
