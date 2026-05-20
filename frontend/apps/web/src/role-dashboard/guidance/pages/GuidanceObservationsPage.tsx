import { useMemo, useState } from "react";
import { observationCategories } from "../../data";
import { categoryLabel } from "../../utils";
import type { Observation } from "../../../lib/api";
import { GuidanceObservationList } from "../components/GuidanceObservationList";

export function GuidanceObservationsPage({ observations }: { observations: Observation[] }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [query, setQuery] = useState("");

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    for (const observation of observations) {
      if (observation.className.trim()) {
        set.add(observation.className);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [observations]);

  const filteredObservations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return observations.filter((observation) => {
      const categoryMatch = activeFilter === "all" || observation.category === activeFilter;
      const classMatch = !classFilter || observation.className === classFilter;
      const dateMatch = !dateFilter || observation.createdAt.startsWith(dateFilter);
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${observation.studentName} ${observation.className} ${observation.authorName} ${categoryLabel(observation.category)}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return categoryMatch && classMatch && dateMatch && queryMatch;
    });
  }, [activeFilter, classFilter, dateFilter, observations, query]);

  return (
    <section className="guidance-page-stack">
      <div className="guidance-page-title">
        <span className="section-kicker">Gözlem kuyruğu</span>
        <h1>Öğrenci gözlemleri</h1>
      </div>

      <section className="principal-surface-card">
        <div className="guidance-toolbar">
          <div className="guidance-filter-row">
            <button
              className={activeFilter === "all" ? "guidance-filter-chip is-active" : "guidance-filter-chip"}
              type="button"
              onClick={() => setActiveFilter("all")}
            >
              Tümü
            </button>
            {observationCategories.map((filter) => (
              <button
                className={activeFilter === filter.value ? "guidance-filter-chip is-active" : "guidance-filter-chip"}
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="guidance-toolbar-fields">
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Sınıf filtresi">
              <option value="">Tüm sınıflar</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <input value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" aria-label="Tarih filtresi" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Öğrenci, sınıf veya öğretmen ara..." type="search" />
          </div>
        </div>
        <GuidanceObservationList observations={filteredObservations} />
      </section>
    </section>
  );
}
