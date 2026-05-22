import { FileText, NotebookTabs, Plus, Search, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { GuidanceNote, GuidanceStudent } from "../../../lib/api";
import { api } from "../../../lib/api";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { GuidanceKpiCard } from "../components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../components/GuidanceMetricGrid";
import { GuidanceNoteForm } from "../components/GuidanceNoteForm";
import { guidanceNoteTypes, noteTypeLabel } from "../data";
import { formatGuidanceDate } from "../utils";
import { sensitivityBadgeClass, sensitivityLabel } from "../utils/sensitivity";
import "../GuidanceDataPage.css";

const PAGE_SIZE = 12;
const emptyForm = { studentId: "", noteType: "meeting", title: "", body: "" };

export function GuidanceNotesPage({
  students,
  notes,
  onReload
}: {
  students: GuidanceStudent[];
  notes: GuidanceNote[];
  onReload: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const reportCount = notes.filter((n) => n.noteType === "report").length;
    const meetingCount = notes.filter((n) => n.noteType === "meeting" || n.noteType === "parent_contact").length;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = notes.filter((n) => new Date(n.createdAt).getTime() >= weekAgo).length;
    return { total: notes.length, reportCount, meetingCount, recent };
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return notes.filter((note) => {
      const typeMatch = typeFilter === "all" || note.noteType === typeFilter;
      const studentMatch = !studentFilter || note.studentId === studentFilter;
      const dateMatch = !dateFilter || note.createdAt.startsWith(dateFilter);
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${note.studentName} ${note.className} ${note.title} ${note.body} ${note.authorName} ${noteTypeLabel(note.noteType)}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return typeMatch && studentMatch && dateMatch && queryMatch;
    });
  }, [typeFilter, studentFilter, dateFilter, notes, query]);

  const filterKey = `${typeFilter}|${studentFilter}|${dateFilter}|${query}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filteredNotes, filterKey, PAGE_SIZE);

  function openModal() {
    setError(null);
    setMessage(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setError(null);
    setMessage(null);
    setLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.createGuidanceNote(form);
      closeModal();
      onReload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(note: GuidanceNote) {
    if (!window.confirm(`${note.studentName} için bu notu silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await api.deleteGuidanceNote(note.id);
      onReload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Silme başarısız.");
    }
  }

  return (
    <section className="guidance-page-stack guidance-data-page guidance-notes-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<NotebookTabs size={20} />} label="Toplam not" value={stats.total} detail="Rehberlik kayıtları" tone="sky" />
        <GuidanceKpiCard icon={<FileText size={20} />} label="İzleme raporu" value={stats.reportCount} detail="Rapor türü" tone="violet" />
        <GuidanceKpiCard icon={<NotebookTabs size={20} />} label="Görüşme" value={stats.meetingCount} detail="Veli / birebir" tone="emerald" />
        <GuidanceKpiCard icon={<ShieldAlert size={20} />} label="Son 7 gün" value={stats.recent} detail="Yeni kayıt" tone="amber" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Rehberlik notları</h2>
          <div className="guidance-data-card-head-actions">
            <span>{filteredNotes.length} kayıt</span>
            <button className="primary-action small-action" type="button" onClick={openModal} disabled={students.length === 0}>
              <Plus size={16} />
              Yeni not ekle
            </button>
          </div>
        </header>

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Not türü filtresi">
            <option value="all">Tüm not türleri</option>
            {guidanceNoteTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select className="guidance-data-select" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)} aria-label="Öğrenci filtresi">
            <option value="">Tüm öğrenciler</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))}
          </select>
          <input className="guidance-data-date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" aria-label="Tarih filtresi" />
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Öğrenci, başlık, not metni…" type="search" />
          </label>
        </div>

        {filteredNotes.length === 0 ? (
          <p className="guidance-data-empty">{notes.length === 0 ? "Henüz rehberlik notu yok." : "Filtrelere uyan not bulunamadı."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Tür</th>
                    <th>Başlık</th>
                    <th>Not</th>
                    <th>Yazar</th>
                    <th>Hassasiyet</th>
                    <th>Tarih</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((note) => (
                    <tr key={note.id}>
                      <td>
                        <span className="guidance-data-primary">{note.studentName}</span>
                        <span className="guidance-data-secondary">{note.className || "—"}</span>
                      </td>
                      <td>
                        <span className="guidance-data-badge guidance-data-badge--violet">{noteTypeLabel(note.noteType)}</span>
                      </td>
                      <td>{note.title || "—"}</td>
                      <td>
                        <p className="guidance-data-text">{note.body}</p>
                      </td>
                      <td>{note.authorName}</td>
                      <td>
                        <span className={sensitivityBadgeClass(note.sensitivity)}>{sensitivityLabel(note.sensitivity)}</span>
                      </td>
                      <td className="guidance-data-date-cell">{formatGuidanceDate(note.createdAt)}</td>
                      <td>
                        <div className="guidance-data-actions">
                          <button className="ghost-action danger" type="button" onClick={() => void handleDelete(note)} title="Sil">
                            <Trash2 size={15} />
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} />
          </>
        )}
      </article>

      {modalOpen ? (
        <div className="guidance-modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="guidance-modal guidance-note-modal" role="dialog" aria-modal aria-labelledby="guidance-note-modal-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="guidance-note-modal-title">Yeni rehberlik notu</h3>
            <GuidanceNoteForm
              students={students}
              form={form}
              loading={loading}
              message={message}
              error={error}
              onChange={setForm}
              onSubmit={handleSubmit}
              onCancel={closeModal}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
