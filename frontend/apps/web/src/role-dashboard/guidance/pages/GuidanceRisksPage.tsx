import { AlertTriangle, Search, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import { useMemo, useState } from "react";
import { observationCategories } from "../../data";
import { categoryLabel } from "../../utils";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { GuidanceKpiCard } from "../components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../components/GuidanceMetricGrid";
import { riskCategories } from "../data";
import type { GuidanceRiskSignal } from "../types";
import { formatGuidanceDate, levelLabel, riskLevelBadgeClass } from "../utils";
import "../GuidanceDataPage.css";

const PAGE_SIZE = 12;

const levelFilters = [
  { value: "all", label: "Tüm seviyeler" },
  { value: "high", label: "Yüksek" },
  { value: "medium", label: "Orta" },
  { value: "low", label: "Düşük" }
] as const;

const riskCategoryOptions = observationCategories.filter((item) => riskCategories.includes(item.value));

export function GuidanceRisksPage({ risks }: { risks: GuidanceRiskSignal[] }) {
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const high = risks.filter((risk) => risk.level === "high").length;
    const medium = risks.filter((risk) => risk.level === "medium").length;
    const low = risks.filter((risk) => risk.level === "low").length;
    const students = new Set(risks.map((risk) => risk.studentId)).size;
    return { total: risks.length, high, medium, low, students };
  }, [risks]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    for (const risk of risks) {
      if (risk.className.trim()) {
        set.add(risk.className);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [risks]);

  const filteredRisks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return risks.filter((risk) => {
      const levelMatch = levelFilter === "all" || risk.level === levelFilter;
      const categoryMatch = categoryFilter === "all" || risk.category === categoryFilter;
      const classMatch = !classFilter || risk.className === classFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${risk.studentName} ${risk.className} ${categoryLabel(risk.category)} ${levelLabel(risk.level)} ${risk.summary}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return levelMatch && categoryMatch && classMatch && queryMatch;
    });
  }, [risks, levelFilter, categoryFilter, classFilter, query]);

  const filterKey = `${levelFilter}|${categoryFilter}|${classFilter}|${query}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filteredRisks, filterKey, PAGE_SIZE);

  return (
    <section className="guidance-page-stack guidance-data-page guidance-risks-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<AlertTriangle size={20} />} label="Toplam sinyal" value={stats.total} detail={`${stats.students} öğrenci`} tone="sky" />
        <GuidanceKpiCard icon={<SignalHigh size={20} />} label="Yüksek" value={stats.high} detail="Acil değerlendirme" tone="rose" />
        <GuidanceKpiCard icon={<SignalMedium size={20} />} label="Orta" value={stats.medium} detail="Planlanan görüşme" tone="amber" />
        <GuidanceKpiCard icon={<SignalLow size={20} />} label="Düşük" value={stats.low} detail="İzleme listesi" tone="emerald" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Risk sinyalleri</h2>
          <span>{filteredRisks.length} sinyal</span>
        </header>

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} aria-label="Seviye filtresi">
            {levelFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <select className="guidance-data-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Kategori filtresi">
            <option value="all">Tüm kategoriler</option>
            {riskCategoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
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
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Öğrenci, kategori, özet…" type="search" />
          </label>
        </div>

        {filteredRisks.length === 0 ? (
          <p className="guidance-data-empty">{risks.length === 0 ? "Aktif erken uyarı sinyali yok." : "Filtrelere uyan sinyal bulunamadı."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table guidance-risks-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Kategori</th>
                    <th>Seviye</th>
                    <th>Kayıt</th>
                    <th>Özet</th>
                    <th>Son görülme</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((risk) => (
                    <tr key={risk.id}>
                      <td>
                        <span className="guidance-data-primary">{risk.studentName}</span>
                        <span className="guidance-data-secondary">{risk.className || "—"}</span>
                      </td>
                      <td>
                        <span className="guidance-data-badge">{categoryLabel(risk.category)}</span>
                      </td>
                      <td>
                        <span className={riskLevelBadgeClass(risk.level)}>{levelLabel(risk.level)}</span>
                      </td>
                      <td className="guidance-data-num">{risk.sourceCount}</td>
                      <td>
                        <p className="guidance-data-text">{risk.summary}</p>
                      </td>
                      <td className="guidance-data-date-cell">{formatGuidanceDate(risk.lastSeenAt)}</td>
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
