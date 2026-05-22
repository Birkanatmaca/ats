import { BellRing, Megaphone, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { Announcement } from "../../lib/api";
import { TablePagination } from "../components/TablePagination";
import { usePaginatedRows } from "../hooks/usePaginatedRows";
import { GuidanceKpiCard } from "../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../guidance/components/GuidanceMetricGrid";
import { formatGuidanceDate } from "../guidance/utils";
import { announcementAudienceLabel, announcementAudienceOptions } from "../utils/labels";
import "../guidance/GuidanceDataPage.css";

const PAGE_SIZE = 12;

export function RoleAnnouncementsPage({ announcements }: { announcements: Announcement[] }) {
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = announcements.filter((item) => new Date(item.publishedAt).getTime() >= weekAgo).length;
    const teachers = announcements.filter((item) => item.audience === "teachers" || item.audience === "all").length;
    const guardians = announcements.filter((item) => item.audience === "guardians" || item.audience === "all").length;
    return { total: announcements.length, recent, teachers, guardians };
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return announcements.filter((item) => {
      const audienceMatch =
        audienceFilter === "all" ||
        item.audience === audienceFilter ||
        (audienceFilter === "class" && item.audience.startsWith("class:"));
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${item.title} ${item.body} ${announcementAudienceLabel(item.audience)}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return audienceMatch && queryMatch;
    });
  }, [announcements, audienceFilter, query]);

  const filterKey = `${audienceFilter}|${query}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(
    filteredAnnouncements,
    filterKey,
    PAGE_SIZE
  );

  return (
    <section className="guidance-page-stack guidance-data-page role-announcements-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<Megaphone size={20} />} label="Toplam duyuru" value={stats.total} detail="Yayınlanan" tone="sky" />
        <GuidanceKpiCard icon={<BellRing size={20} />} label="Son 7 gün" value={stats.recent} detail="Yeni duyuru" tone="violet" />
        <GuidanceKpiCard icon={<Users size={20} />} label="Öğretmen" value={stats.teachers} detail="Hedef kapsamı" tone="amber" />
        <GuidanceKpiCard icon={<Users size={20} />} label="Veli" value={stats.guardians} detail="Hedef kapsamı" tone="emerald" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Kurum duyuruları</h2>
          <span>{filteredAnnouncements.length} duyuru</span>
        </header>

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)} aria-label="Hedef kitle filtresi">
            <option value="all">Tüm hedef kitleler</option>
            {announcementAudienceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="class">Sınıf hedefli</option>
          </select>
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Başlık, içerik…" type="search" />
          </label>
        </div>

        {filteredAnnouncements.length === 0 ? (
          <p className="guidance-data-empty">{announcements.length === 0 ? "Yayınlanmış duyuru yok." : "Filtrelere uyan duyuru bulunamadı."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table role-announcements-table">
                <thead>
                  <tr>
                    <th>Başlık</th>
                    <th>Hedef</th>
                    <th>Yayın</th>
                    <th>İçerik</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((item) => {
                    const expanded = expandedId === item.id;
                    return (
                      <tr key={item.id} className={expanded ? "is-expanded" : undefined}>
                        <td>
                          <button className="guidance-data-expand-btn" type="button" onClick={() => setExpandedId(expanded ? null : item.id)}>
                            <span className="guidance-data-primary">{item.title}</span>
                          </button>
                        </td>
                        <td>
                          <span className="guidance-data-badge guidance-data-badge--violet">{announcementAudienceLabel(item.audience)}</span>
                        </td>
                        <td className="guidance-data-date-cell">{formatGuidanceDate(item.publishedAt)}</td>
                        <td>
                          <p className={`guidance-data-text${expanded ? " is-expanded" : ""}`}>{item.body}</p>
                        </td>
                      </tr>
                    );
                  })}
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
