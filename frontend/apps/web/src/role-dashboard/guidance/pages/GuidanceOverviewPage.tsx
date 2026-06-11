import { AlertTriangle, Bell, FileText, FolderOpen, HeartHandshake, NotebookTabs, UsersRound } from "lucide-react";
import type { GuidanceEarlyWarningSignal, GuidanceNote, GuidanceSupportPlan } from "../../../lib/api";
import { GuidanceEarlyWarningList } from "../components/GuidanceEarlyWarningList";
import { GuidanceAnnouncementList } from "../components/GuidanceAnnouncementList";
import { GuidanceKpiCard } from "../components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../components/GuidanceMetricGrid";
import { GuidanceNoteList } from "../components/GuidanceNoteList";
import { GuidanceObservationList } from "../components/GuidanceObservationList";
import { GuidancePlanList } from "../components/GuidancePlanList";
import { GuidanceRiskList } from "../components/GuidanceRiskList";
import { GuidanceSectionPanel } from "../components/GuidanceSectionPanel";
import { GuidanceStudentSupportList } from "../components/GuidanceStudentSupportList";
import type { GuidanceData, GuidanceRiskSignal, GuidanceStudentSupport } from "../types";
import "../GuidanceOverview.css";
import "../GuidanceSurface.css";

export function GuidanceOverviewPage({
  data,
  earlyWarnings,
  risks,
  students,
  notes,
  plans
}: {
  data: GuidanceData;
  earlyWarnings: GuidanceEarlyWarningSignal[];
  risks: GuidanceRiskSignal[];
  students: GuidanceStudentSupport[];
  notes: GuidanceNote[];
  plans: GuidanceSupportPlan[];
}) {
  const openPlans = plans.filter((plan) => plan.status !== "closed").length;
  const reviewStudents = students.filter((s) => s.status === "review").length;
  const highRisks = risks.filter((r) => r.level === "high").length;
  const highWarnings = earlyWarnings.filter((item) => item.severity === "high").length;

  return (
    <section className="guidance-page-stack guidance-overview-page guidance-surface-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<NotebookTabs size={20} />} label="Öğretmen gözlemi" value={data.observations.length} detail="Aktarılan kayıt" tone="sky" />
        <GuidanceKpiCard icon={<FileText size={20} />} label="Rehberlik notu" value={notes.length} detail="Gizli kayıt" tone="rose" />
        <GuidanceKpiCard icon={<AlertTriangle size={20} />} label="Risk sinyali" value={risks.length} detail={`${highRisks} yüksek öncelik`} tone="amber" />
        <GuidanceKpiCard icon={<FolderOpen size={20} />} label="Erken uyarı" value={earlyWarnings.length} detail={`${highWarnings} yüksek öncelik`} tone="violet" />
        <GuidanceKpiCard icon={<UsersRound size={20} />} label="Destek kapsamı" value={students.length || data.summary?.activeStudents || 0} detail={`${reviewStudents} incelemede`} tone="emerald" />
        <GuidanceKpiCard icon={<HeartHandshake size={20} />} label="Açık plan" value={openPlans} detail={`${plans.length} toplam plan`} tone="violet" />
      </GuidanceMetricGrid>

      <div className="guidance-bento guidance-bento--primary">
        <GuidanceSectionPanel title="Son gözlemler" actionLabel="Tüm gözlemler" actionTo="/dashboard/observations">
          <GuidanceObservationList observations={data.observations} limit={4} />
        </GuidanceSectionPanel>
        <GuidanceSectionPanel title="Risk sinyalleri" actionLabel="Risk listesi" actionTo="/dashboard/risks">
          <GuidanceRiskList signals={risks} limit={4} />
        </GuidanceSectionPanel>
        <GuidanceSectionPanel title="Erken uyarı sinyalleri" actionLabel="Vaka dosyaları" actionTo="/dashboard/cases">
          <GuidanceEarlyWarningList signals={earlyWarnings} limit={4} />
        </GuidanceSectionPanel>
      </div>

      <div className="guidance-bento guidance-bento--secondary">
        <GuidanceSectionPanel title="Öğrenci özeti" actionLabel="Öğrenciler" actionTo="/dashboard/students">
          <GuidanceStudentSupportList students={students} limit={4} />
        </GuidanceSectionPanel>
        <GuidanceSectionPanel title="Takip planları" actionLabel="Takip" actionTo="/dashboard/plans">
          <GuidancePlanList plans={plans} limit={4} />
        </GuidanceSectionPanel>
      </div>

      <GuidanceSectionPanel title="Son rehberlik notları" actionLabel="Notlar" actionTo="/dashboard/notes">
        <GuidanceNoteList notes={notes.slice(0, 4)} />
      </GuidanceSectionPanel>

      <GuidanceSectionPanel
        title="Duyurular"
        aside={
          <span className="guidance-panel-badge">
            <Bell size={14} />
            {data.announcements.length}
          </span>
        }
      >
        <GuidanceAnnouncementList announcements={data.announcements.slice(0, 3)} />
      </GuidanceSectionPanel>
    </section>
  );
}
