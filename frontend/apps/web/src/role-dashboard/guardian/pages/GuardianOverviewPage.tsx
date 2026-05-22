import { Bell, CalendarDays, ClipboardCheck, UserRound } from "lucide-react";
import type { GuardianNotification } from "../../../lib/api";
import { GuidanceKpiCard } from "../../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../../guidance/components/GuidanceMetricGrid";
import { GuidanceSectionPanel } from "../../guidance/components/GuidanceSectionPanel";
import "../../guidance/GuidanceOverview.css";
import "../../guidance/GuidanceSurface.css";
import { GuardianAnnouncementList } from "../components/GuardianAnnouncementList";
import { GuardianAttendanceDonut } from "../components/GuardianAttendanceDonut";
import { GuardianNoticeList } from "../components/GuardianNoticeList";
import { GuardianStudentProfileCard } from "../components/GuardianStudentProfileCard";
import { GuardianWeekScheduleCalendar } from "../components/GuardianWeekScheduleCalendar";
import type { GuardianChild, GuardianData } from "../types";
import "../GuardianOverview.css";

function mapNotificationsToNotices(notifications: GuardianNotification[]) {
  return notifications.slice(0, 3).map((item) => ({
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
  const presentCount = data.attendanceRecords.filter((record) => record.status === "present").length;
  const excusedCount = data.attendanceRecords.filter((record) => record.status === "excused").length;
  const unreadNotifications = data.notifications.filter((item) => !item.readAt).length;

  return (
    <section className="guidance-page-stack guidance-overview-page guidance-surface-page guardian-overview-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard
          icon={<UserRound size={20} />}
          label="Öğrenci"
          value={child.fullName.split(" ")[0] || child.fullName}
          detail={`${child.className} · No ${child.schoolNumber}`}
          tone="sky"
        />
        <GuidanceKpiCard
          icon={<CalendarDays size={20} />}
          label="Haftalık ders"
          value={lessons.length}
          detail="Yayınlanmış program"
          tone="emerald"
        />
        <GuidanceKpiCard
          icon={<ClipboardCheck size={20} />}
          label="Devamsızlık"
          value={absentCount}
          detail={`${lateCount} geç · ${presentCount} geldi`}
          tone="amber"
        />
        <GuidanceKpiCard
          icon={<Bell size={20} />}
          label="Bildirim"
          value={unreadNotifications}
          detail={`${data.announcements.length} duyuru`}
          tone="violet"
        />
      </GuidanceMetricGrid>

      <div className="guardian-bento guardian-bento--primary">
        <GuidanceSectionPanel title="Öğrenci özeti">
          <GuardianStudentProfileCard child={child} />
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Haftalık ders programı" actionLabel="Program" actionTo="/dashboard/schedule">
          <GuardianWeekScheduleCalendar lessons={lessons} />
        </GuidanceSectionPanel>
      </div>

      <div className="guardian-bento guardian-bento--communications">
        <div className="guardian-comms-attendance">
          <GuidanceSectionPanel title="Devamsızlık" actionLabel="Tüm kayıtlar" actionTo="/dashboard/attendance">
            <GuardianAttendanceDonut
              compact
              stats={{
                presentCount,
                absentCount,
                lateCount,
                excusedCount
              }}
            />
          </GuidanceSectionPanel>
        </div>

        <div className="guardian-comms-announcements">
          <GuidanceSectionPanel
            title="Duyurular"
            actionLabel="Tümü"
            actionTo="/dashboard/announcements"
            aside={
              <span className="guidance-panel-badge">
                <Bell size={14} />
                {data.announcements.length}
              </span>
            }
          >
            <GuardianAnnouncementList announcements={data.announcements.slice(0, 3)} />
          </GuidanceSectionPanel>
        </div>

        <div className="guardian-comms-notifications">
          <GuidanceSectionPanel
            title="Bildirimler"
            actionLabel="Tümü"
            actionTo="/dashboard/notifications"
            aside={
              unreadNotifications > 0 ? (
                <span className="guidance-panel-badge">
                  <Bell size={14} />
                  {unreadNotifications}
                </span>
              ) : null
            }
          >
            {data.notifications.length === 0 ? (
              <p className="guidance-empty-pad">Henüz bildirim yok.</p>
            ) : (
              <GuardianNoticeList
                notices={mapNotificationsToNotices(data.notifications)}
                onNoticeClick={onMarkNotificationRead}
              />
            )}
          </GuidanceSectionPanel>
        </div>
      </div>
    </section>
  );
}
