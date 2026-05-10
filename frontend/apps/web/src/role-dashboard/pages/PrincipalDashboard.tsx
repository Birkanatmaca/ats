import { AlertTriangle, Bell, CalendarClock, ClipboardCheck, LayoutDashboard, UserRoundCheck, UsersRound } from "lucide-react";
import { AnnouncementsPanel } from "../components/AnnouncementsPanel";
import { CompactList } from "../components/CompactList";
import { LessonList } from "../components/LessonList";
import { RoleCard } from "../components/RoleCard";
import { RoleMetric } from "../components/RoleMetric";
import type { DashboardData } from "../types";
import "./PrincipalDashboard.css";

export function PrincipalDashboard({ data }: { data: DashboardData }) {
  const summary = data.summary;
  const todayLessons = data.schedule?.lessons ?? [];

  return (
    <section className="role-grid principal-dashboard">
      <div className="role-main-column">
        <div className="role-metric-grid">
          <RoleMetric icon={<UsersRound size={18} />} label="Aktif öğrenci" value={summary?.activeStudents ?? 0} />
          <RoleMetric icon={<UserRoundCheck size={18} />} label="Öğretmen" value={summary?.activeTeachers ?? 0} />
          <RoleMetric icon={<ClipboardCheck size={18} />} label="Yoklama" value={`%${summary?.attendanceCompletionPct ?? 0}`} />
          <RoleMetric icon={<AlertTriangle size={18} />} label="Sinyal" value={summary?.openObservationSignals ?? 0} />
        </div>

        <RoleCard title="Günlük operasyon" icon={<LayoutDashboard size={18} />}>
          <div className="class-status-list">
            {(summary?.classAttendance ?? []).map((item) => (
              <div className="class-status-row" key={item.className}>
                <strong>{item.className}</strong>
                <span>
                  {item.completed}/{item.total} yoklama
                </span>
                <small>{item.absent} devamsız</small>
                <em>{item.attentionNeed}</em>
              </div>
            ))}
          </div>
        </RoleCard>

        <RoleCard title="Bugünkü ders akışı" icon={<CalendarClock size={18} />}>
          <LessonList lessons={todayLessons.slice(0, 6)} emptyText="Yayınlanmış ders programı bulunamadı." />
        </RoleCard>
      </div>

      <aside className="role-side-column">
        <RoleCard title="Aksiyon bekleyenler" icon={<Bell size={18} />}>
          <CompactList
            items={(summary?.operations ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              meta: `${item.status} · ${item.priority}`
            }))}
            emptyText="Aksiyon bekleyen operasyon yok."
          />
        </RoleCard>
        <AnnouncementsPanel announcements={data.announcements} />
      </aside>
    </section>
  );
}
