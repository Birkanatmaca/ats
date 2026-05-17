import { AlertTriangle, Bell, HeartHandshake, NotebookTabs, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { guidancePlans } from "../data";
import { GuidanceAnnouncementList } from "../components/GuidanceAnnouncementList";
import { GuidanceKpiCard } from "../components/GuidanceKpiCard";
import { GuidanceObservationList } from "../components/GuidanceObservationList";
import { GuidancePlanList } from "../components/GuidancePlanList";
import { GuidanceRiskList } from "../components/GuidanceRiskList";
import { GuidanceStudentSupportList } from "../components/GuidanceStudentSupportList";
import type { GuidanceData, GuidanceRiskSignal, GuidanceStudentSupport } from "../types";

export function GuidanceOverviewPage({
  data,
  risks,
  students
}: {
  data: GuidanceData;
  risks: GuidanceRiskSignal[];
  students: GuidanceStudentSupport[];
}) {
  const openPlans = guidancePlans.filter((plan) => plan.status !== "closed").length;

  return (
    <section className="guidance-page-stack">
      <div className="guidance-kpi-grid" aria-label="Rehberlik özet metrikleri">
        <GuidanceKpiCard icon={<NotebookTabs size={17} />} label="Gözlem" value={data.observations.length} detail="Öğretmenlerden gelen kayıt" tone="sky" />
        <GuidanceKpiCard icon={<AlertTriangle size={17} />} label="Risk sinyali" value={risks.length} detail="İnsan değerlendirmesi bekler" tone="amber" />
        <GuidanceKpiCard icon={<UsersRound size={17} />} label="Öğrenci" value={students.length || data.summary?.activeStudents || 0} detail="Destek kapsamı" tone="emerald" />
        <GuidanceKpiCard icon={<HeartHandshake size={17} />} label="Takip planı" value={openPlans} detail="Açık / izlenen plan" tone="violet" />
      </div>

      <div className="guidance-overview-grid">
        <section className="principal-surface-card">
          <div className="guidance-card-head">
            <div>
              <span className="section-kicker">Gözlem kuyruğu</span>
              <h2>Son kayıtlar</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/observations">
              Tümü
            </NavLink>
          </div>
          <GuidanceObservationList observations={data.observations} limit={4} />
        </section>

        <section className="principal-surface-card">
          <div className="guidance-card-head">
            <div>
              <span className="section-kicker">Erken uyarı</span>
              <h2>Risk sinyalleri</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/risks">
              İncele
            </NavLink>
          </div>
          <GuidanceRiskList signals={risks} limit={4} />
        </section>
      </div>

      <div className="guidance-overview-grid guidance-overview-grid--secondary">
        <section className="principal-surface-card">
          <div className="guidance-card-head">
            <div>
              <span className="section-kicker">Öğrenci destek</span>
              <h2>Takip özeti</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/students">
              Detay
            </NavLink>
          </div>
          <GuidanceStudentSupportList students={students} limit={4} />
        </section>

        <section className="principal-surface-card">
          <div className="guidance-card-head">
            <div>
              <span className="section-kicker">Planlar</span>
              <h2>Yakın takip</h2>
            </div>
            <NavLink className="ghost-action small-action" to="/dashboard/plans">
              Tümü
            </NavLink>
          </div>
          <GuidancePlanList plans={guidancePlans} limit={4} />
        </section>
      </div>

      <section className="principal-surface-card">
        <div className="guidance-card-head">
          <div>
            <span className="section-kicker">İletişim</span>
            <h2>Duyurular</h2>
          </div>
          <span className="status-badge active">
            <Bell size={14} />
            {data.announcements.length}
          </span>
        </div>
        <GuidanceAnnouncementList announcements={data.announcements.slice(0, 3)} />
      </section>
    </section>
  );
}
