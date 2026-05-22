import type { GuidanceSupportPlan } from "../../../lib/api";
import { supportStatusLabel } from "../utils";

export function GuidancePlanList({
  plans,
  limit,
  onStatusChange
}: {
  plans: GuidanceSupportPlan[];
  limit?: number;
  onStatusChange?: (plan: GuidanceSupportPlan, status: GuidanceSupportPlan["status"]) => void;
}) {
  const visiblePlans = typeof limit === "number" ? plans.slice(0, limit) : plans;

  if (visiblePlans.length === 0) {
    return <p className="empty-text guidance-empty-pad">Takip planı yok. Yeni plan oluşturun.</p>;
  }

  return (
    <div className="guidance-plan-list">
      {visiblePlans.map((plan) => (
        <article className="guidance-plan-row" key={plan.id}>
          <div>
            <strong>{plan.title}</strong>
            <span>
              {plan.studentName} · {plan.className} · {plan.ownerName}
            </span>
            {plan.description ? <p className="guidance-plan-desc">{plan.description}</p> : null}
          </div>
          <div className="guidance-plan-meta">
            {onStatusChange ? (
              <select
                className="guidance-plan-status-select"
                value={plan.status}
                onChange={(e) => onStatusChange(plan, e.target.value as GuidanceSupportPlan["status"])}
                aria-label="Plan durumu"
              >
                <option value="open">Açık</option>
                <option value="monitoring">İzleniyor</option>
                <option value="closed">Kapalı</option>
              </select>
            ) : (
              <span className={`status-badge ${plan.status === "open" ? "warning" : plan.status === "closed" ? "normal" : "active"}`}>
                {supportStatusLabel(plan.status)}
              </span>
            )}
            <small>{formatDate(plan.dueDate)}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "Tarih yok";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}
