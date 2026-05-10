import { Bell } from "lucide-react";
import type { Announcement } from "../../lib/api";
import { CompactList } from "./CompactList";
import { RoleCard } from "./RoleCard";

export function AnnouncementsPanel({ announcements }: { announcements: Announcement[] }) {
  return (
    <RoleCard title="Duyurular" icon={<Bell size={18} />}>
      <CompactList
        items={announcements.map((announcement) => ({
          id: announcement.id,
          title: announcement.title,
          meta: `${announcement.audience} · ${new Date(announcement.publishedAt).toLocaleDateString("tr-TR")}`
        }))}
        emptyText="Yayınlanmış duyuru yok."
      />
    </RoleCard>
  );
}
