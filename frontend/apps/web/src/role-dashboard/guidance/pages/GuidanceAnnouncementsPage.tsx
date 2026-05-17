import { Bell } from "lucide-react";
import { GuidanceAnnouncementList } from "../components/GuidanceAnnouncementList";
import type { GuidanceData } from "../types";

export function GuidanceAnnouncementsPage({ data }: { data: GuidanceData }) {
  return (
    <section className="guidance-page-stack">
      <div className="guidance-page-title">
        <span className="section-kicker">Okul iletişimi</span>
        <h1>Duyurular</h1>
      </div>

      <section className="principal-surface-card">
        <div className="guidance-card-head">
          <div>
            <h2>Kurum duyuruları</h2>
            <p>Rehberlik birimine ve kuruma yayınlanan bilgilendirmeler.</p>
          </div>
          <span className="status-badge active">
            <Bell size={14} />
            {data.announcements.length} duyuru
          </span>
        </div>
        <GuidanceAnnouncementList announcements={data.announcements} detailed />
      </section>
    </section>
  );
}
