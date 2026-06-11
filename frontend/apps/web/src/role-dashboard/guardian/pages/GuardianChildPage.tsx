import { Bell, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, Hash, School, UserRound, XCircle } from "lucide-react";
import { useMemo } from "react";
import { GuidanceKpiCard } from "../../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../../guidance/components/GuidanceMetricGrid";
import { GuidanceSectionPanel } from "../../guidance/components/GuidanceSectionPanel";
import "../../guidance/GuidanceOverview.css";
import "../../guidance/GuidanceSurface.css";
import { GuardianAttendanceList } from "../components/GuardianAttendanceList";
import { GuardianGuidanceUpdatesList } from "../components/GuardianGuidanceUpdatesList";
import { GuardianLessonList } from "../components/GuardianLessonList";
import { GuardianNoticeList } from "../components/GuardianNoticeList";
import { GuardianBillingCard } from "../components/GuardianBillingCard";
import { GuardianStudentHeroCard } from "../components/GuardianStudentHeroCard";
import type { GuardianChild, GuardianData } from "../types";
import "../GuardianChildPage.css";

function mapNotificationsToNotices(notifications: GuardianData["notifications"]) {
  return notifications.slice(0, 4).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    tone: item.readAt ? ("success" as const) : item.kind === "attendance" ? ("warning" as const) : ("info" as const)
  }));
}

export function GuardianChildPage({
  child,
  students,
  selectedChildId,
  onSelectChild,
  data,
  lessons
}: {
  child: GuardianChild;
  students: GuardianChild[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  data: GuardianData;
  lessons: GuardianData["scheduleLessons"];
}) {
  const stats = useMemo(() => {
    const presentCount = data.attendanceRecords.filter((record) => record.status === "present").length;
    const absentCount = data.attendanceRecords.filter((record) => record.status === "absent").length;
    const lateCount = data.attendanceRecords.filter((record) => record.status === "late").length;
    const excusedCount = data.attendanceRecords.filter((record) => record.status === "excused").length;
    const totalRecords = data.attendanceRecords.length;
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    const unreadNotifications = data.notifications.filter((item) => !item.readAt).length;
    const uniqueSubjects = new Set(lessons.map((lesson) => lesson.subjectName)).size;

    return {
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      totalRecords,
      attendanceRate,
      unreadNotifications,
      uniqueSubjects
    };
  }, [data.attendanceRecords, data.notifications, lessons]);

  return (
    <section className="guidance-page-stack guidance-overview-page guidance-surface-page guardian-child-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard
          icon={<CheckCircle2 size={20} />}
          label="Katılım oranı"
          value={`%${stats.attendanceRate}`}
          detail={`${stats.presentCount} geldi kaydı`}
          tone="emerald"
        />
        <GuidanceKpiCard
          icon={<XCircle size={20} />}
          label="Devamsızlık"
          value={stats.absentCount}
          detail={`${stats.lateCount} geç · ${stats.excusedCount} izinli`}
          tone="amber"
        />
        <GuidanceKpiCard
          icon={<CalendarDays size={20} />}
          label="Haftalık ders"
          value={lessons.length}
          detail={`${stats.uniqueSubjects} farklı ders`}
          tone="sky"
        />
        <GuidanceKpiCard
          icon={<Bell size={20} />}
          label="Bildirim"
          value={stats.unreadNotifications}
          detail={`${data.notifications.length} toplam kayıt`}
          tone="violet"
        />
      </GuidanceMetricGrid>

      <GuardianStudentHeroCard
        child={child}
        students={students}
        selectedChildId={selectedChildId}
        onSelect={onSelectChild}
      />

      <div className="guardian-child-detail-grid">
        <GuidanceSectionPanel title="Yoklama dağılımı">
          <div className="guardian-stat-breakdown">
            <div className="guardian-stat-breakdown-bar" aria-hidden>
              <span className="is-present" style={{ width: stats.totalRecords ? `${(stats.presentCount / stats.totalRecords) * 100}%` : "0%" }} />
              <span className="is-late" style={{ width: stats.totalRecords ? `${(stats.lateCount / stats.totalRecords) * 100}%` : "0%" }} />
              <span className="is-absent" style={{ width: stats.totalRecords ? `${(stats.absentCount / stats.totalRecords) * 100}%` : "0%" }} />
              <span className="is-excused" style={{ width: stats.totalRecords ? `${(stats.excusedCount / stats.totalRecords) * 100}%` : "0%" }} />
            </div>
            <div className="guardian-stat-breakdown-grid">
              <div className="guardian-stat-item">
                <CheckCircle2 size={16} />
                <span>Geldi</span>
                <strong>{stats.presentCount}</strong>
              </div>
              <div className="guardian-stat-item">
                <Clock3 size={16} />
                <span>Geç</span>
                <strong>{stats.lateCount}</strong>
              </div>
              <div className="guardian-stat-item">
                <XCircle size={16} />
                <span>Gelmedi</span>
                <strong>{stats.absentCount}</strong>
              </div>
              <div className="guardian-stat-item">
                <ClipboardCheck size={16} />
                <span>İzinli</span>
                <strong>{stats.excusedCount}</strong>
              </div>
            </div>
          </div>
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Kayıt bilgileri">
          <div className="guardian-info-grid">
            <div className="guardian-info-item">
              <UserRound size={16} />
              <span>Ad soyad</span>
              <strong>{child.fullName}</strong>
            </div>
            <div className="guardian-info-item">
              <School size={16} />
              <span>Sınıf</span>
              <strong>{child.className}</strong>
            </div>
            <div className="guardian-info-item">
              <Hash size={16} />
              <span>Okul numarası</span>
              <strong>{child.schoolNumber}</strong>
            </div>
            <div className="guardian-info-item">
              <School size={16} />
              <span>Kurum</span>
              <strong>{child.tenantName}</strong>
            </div>
          </div>
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Ders programı">
          <GuardianLessonList lessons={lessons} limit={4} />
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Son bildirimler">
          {data.notifications.length === 0 ? (
            <p className="guidance-empty-pad">Henüz bildirim yok.</p>
          ) : (
            <GuardianNoticeList notices={mapNotificationsToNotices(data.notifications)} />
          )}
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Rehberlik paylaşımları">
          <GuardianGuidanceUpdatesList items={data.guidanceUpdates} />
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Tahsilat">
          <GuardianBillingCard studentId={child.id} />
        </GuidanceSectionPanel>
      </div>

      <GuidanceSectionPanel title="Yoklama geçmişi">
        <GuardianAttendanceList records={data.attendanceRecords} limit={6} />
      </GuidanceSectionPanel>
    </section>
  );
}
