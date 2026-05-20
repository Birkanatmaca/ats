import { Bell, CalendarDays, CheckCircle2, ClipboardCheck, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { GuardianNotification } from "../../../lib/api";
import { GuardianAnnouncementList } from "../components/GuardianAnnouncementList";
import { GuardianAttendanceList } from "../components/GuardianAttendanceList";
import { GuardianChildCard } from "../components/GuardianChildCard";
import { GuardianKpiCard } from "../components/GuardianKpiCard";
import { GuardianLessonList } from "../components/GuardianLessonList";
import { GuardianNoticeList } from "../components/GuardianNoticeList";
import type { GuardianChild, GuardianData } from "../types";

function mapNotificationsToNotices(notifications: GuardianNotification[]) {
  return notifications.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    tone: item.readAt ? ("success" as const) : item.kind === "attendance" ? ("warning" as const) : ("info" as const)
  }));
}

export function GuardianOverviewPage({
  child,
  data,
  lessons,
  onMarkNotificationRead
}: {
  child: GuardianChild;
  data: GuardianData;
  lessons: GuardianData["scheduleLessons"];
  onMarkNotificationRead?: (notificationId: string) => void;
}) {
  const absentCount = data.attendanceRecords.filter((record) => record.status === "absent").length;
  const lateCount = data.attendanceRecords.filter((record) => record.status === "late").length;
  const unreadNotifications = data.notifications.filter((item) => !item.readAt).length;

  return (
    <section className="guardian-page-stack">
      <div className="guardian-kpi-grid" aria-label="Veli günlük özet">
        <GuardianKpiCard icon={<UserRound size={17} />} label="Öğrenci" value={child.fullName} detail={`${child.className} · No ${child.schoolNumber}`} tone="sky" />
        <GuardianKpiCard icon={<CalendarDays size={17} />} label="Ders programı" value={lessons.length} detail="Yayınlanmış ders bloğu" tone="emerald" />
        <GuardianKpiCard icon={<ClipboardCheck size={17} />} label="Devamsızlık" value={absentCount} detail={`${lateCount} geç katılım kaydı`} tone="amber" />
        <GuardianKpiCard icon={<Bell size={17} />} label="Duyuru" value={data.announcements.length} detail={`${unreadNotifications} okunmamış bildirim`} tone="violet" />
      </div>

      <div className="guardian-overview-grid">
        <section className="principal-surface-card guardian-focus-card">
          <div className="guardian-card-head">
            <div>
              <span className="section-kicker">Çocuğum</span>
              <h2>Öğrenci özeti</h2>
            </div>
            <span className="status-badge active">
              <CheckCircle2 size={14} />
              Güncel
            </span>
          </div>
          <GuardianChildCard child={child} />
          <GuardianNoticeList
            notices={mapNotificationsToNotices(data.notifications)}
            onNoticeClick={onMarkNotificationRead}
          />
        </section>

        <section className="principal-surface-card">
          <div className="guardian-card-head">
            <div>
              <span className="section-kicker">Program</span>
              <h2>Yaklaşan dersler</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/schedule">
              Tümü
            </NavLink>
          </div>
          <GuardianLessonList lessons={lessons} limit={4} />
        </section>
      </div>

      <div className="guardian-overview-grid guardian-overview-grid--secondary">
        <section className="principal-surface-card">
          <div className="guardian-card-head">
            <div>
              <span className="section-kicker">Devamsızlık</span>
              <h2>Son yoklama kayıtları</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/attendance">
              Detay
            </NavLink>
          </div>
          <GuardianAttendanceList records={data.attendanceRecords} limit={4} />
        </section>

        <section className="principal-surface-card">
          <div className="guardian-card-head">
            <div>
              <span className="section-kicker">İletişim</span>
              <h2>Duyurular</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/announcements">
              Tümü
            </NavLink>
          </div>
          <GuardianAnnouncementList announcements={data.announcements.slice(0, 4)} />
        </section>
      </div>
    </section>
  );
}
