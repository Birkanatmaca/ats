import { Bell } from "lucide-react";
import { GuardianAnnouncementList } from "../components/GuardianAnnouncementList";
import type { GuardianData } from "../types";

export function GuardianAnnouncementsPage({ data }: { data: GuardianData }) {
  return (
    <section className="guardian-page-stack">
      <div className="guardian-page-title">
        <span className="section-kicker">Okul iletişimi</span>
        <h1>Duyurular</h1>
      </div>

      <section className="principal-surface-card">
        <div className="guardian-card-head">
          <div>
            <h2>Kurum duyuruları</h2>
            <p>Okul yönetiminin veliye ve kuruma yayınladığı bilgilendirmeler.</p>
          </div>
          <span className="status-badge active">
            <Bell size={14} />
            {data.announcements.length} duyuru
          </span>
        </div>
        <GuardianAnnouncementList announcements={data.announcements} detailed />
      </section>
    </section>
  );
}
