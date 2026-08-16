import { CheckCircle2, FileSpreadsheet, Pencil, Plus, School, Search, Trash2, UserCheck, UserX, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { StudentFormModal, type StudentFormPayload } from "../components/StudentFormModal";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { StudentImportModal } from "../components/StudentImportModal";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";
import "./PrincipalStudentsPage.css";

function initials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toLocaleUpperCase("tr-TR") || "?";
}

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

  return (
    <section className="psc">
      <header className="psc-hero">
        <div>
          <p className="psc-kicker">Okul</p>
          <h1>Öğrenciler</h1>
          <p>Kadro, sınıf ve veli bilgilerini yönetin. Bir öğrenciye tıklayarak yoklama ve akademik detayı açın.</p>
        </div>
        <div className="psc-hero-actions">
          <button className="psc-import" type="button" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet size={16} />
            Listeye aktar
          </button>
          <button className="psc-add" type="button" onClick={openCreate}>
            <Plus size={16} />
            Öğrenci ekle
          </button>
        </div>
      </header>

      <div className="psc-kpi-grid">
        <article className="psc-kpi">
          <div className="psc-kpi-icon">
            <UsersRound size={18} />
          </div>
          <span>Toplam öğrenci</span>
          <strong>{studentStats.total}</strong>
          <small>Kayıtlı öğrenci</small>
        </article>
        <article className="psc-kpi">
          <div className="psc-kpi-icon psc-kpi-icon--green">
            <UserCheck size={18} />
          </div>
          <span>Aktif</span>
          <strong>{studentStats.active}</strong>
          <small>Devam eden kayıtlar</small>
        </article>
        <article className="psc-kpi">
          <div className="psc-kpi-icon psc-kpi-icon--rose">
            <UserX size={18} />
          </div>
          <span>Pasif</span>
          <strong>{studentStats.passive}</strong>
          <small>Askıda veya pasif</small>
        </article>
        <article className="psc-kpi">
          <div className="psc-kpi-icon psc-kpi-icon--violet">
            <School size={18} />
          </div>
          <span>Sınıf / şube</span>
          <strong>
            {studentStats.classCount} / {studentStats.sectionCount}
          </strong>
          <small>Farklı sınıf ve şube</small>
        </article>
      </div>

      <article className="psc-card">
        <div className="psc-toolbar">
          <label className="psc-search">
            <Search size={16} aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ad, numara, veli veya sınıf ara…"
              type="search"
            />
          </label>
          <select className="psc-select" value={filterClassId} onChange={(event) => setFilterClassId(event.target.value)} aria-label="Sınıf filtresi">
            <option value="">Tüm sınıflar</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            className={`psc-chip${filterStatus === "passive" ? " is-active" : ""}`}
            type="button"
            onClick={() => setFilterStatus((current) => (current === "passive" ? "" : "passive"))}
          >
            Pasif kayıtlar
          </button>
          <span className="psc-count">{filteredRows.length} öğrenci</span>
        </div>

        {filteredRows.length === 0 ? (
          <p className="psc-empty">{students.length === 0 ? "Henüz öğrenci kaydı yok." : "Filtrelere uyan öğrenci yok."}</p>
        ) : (
          <>
            <div className="psc-table-wrap">
              <table className="psc-table">
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
                        <NavLink className="psc-person" to={`/dashboard/students/${item.id}`}>
                          <span className="psc-avatar">{initials(item.firstName, item.lastName)}</span>
                          <div>
                            <strong>
                              {item.firstName} {item.lastName}
                            </strong>
                            <small>No: {item.schoolNumber}</small>
                          </div>
                        </NavLink>
                      </td>
                      <td>{sectionLabelById.get(item.sectionId) ?? classNameById.get(item.classId) ?? "—"}</td>
                      <td>
                        {item.guardianName || item.guardianPhone ? (
                          <div className="psc-meta">
                            <strong>{item.guardianName || "—"}</strong>
                            {item.guardianPhone ? <small>{item.guardianPhone}</small> : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className={`psc-status${item.status === "active" ? " psc-status--ok" : " psc-status--off"}`}>
                          {item.status === "active" ? (
                            <>
                              <CheckCircle2 size={12} aria-hidden />
                              Aktif
                            </>
                          ) : (
                            <>
                              <UserX size={12} aria-hidden />
                              Pasif
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="psc-actions">
                          <button className="psc-icon-btn" type="button" onClick={() => openEdit(item)} title="Düzenle" aria-label="Düzenle">
                            <Pencil size={15} />
                          </button>
                          <button className="psc-icon-btn psc-icon-btn--danger" type="button" onClick={() => handleDelete(item)} title="Sil" aria-label="Sil">
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
    </section>
  );
}
