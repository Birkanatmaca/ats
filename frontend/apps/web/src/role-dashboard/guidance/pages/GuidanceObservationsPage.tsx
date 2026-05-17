import { useMemo, useState } from "react";
import { categoryLabel } from "../../utils";
import type { Observation } from "../../../lib/api";
import { GuidanceObservationList } from "../components/GuidanceObservationList";

const filters = [
  { id: "all", label: "Tümü" },
  { id: "attention", label: "Dikkat" },
  { id: "absence_risk", label: "Devamsızlık" },
  { id: "academic_drop", label: "Akademik" },
  { id: "behavior", label: "Davranış" }
] as const;

export function GuidanceObservationsPage({ observations }: { observations: Observation[] }) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const filteredObservations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return observations.filter((observation) => {
      const categoryMatch = activeFilter === "all" || observation.category === activeFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${observation.studentName} ${observation.className} ${observation.authorName} ${categoryLabel(observation.category)}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return categoryMatch && queryMatch;
    });
  }, [activeFilter, observations, query]);

  return (
    <section className="guidance-page-stack">
      <div className="guidance-page-title">
        <span className="section-kicker">Gözlem kuyruğu</span>
        <h1>Öğrenci gözlemleri</h1>
      </div>

      <section className="principal-surface-card">
        <div className="guidance-toolbar">
          <div className="guidance-filter-row">
            {filters.map((filter) => (
              <button
                className={activeFilter === filter.id ? "guidance-filter-chip is-active" : "guidance-filter-chip"}
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Öğrenci, sınıf veya öğretmen ara..." type="search" />
        </div>
        <GuidanceObservationList observations={filteredObservations} />
      </section>
    </section>
  );
}
