import { CheckCircle2, ClipboardCheck, FileSpreadsheet, Loader2, Pencil, Plus, School, Search, Trash2, UserCheck, UserX, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { StudentFormModal, type StudentFormPayload } from "../components/StudentFormModal";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { api, type StudentAttendanceSummary } from "../../../lib/api";
import { StudentImportModal } from "../components/StudentImportModal";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";
import "../../guidance/GuidanceDataPage.css";
import "./PrincipalStudentsPage.css";

export function PrincipalStudentsPage({
  classes,
  sections,
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onImportComplete
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onAddStudent: (payload: StudentFormPayload) => void;
  onUpdateStudent: (id: string, payload: StudentFormPayload) => void;
  onDeleteStudent: (id: string) => void;
  onImportComplete?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<ClassStudent | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [summaryStudent, setSummaryStudent] = useState<ClassStudent | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<StudentAttendanceSummary | null>(null);

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const sectionLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sections) {
      const className = classNameById.get(s.classId) ?? "—";
      map.set(s.id, `${className} / ${s.name}`);
    }
    return map;
  }, [sections, classNameById]);

  const studentStats = useMemo(() => {
    const active = students.filter((s) => s.status === "active").length;
    const passive = students.length - active;
    const classCount = new Set(students.map((s) => s.classId).filter(Boolean)).size;
    const sectionCount = new Set(students.map((s) => s.sectionId).filter(Boolean)).size;
    return { total: students.length, active, passive, classCount, sectionCount };
  }, [students]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...students]
      .sort((a, b) => {
        const ca = classNameById.get(a.classId) ?? "";
        const cb = classNameById.get(b.classId) ?? "";
        if (ca !== cb) {
          return ca.localeCompare(cb, "tr");
        }
        const sa = sectionLabelById.get(a.sectionId) ?? "";
        const sb = sectionLabelById.get(b.sectionId) ?? "";
        if (sa !== sb) {
          return sa.localeCompare(sb, "tr");
        }
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr");
      })
      .filter((item) => {
        if (filterClassId && item.classId !== filterClassId) {
          return false;
        }
        if (filterStatus && item.status !== filterStatus) {
          return false;
        }
        if (!q) {
          return true;
        }
        const blob = `${item.schoolNumber} ${item.firstName} ${item.lastName} ${item.guardianName ?? ""} ${item.guardianPhone ?? ""} ${
          sectionLabelById.get(item.sectionId) ?? ""
        }`.toLowerCase();
        return blob.includes(q);
      });
  }, [students, classNameById, sectionLabelById, search, filterClassId, filterStatus]);

  const filterKey = `${search}|${filterClassId}|${filterStatus}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filteredRows, filterKey);

  const existingSchoolNumbers = useMemo(() => students.map((student) => student.schoolNumber), [students]);

  function openCreate() {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: ClassStudent) {
    setModalMode("edit");
    setEditing(row);
    setModalOpen(true);
  }

  function handleFormSubmit(payload: StudentFormPayload) {
    if (modalMode === "create") {
      onAddStudent(payload);
    } else if (editing) {
      onUpdateStudent(editing.id, payload);
    }
    setModalOpen(false);
  }

  function handleDelete(row: ClassStudent) {
    if (!window.confirm(`${row.firstName} ${row.lastName} öğrenci kaydını silmek istediğinize emin misiniz?`)) {
      return;
    }
    onDeleteStudent(row.id);
  }

  async function openAttendanceSummary(row: ClassStudent) {
    setSummaryStudent(row);
    setSummaryLoading(true);
    setSummaryError(null);
    setAttendanceSummary(null);
    try {
      const summary = await api.studentAttendanceSummary(row.id);
      setAttendanceSummary(summary);
    } catch {
      setSummaryError("Devamsızlık özeti alınamadı.");
    } finally {
      setSummaryLoading(false);
    }
  }

  function closeAttendanceSummary() {
    setSummaryStudent(null);
    setAttendanceSummary(null);
    setSummaryError(null);
  }

  return (
    <section className="principal-page-stack principal-students-page guidance-data-page">
      <div className="principal-stat-grid principal-students-stats" aria-label="Öğrenci istatistikleri">
        <article className="principal-stat-card principal-stat-card--sky">
          <span className="principal-stat-icon" aria-hidden>
            <UsersRound size={20} />
          </span>
          <small>Toplam öğrenci</small>
          <strong>{studentStats.total}</strong>
          <em>Kayıtlı öğrenci sayısı</em>
        </article>
        <article className="principal-stat-card principal-stat-card--emerald">
          <span className="principal-stat-icon" aria-hidden>
            <UserCheck size={20} />
          </span>
          <small>Aktif</small>
          <strong>{studentStats.active}</strong>
          <em>Devam eden kayıtlar</em>
        </article>
        <article className="principal-stat-card principal-stat-card--rose">
          <span className="principal-stat-icon" aria-hidden>
            <UserX size={20} />
          </span>
          <small>Pasif</small>
          <strong>{studentStats.passive}</strong>
          <em>Askıda veya pasif</em>
        </article>
        <article className="principal-stat-card principal-stat-card--violet">
          <span className="principal-stat-icon" aria-hidden>
            <School size={20} />
          </span>
          <small>Sınıf / şube</small>
          <strong>
            {studentStats.classCount}
            <span className="principal-students-stat-pair"> / {studentStats.sectionCount}</span>
          </strong>
          <em>Kayıt olan farklı sınıf ve şube</em>
        </article>
      </div>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Öğrenci listesi</h2>
          <div className="guidance-data-card-head-actions">
            <span>{filteredRows.length} öğrenci</span>
            <button className="ghost-action small-action principal-students-import" type="button" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet size={16} />
              Listeye aktar
            </button>
            <button className="primary-action small-action" type="button" onClick={openCreate}>
              <Plus size={16} />
              Öğrenci ekle
            </button>
          </div>
        </header>

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={filterClassId} onChange={(event) => setFilterClassId(event.target.value)} aria-label="Sınıf filtresi">
            <option value="">Tüm sınıflar</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select className="guidance-data-select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Durum filtresi">
            <option value="">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, numara, veli veya sınıf ara…" type="search" />
          </label>
        </div>

        {filteredRows.length === 0 ? (
          <p className="guidance-data-empty">{students.length === 0 ? "Henüz öğrenci kaydı yok." : "Filtrelere uyan öğrenci yok."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table principal-students-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Sınıf / şube</th>
                    <th>Veli</th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="guidance-data-primary">
                          {item.firstName} {item.lastName}
                        </span>
                        <span className="guidance-data-secondary">No: {item.schoolNumber}</span>
                      </td>
                      <td>{sectionLabelById.get(item.sectionId) ?? classNameById.get(item.classId) ?? "—"}</td>
                      <td>
                        {item.guardianName || item.guardianPhone ? (
                          <>
                            <span className="guidance-data-primary">{item.guardianName || "—"}</span>
                            {item.guardianPhone ? <span className="guidance-data-secondary">{item.guardianPhone}</span> : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span
                          className={`guidance-data-badge guidance-data-badge--inline${
                            item.status === "active" ? " guidance-data-badge--emerald" : " guidance-data-badge--rose"
                          }`}
                        >
                          {item.status === "active" ? (
                            <>
                              <CheckCircle2 size={11} aria-hidden />
                              Aktif
                            </>
                          ) : (
                            <>
                              <UserX size={11} aria-hidden />
                              Pasif
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="guidance-data-actions principal-students-row-actions">
                          <button
                            className="ghost-action"
                            type="button"
                            onClick={() => void openAttendanceSummary(item)}
                            title="Devamsızlık özeti"
                            aria-label="Devamsızlık özeti"
                          >
                            <ClipboardCheck size={15} />
                          </button>
                          <button className="ghost-action" type="button" onClick={() => openEdit(item)} title="Düzenle" aria-label="Düzenle">
                            <Pencil size={15} />
                          </button>
                          <button className="ghost-action danger" type="button" onClick={() => handleDelete(item)} title="Sil" aria-label="Sil">
                            <Trash2 size={15} />
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

      <StudentFormModal
        open={modalOpen}
        mode={modalMode}
        classes={classes}
        sections={sections}
        initial={editing}
        existingSchoolNumbers={existingSchoolNumbers}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
      />
      <StudentImportModal
        open={importOpen}
        classes={classes}
        existingSchoolNumbers={existingSchoolNumbers}
        onClose={() => setImportOpen(false)}
        onComplete={onImportComplete}
      />

      {summaryStudent ? (
        <div className="principal-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeAttendanceSummary()}>
          <div className="principal-modal principal-students-summary-modal" role="dialog" aria-modal="true" aria-labelledby="student-summary-title">
            <header className="principal-modal-head">
              <div>
                <h2 id="student-summary-title">
                  {summaryStudent.firstName} {summaryStudent.lastName}
                </h2>
                <p className="principal-students-summary-subtitle">Devamsızlık özeti · {summaryStudent.schoolNumber}</p>
              </div>
              <button className="principal-modal-close" type="button" onClick={closeAttendanceSummary} aria-label="Kapat">
                <X size={18} />
              </button>
            </header>
            <div className="principal-modal-body principal-students-summary-body">
              {summaryLoading ? (
                <p className="principal-students-summary-loading">
                  <Loader2 size={18} className="spin" aria-hidden />
                  Özet yükleniyor…
                </p>
              ) : summaryError ? (
                <p className="principal-modal-error">{summaryError}</p>
              ) : attendanceSummary ? (
                <>
                  <div className="principal-students-summary-stats" aria-label="Devamsızlık istatistikleri">
                    <article>
                      <small>Geldi</small>
                      <strong>{attendanceSummary.present}</strong>
                    </article>
                    <article>
                      <small>Devamsız</small>
                      <strong>{attendanceSummary.absent}</strong>
                    </article>
                    <article>
                      <small>Geç</small>
                      <strong>{attendanceSummary.late}</strong>
                    </article>
                    <article>
                      <small>Mazeretli</small>
                      <strong>{attendanceSummary.excused}</strong>
                    </article>
                  </div>
                  {attendanceSummary.records.length === 0 ? (
                    <p className="empty-text">Henüz kesinleşmiş yoklama kaydı yok.</p>
                  ) : (
                    <div className="principal-table-wrap">
                      <table className="principal-table principal-students-summary-table">
                        <thead>
                          <tr>
                            <th>Tarih</th>
                            <th>Ders</th>
                            <th>Sınıf</th>
                            <th>Durum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceSummary.records.map((record, index) => (
                            <tr key={`${record.date}-${record.subjectName}-${index}`}>
                              <td>{record.date}</td>
                              <td>{record.subjectName}</td>
                              <td>{record.className}</td>
                              <td>{record.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
