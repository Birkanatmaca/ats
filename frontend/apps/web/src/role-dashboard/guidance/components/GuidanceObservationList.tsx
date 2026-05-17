import { categoryLabel } from "../../utils";
import type { Observation } from "../../../lib/api";
import { formatGuidanceDate } from "../utils";

export function GuidanceObservationList({ observations, limit }: { observations: Observation[]; limit?: number }) {
  const visibleObservations = typeof limit === "number" ? observations.slice(0, limit) : observations;

  if (visibleObservations.length === 0) {
    return <p className="empty-text guidance-empty-pad">Henüz gözlem kaydı yok.</p>;
  }

  return (
    <div className="guidance-observation-list">
      {visibleObservations.map((observation) => (
        <article className="guidance-observation-row" key={observation.id}>
          <div className="guidance-observation-main">
            <div>
              <strong>{observation.studentName}</strong>
              <span>
                {observation.className} · {categoryLabel(observation.category)} · {observation.authorName}
              </span>
            </div>
            <span className="status-badge warning">{observation.sensitivity}</span>
          </div>
          <p>{observation.note}</p>
          <small>{formatGuidanceDate(observation.createdAt)}</small>
        </article>
      ))}
    </div>
  );
}
