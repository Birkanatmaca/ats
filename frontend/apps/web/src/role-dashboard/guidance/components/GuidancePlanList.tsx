import type { GuidancePlan } from "../types";
import { supportStatusLabel } from "../utils";

export function GuidancePlanList({ plans, limit }: { plans: GuidancePlan[]; limit?: number }) {
  const visiblePlans = typeof limit === "number" ? plans.slice(0, limit) : plans;

  if (visiblePlans.length === 0) {
    return <p className="empty-text guidance-empty-pad">Takip planı yok.</p>;
  }

  return (
    <div className="guidance-plan-list">
      {visiblePlans.map((plan) => (
        <article className="guidance-plan-row" key={plan.id}>
          <div>
            <strong>{plan.title}</strong>
            <span>
              {plan.studentName} · {plan.className} · {plan.owner}
            </span>
          </div>
          <div className="guidance-plan-meta">
            <span className={`status-badge ${plan.status === "open" ? "warning" : plan.status === "closed" ? "normal" : "active"}`}>
              {supportStatusLabel(plan.status)}
            </span>
            <small>{formatDate(plan.dueDate)}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long"
  }).format(date);
}
