import { Bell, CalendarDays, CheckCircle2, ClipboardCheck, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { guardianAttendanceRecords, guardianNotices } from "../data";
import { GuardianAnnouncementList } from "../components/GuardianAnnouncementList";
import { GuardianAttendanceList } from "../components/GuardianAttendanceList";
import { GuardianChildCard } from "../components/GuardianChildCard";
import { GuardianKpiCard } from "../components/GuardianKpiCard";
import { GuardianLessonList } from "../components/GuardianLessonList";
import { GuardianNoticeList } from "../components/GuardianNoticeList";
import type { GuardianChild, GuardianData } from "../types";

export function GuardianOverviewPage({ child, data, lessons }: { child: GuardianChild; data: GuardianData; lessons: GuardianData["scheduleLessons"] }) {
  const absentCount = guardianAttendanceRecords.filter((record) => record.status === "absent").length;
  const lateCount = guardianAttendanceRecords.filter((record) => record.status === "late").length;

  return (
    <section className="guardian-page-stack">
      <div className="guardian-kpi-grid" aria-label="Veli günlük özet">
        <GuardianKpiCard icon={<UserRound size={17} />} label="Öğrenci" value={child.fullName} detail={`${child.className} · No ${child.schoolNumber}`} tone="sky" />
        <GuardianKpiCard icon={<CalendarDays size={17} />} label="Ders programı" value={lessons.length} detail="Yayınlanmış ders bloğu" tone="emerald" />
        <GuardianKpiCard icon={<ClipboardCheck size={17} />} label="Devamsızlık" value={absentCount} detail={`${lateCount} geç katılım kaydı`} tone="amber" />
        <GuardianKpiCard icon={<Bell size={17} />} label="Duyuru" value={data.announcements.length} detail="Kurum bilgilendirmesi" tone="violet" />
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
          <GuardianNoticeList notices={guardianNotices} />
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
          <GuardianAttendanceList records={guardianAttendanceRecords} limit={4} />
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
