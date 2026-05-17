import { CheckCircle2, FileSpreadsheet, GraduationCap, Pencil, Plus, School, Search, Trash2, UserCheck, UserX, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { StudentFormModal, type StudentFormPayload } from "../components/StudentFormModal";
import { StudentImportModal } from "../components/StudentImportModal";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";
import "./PrincipalStudentsPage.css";

export function PrincipalStudentsPage({
  classes,
  sections,
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onAddStudent: (payload: StudentFormPayload) => void;
  onUpdateStudent: (id: string, payload: StudentFormPayload) => void;
  onDeleteStudent: (id: string) => void;
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

  function handleImportStudents(payloads: StudentFormPayload[]) {
    payloads.forEach((payload) => onAddStudent(payload));
  }

  return (
    <section className="principal-page-stack principal-students-page">
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

      <div className="principal-students-toolbar">
        <div className="principal-students-toolbar-text">
          <GraduationCap size={20} aria-hidden />
          <h2>Öğrenci listesi</h2>
        </div>
        <div className="principal-students-toolbar-actions">
          <button className="ghost-action principal-students-import" type="button" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet size={18} />
            Öğrenci listesine aktar
          </button>
          <button className="primary-action principal-students-add" type="button" onClick={openCreate}>
            <Plus size={18} />
            Öğrenci ekle
          </button>
        </div>
      </div>

      <div className="principal-students-filters">
        <label className="principal-students-search">
          <Search size={17} aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, numara, veli veya sınıf ara…" type="search" />
        </label>
        <select className="principal-students-select" value={filterClassId} onChange={(event) => setFilterClassId(event.target.value)} aria-label="Sınıf filtresi">
          <option value="">Tüm sınıflar</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="principal-students-select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Durum filtresi">
          <option value="">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="passive">Pasif</option>
        </select>
      </div>

      <article className="principal-surface-card principal-students-table-card">
        {filteredRows.length === 0 ? (
          <p className="empty-text">{students.length === 0 ? "Henüz öğrenci kaydı yok." : "Filtrelere uyan öğrenci yok."}</p>
        ) : (
          <div className="principal-table-wrap">
            <table className="principal-table principal-students-table">
              <thead>
                <tr>
                  <th>Okul no</th>
                  <th>Ad soyad</th>
                  <th>Sınıf / şube</th>
                  <th>Veli</th>
                  <th>Telefon</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code className="principal-students-number">{item.schoolNumber}</code>
                    </td>
                    <td>
                      <span className="principal-table-name">
                        <UsersRound size={16} aria-hidden />
                        {item.firstName} {item.lastName}
                      </span>
                    </td>
                    <td>{sectionLabelById.get(item.sectionId) ?? classNameById.get(item.classId) ?? "—"}</td>
                    <td>{item.guardianName || "—"}</td>
                    <td>{item.guardianPhone || "—"}</td>
                    <td>
                      <span className={`principal-students-badge${item.status === "active" ? " principal-students-badge--active" : " principal-students-badge--passive"}`}>
                        {item.status === "active" ? (
                          <>
                            <CheckCircle2 size={12} />
                            Aktif
                          </>
                        ) : (
                          "Pasif"
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="principal-table-actions principal-students-actions">
                        <button className="ghost-action" type="button" onClick={() => openEdit(item)} title="Düzenle">
                          <Pencil size={16} />
                        </button>
                        <button className="ghost-action danger" type="button" onClick={() => handleDelete(item)} title="Sil">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        existingSchoolNumbers={existingSchoolNumbers}
        onClose={() => setImportOpen(false)}
        onImport={handleImportStudents}
      />
    </section>
  );
}
