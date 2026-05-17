import { ArrowLeft, CheckCircle2, Plus, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AssignStudentsModal } from "../components/AssignStudentsModal";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";
import "./PrincipalClassStudentsPage.css";

export function PrincipalClassStudentsPage({
  classes,
  sections,
  students,
  onAssignStudentsToSection
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onAssignStudentsToSection: (studentIds: string[], classId: string, sectionId: string) => void;
}) {
  const navigate = useNavigate();
  const params = useParams();
  const classId = params.classId ?? "";
  const sectionId = params.sectionId ?? "";
  const schoolClass = classes.find((item) => item.id === classId);
  const section = sections.find((item) => item.id === sectionId && item.classId === classId);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [statusFilter, setStatusFilter] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return students
      .filter((item) => item.classId === classId && item.sectionId === sectionId)
      .filter((item) => {
        if (statusFilter && item.status !== statusFilter) {
          return false;
        }
        if (!q) {
          return true;
        }
        const blob = `${item.schoolNumber} ${item.firstName} ${item.lastName} ${item.guardianName} ${item.guardianPhone}`.toLocaleLowerCase("tr-TR");
        return blob.includes(q);
      })
      .sort((a, b) => compareStudents(a, b, sort));
  }, [students, classId, sectionId, search, sort, statusFilter]);

  if (!schoolClass || !section) {
    return (
      <section className="principal-page-stack principal-section-students-page">
        <p className="principal-class-detail-missing">Sınıf veya şube bulunamadı.</p>
        <button className="ghost-action principal-class-detail-back" type="button" onClick={() => navigate("/dashboard/classes")}>
          <ArrowLeft size={18} />
          Sınıf listesine dön
        </button>
      </section>
    );
  }

  return (
    <section className="principal-page-stack principal-section-students-page">
      <header className="principal-section-students-hero">
        <div className="principal-section-students-title-row">
          <button
            className="ghost-action principal-section-students-back"
            type="button"
            onClick={() => navigate(`/dashboard/classes/${schoolClass.id}`)}
            aria-label="Sınıf detayına dön"
          >
            <ArrowLeft size={16} />
          </button>
          <h1>
            {schoolClass.name} / {section.name} şubesi
          </h1>
          <button className="primary-action principal-section-students-add" type="button" onClick={() => setAssignModalOpen(true)}>
            <Plus size={15} />
            Öğrenci ekle
          </button>
        </div>
      </header>

      <div className="principal-section-students-controls">
        <label className="principal-section-students-search">
          <Search size={15} aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, okul no, veli veya telefon ara..." type="search" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Durum filtresi">
          <option value="">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="passive">Pasif</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Öğrenci sıralaması">
          <option value="name_asc">Ad A-Z</option>
          <option value="name_desc">Ad Z-A</option>
          <option value="number_asc">No küçükten büyüğe</option>
          <option value="number_desc">No büyükten küçüğe</option>
          <option value="newest">En yeni</option>
        </select>
      </div>

      <article className="principal-surface-card principal-section-students-card">
        {rows.length === 0 ? (
          <p className="empty-text">Bu şubede filtrelere uyan öğrenci yok.</p>
        ) : (
          <div className="principal-table-wrap">
            <table className="principal-table principal-section-students-table">
              <thead>
                <tr>
                  <th>Okul no</th>
                  <th>Ad soyad</th>
                  <th>Veli</th>
                  <th>Telefon</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code className="principal-section-student-number">{item.schoolNumber}</code>
                    </td>
                    <td>
                      <span className="principal-table-name">
                        <UsersRound size={14} aria-hidden />
                        {item.firstName} {item.lastName}
                      </span>
                    </td>
                    <td>{item.guardianName || "—"}</td>
                    <td>{item.guardianPhone || "—"}</td>
                    <td>
                      <span className={`principal-section-student-badge${item.status === "active" ? " principal-section-student-badge--active" : " principal-section-student-badge--passive"}`}>
                        {item.status === "active" ? (
                          <>
                            <CheckCircle2 size={11} />
                            Aktif
                          </>
                        ) : (
                          "Pasif"
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <AssignStudentsModal
        open={assignModalOpen}
        targetSectionId={sectionId}
        classes={classes}
        sections={sections}
        students={students}
        onClose={() => setAssignModalOpen(false)}
        onAssign={(studentIds) => onAssignStudentsToSection(studentIds, classId, sectionId)}
      />
    </section>
  );
}

function compareStudents(a: ClassStudent, b: ClassStudent, sort: string) {
  if (sort === "name_desc") {
    return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`, "tr");
  }
  if (sort === "number_asc") {
    return a.schoolNumber.localeCompare(b.schoolNumber, "tr", { numeric: true });
  }
  if (sort === "number_desc") {
    return b.schoolNumber.localeCompare(a.schoolNumber, "tr", { numeric: true });
  }
  if (sort === "newest") {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
  return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr");
}
