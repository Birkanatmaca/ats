import { CalendarDays, NotebookTabs, Search, ShieldAlert, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { observationCategories } from "../../data";
import { riskCategories } from "../data";
import { categoryLabel } from "../../utils";
import type { Observation } from "../../../lib/api";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { GuidanceKpiCard } from "../components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../components/GuidanceMetricGrid";
import { formatGuidanceDate } from "../utils";
import { sensitivityBadgeClass, sensitivityLabel } from "../utils/sensitivity";
import "../GuidanceDataPage.css";

const PAGE_SIZE = 12;

export function GuidanceObservationsPage({ observations }: { observations: Observation[] }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const studentIds = new Set(observations.map((o) => o.studentId));
    const riskCount = observations.filter((o) => riskCategories.includes(o.category)).length;
    const sensitiveCount = observations.filter((o) => o.sensitivity === "sensitive_student").length;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = observations.filter((o) => new Date(o.createdAt).getTime() >= weekAgo).length;
    return {
      total: observations.length,
      students: studentIds.size,
      riskCount,
      sensitiveCount,
      recentCount
    };
  }, [observations]);

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
        `${observation.studentName} ${observation.className} ${observation.authorName} ${categoryLabel(observation.category)} ${observation.note}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return categoryMatch && classMatch && dateMatch && queryMatch;
    });
  }, [activeFilter, classFilter, dateFilter, observations, query]);

  const filterKey = `${activeFilter}|${classFilter}|${dateFilter}|${query}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(
    filteredObservations,
    filterKey,
    PAGE_SIZE
  );

  return (
    <section className="guidance-page-stack guidance-data-page guidance-observations-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<NotebookTabs size={20} />} label="Toplam kayıt" value={stats.total} detail={`${filteredObservations.length} filtrelenmiş`} tone="sky" />
        <GuidanceKpiCard icon={<UsersRound size={20} />} label="Öğrenci" value={stats.students} detail="Benzersiz öğrenci" tone="emerald" />
        <GuidanceKpiCard icon={<CalendarDays size={20} />} label="Son 7 gün" value={stats.recentCount} detail="Yeni gözlem" tone="violet" />
        <GuidanceKpiCard icon={<ShieldAlert size={20} />} label="Risk / hassas" value={`${stats.riskCount} / ${stats.sensitiveCount}`} detail="Öncelikli kayıt" tone="amber" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Öğretmen gözlemleri</h2>
          <span>{filteredObservations.length} kayıt</span>
        </header>

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)} aria-label="Kategori filtresi">
            <option value="all">Tüm kategoriler</option>
            {observationCategories.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <select className="guidance-data-select" value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Sınıf filtresi">
            <option value="">Tüm sınıflar</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          <input className="guidance-data-date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" aria-label="Tarih filtresi" />
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Öğrenci, sınıf, öğretmen…" type="search" />
          </label>
        </div>

        {filteredObservations.length === 0 ? (
          <p className="guidance-data-empty">
            {observations.length === 0 ? "Henüz gözlem kaydı yok." : "Filtrelere uyan gözlem bulunamadı."}
          </p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Kategori</th>
                    <th>Öğretmen</th>
                    <th>Hassasiyet</th>
                    <th>Gözlem notu</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((observation) => (
                    <tr key={observation.id}>
                      <td>
                        <span className="guidance-data-primary">{observation.studentName}</span>
                        <span className="guidance-data-secondary">{observation.className || "—"}</span>
                      </td>
                      <td>
                        <span className="guidance-data-badge">{categoryLabel(observation.category)}</span>
                      </td>
                      <td>{observation.authorName}</td>
                      <td>
                        <span className={sensitivityBadgeClass(observation.sensitivity)}>{sensitivityLabel(observation.sensitivity)}</span>
                      </td>
                      <td>
                        <p className="guidance-data-text">{observation.note}</p>
                      </td>
                      <td className="guidance-data-date-cell">{formatGuidanceDate(observation.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} />
          </>
        )}
      </article>
    </section>
  );
}
