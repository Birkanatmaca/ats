import { BookOpen, CheckCircle2, ClipboardCheck } from "lucide-react";
import { useMemo } from "react";
import { AnnouncementsPanel } from "../components/AnnouncementsPanel";
import { LessonList } from "../components/LessonList";
import { RoleCard } from "../components/RoleCard";
import type { DashboardData } from "../types";
import "./GuardianDashboard.css";

export function GuardianDashboard({ data }: { data: DashboardData }) {
  const childLessons = useMemo(() => (data.schedule?.lessons ?? []).filter((lesson) => lesson.className === "5/A"), [data.schedule]);

  return (
    <section className="role-grid guardian-dashboard">
      <div className="role-main-column">
        <div className="guardian-child-card">
          <div>
            <span>Öğrenci</span>
            <h2>Efe Demir</h2>
            <p>5/A · Özel Atlas Koleji</p>
          </div>
          <CheckCircle2 size={34} />
        </div>

        <RoleCard title="Ders programı" icon={<BookOpen size={18} />}>
          <LessonList lessons={childLessons} emptyText="Öğrenci programı henüz yayınlanmadı." />
        </RoleCard>
      </div>

      <aside className="role-side-column">
        <RoleCard title="Devamsızlık özeti" icon={<ClipboardCheck size={18} />}>
          <div className="guardian-attendance">
            <strong>{data.summary?.absentToday ?? 0}</strong>
            <span>Bugün kurum genelinde devamsızlık sinyali</span>
            <p>Çocuğa özel devamsızlık servisi sonraki API fazında veli kapsamıyla ayrıştırılacak.</p>
          </div>
        </RoleCard>
        <AnnouncementsPanel announcements={data.announcements} />
      </aside>
    </section>
  );
}
