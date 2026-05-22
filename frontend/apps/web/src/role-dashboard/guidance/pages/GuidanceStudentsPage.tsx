import { CheckCircle2, Eye, FileText, NotebookPen, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import type { GuidanceNote, GuidanceStudent, GuidanceSupportPlan } from "../../../lib/api";
import { categoryLabel } from "../../utils";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { GuidanceKpiCard } from "../components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../components/GuidanceMetricGrid";
import type { GuidanceStudentSupport } from "../types";
import {
  buildGuidanceStudentRows,
  formatGuidanceDate,
  studentStatusBadgeClass,
  supportStatusLabel
} from "../utils";
import "../GuidanceDataPage.css";

const PAGE_SIZE = 12;

const statusFilters = [
  { value: "all", label: "Tüm durumlar" },
  { value: "review", label: "İncelemede" },
  { value: "monitoring", label: "Takipte" },
  { value: "stable", label: "Stabil" },
  { value: "untracked", label: "Gözlemsiz" }
] as const;

const notesFilters = [
  { value: "all", label: "Tüm not durumları" },
  { value: "with_notes", label: "Notu olanlar" },
  { value: "without_notes", label: "Notsuz" }
] as const;

export function GuidanceStudentsPage({
  students,
  guidanceStudents,
  notes,
  plans
}: {
  students: GuidanceStudentSupport[];
  guidanceStudents: GuidanceStudent[];
  notes: GuidanceNote[];
  plans: GuidanceSupportPlan[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("");
  const [notesFilter, setNotesFilter] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () => buildGuidanceStudentRows(guidanceStudents, students, notes, plans),
    [guidanceStudents, students, notes, plans]
  );

  const stats = useMemo(() => {
    const review = rows.filter((row) => row.status === "review").length;
    const monitoring = rows.filter((row) => row.status === "monitoring").length;
    const withNotes = rows.filter((row) => row.noteCount > 0).length;
    const untracked = rows.filter((row) => row.status === "untracked").length;
    return { total: rows.length, review, monitoring, withNotes, untracked, roster: guidanceStudents.length };
  }, [rows, guidanceStudents.length]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.className.trim()) {
        set.add(row.className);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((row) => {
      const statusMatch = statusFilter === "all" || row.status === statusFilter;
      const classMatch = !classFilter || row.className === classFilter;
      const notesMatch =
        notesFilter === "all" ||
        (notesFilter === "with_notes" && row.noteCount > 0) ||
        (notesFilter === "without_notes" && row.noteCount === 0);
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${row.studentName} ${row.className} ${row.schoolNumber} ${supportStatusLabel(row.status)} ${row.lastCategory ? categoryLabel(row.lastCategory) : ""}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return statusMatch && classMatch && notesMatch && queryMatch;
    });
  }, [rows, statusFilter, classFilter, notesFilter, query]);

  const filterKey = `${statusFilter}|${classFilter}|${notesFilter}|${query}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filteredRows, filterKey, PAGE_SIZE);

  return (
    <section className="guidance-page-stack guidance-data-page guidance-students-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<UsersRound size={20} />} label="Kayıtlı öğrenci" value={stats.roster || stats.total} detail={`${stats.total} listede`} tone="sky" />
        <GuidanceKpiCard icon={<Eye size={20} />} label="İncelemede" value={stats.review} detail="Risk sinyali" tone="amber" />
        <GuidanceKpiCard icon={<NotebookPen size={20} />} label="Takipte" value={stats.monitoring} detail="Aktif izleme" tone="violet" />
        <GuidanceKpiCard icon={<FileText size={20} />} label="Notlu öğrenci" value={stats.withNotes} detail={`${stats.untracked} gözlemsiz`} tone="emerald" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Öğrenci listesi</h2>
          <div className="guidance-data-card-head-actions">
            <span>{filteredRows.length} öğrenci</span>
            <NavLink className="primary-action small-action" to="/dashboard/notes">
              <FileText size={16} />
              Not ekle
            </NavLink>
          </div>
        </header>

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Durum filtresi">
            {statusFilters.map((filter) => (
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
          <select className="guidance-data-select" value={notesFilter} onChange={(event) => setNotesFilter(event.target.value)} aria-label="Not filtresi">
            {notesFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad, okul no, sınıf…" type="search" />
          </label>
        </div>

        {filteredRows.length === 0 ? (
          <p className="guidance-data-empty">{rows.length === 0 ? "Henüz öğrenci kaydı yok." : "Filtrelere uyan öğrenci bulunamadı."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table guidance-students-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Sınıf</th>
                    <th>Durum</th>
                    <th>Gözlem</th>
                    <th>Risk</th>
                    <th>Not</th>
                    <th>Plan</th>
                    <th>Son kategori</th>
                    <th>Son aktivite</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr key={row.studentId}>
                      <td>
                        <span className="guidance-data-primary">{row.studentName}</span>
                        {row.schoolNumber ? <span className="guidance-data-secondary">No: {row.schoolNumber}</span> : null}
                      </td>
                      <td>{row.className || "—"}</td>
                      <td>
                        <span className={studentStatusBadgeClass(row.status)}>{supportStatusLabel(row.status)}</span>
                      </td>
                      <td className="guidance-data-num">{row.observationCount}</td>
                      <td className="guidance-data-num">{row.riskCount > 0 ? row.riskCount : "—"}</td>
                      <td className="guidance-data-num">{row.noteCount > 0 ? row.noteCount : "—"}</td>
                      <td className="guidance-data-num">{row.planCount > 0 ? row.planCount : "—"}</td>
                      <td>{row.lastCategory ? <span className="guidance-data-badge">{categoryLabel(row.lastCategory)}</span> : "—"}</td>
                      <td className="guidance-data-date-cell">{row.lastSeenAt ? formatGuidanceDate(row.lastSeenAt) : "—"}</td>
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
