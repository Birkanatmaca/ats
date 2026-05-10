import { AlertTriangle, HeartHandshake, NotebookTabs, UsersRound } from "lucide-react";
import type { Announcement, Observation, PrincipalSummary } from "../../lib/api";
import { AnnouncementsPanel } from "../components/AnnouncementsPanel";
import { CompactList } from "../components/CompactList";
import { RoleCard } from "../components/RoleCard";
import { RoleMetric } from "../components/RoleMetric";
import { categoryLabel } from "../utils";
import "./GuidanceDashboard.css";

export function GuidanceDashboard({
  observations,
  summary,
  announcements
}: {
  observations: Observation[];
  summary?: PrincipalSummary;
  announcements: Announcement[];
}) {
  const riskSignals = observations.filter((item) => ["attention", "absence_risk", "academic_drop", "behavior"].includes(item.category));

  return (
    <section className="role-grid guidance-dashboard">
      <div className="role-main-column">
        <div className="role-metric-grid">
          <RoleMetric icon={<NotebookTabs size={18} />} label="Gözlem" value={observations.length} />
          <RoleMetric icon={<AlertTriangle size={18} />} label="Risk sinyali" value={riskSignals.length} />
          <RoleMetric icon={<UsersRound size={18} />} label="Öğrenci" value={summary?.activeStudents ?? 0} />
          <RoleMetric icon={<HeartHandshake size={18} />} label="Takip" value="MVP" />
        </div>

        <RoleCard title="Rehberlik gözlem kuyruğu" icon={<HeartHandshake size={18} />}>
          <div className="observation-list">
            {observations.map((item) => (
              <article className="observation-row" key={item.id}>
                <div>
                  <strong>{item.studentName}</strong>
                  <span>
                    {item.className} · {categoryLabel(item.category)} · {item.authorName}
                  </span>
                </div>
                <p>{item.note}</p>
                <small>{new Date(item.createdAt).toLocaleString("tr-TR")}</small>
              </article>
            ))}
            {observations.length === 0 && <p className="role-empty">Henüz gözlem kaydı yok.</p>}
          </div>
        </RoleCard>
      </div>

      <aside className="role-side-column">
        <RoleCard title="Erken uyarı odağı" icon={<AlertTriangle size={18} />}>
          <CompactList
            items={riskSignals.map((item) => ({
              id: item.id,
              title: item.studentName,
              meta: `${categoryLabel(item.category)} · insan değerlendirmesi gerekli`
            }))}
            emptyText="Aktif erken uyarı sinyali yok."
          />
        </RoleCard>
        <AnnouncementsPanel announcements={announcements} />
      </aside>
    </section>
  );
}
