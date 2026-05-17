import { HeartHandshake } from "lucide-react";
import { guidancePlans } from "../data";
import { GuidancePlanList } from "../components/GuidancePlanList";

export function GuidancePlansPage() {
  const activeCount = guidancePlans.filter((plan) => plan.status !== "closed").length;

  return (
    <section className="guidance-page-stack">
      <div className="guidance-page-title">
        <span className="section-kicker">Takip planları</span>
        <h1>Rehberlik takip</h1>
      </div>

      <section className="principal-surface-card">
        <div className="guidance-card-head">
          <div>
            <h2>Plan listesi</h2>
            <p>Görüşme, veli bilgilendirme ve izlem aksiyonları.</p>
          </div>
          <span className="status-badge active">
            <HeartHandshake size={14} />
            {activeCount} aktif
          </span>
        </div>
        <GuidancePlanList plans={guidancePlans} />
      </section>
    </section>
  );
}
