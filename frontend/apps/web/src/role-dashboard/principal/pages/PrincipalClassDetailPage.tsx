import { ArrowLeft, Building2, DoorOpen, Plus, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SectionFormModal, type SectionFormPayload } from "../components/SectionFormModal";
import type { ClassSection, ClassStudent, PrincipalManagedTeacher, SchoolClass } from "../types";
import "./PrincipalClassDetailPage.css";

export function PrincipalClassDetailPage({
  classes,
  sections,
  students,
  teachers,
  onAddSection,
  onDeleteSection
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  teachers: PrincipalManagedTeacher[];
  onAddSection: (payload: { classId: string; name: string; gradeLevel: string; advisor: string; capacity: number }) => void;
  onDeleteSection: (sectionId: string) => void;
}) {
  const navigate = useNavigate();
  const { classId = "" } = useParams<{ classId: string }>();
  const schoolClass = classes.find((item) => item.id === classId);

  const [sectionModalOpen, setSectionModalOpen] = useState(false);

  const classSections = useMemo(() => sections.filter((item) => item.classId === classId), [sections, classId]);

  const studentCountBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students) {
      map.set(student.sectionId, (map.get(student.sectionId) ?? 0) + 1);
    }
    return map;
  }, [students]);

  function handleAddSection(payload: SectionFormPayload) {
    if (!classId) {
      return;
    }
    onAddSection({
      classId,
      ...payload
    });
    setSectionModalOpen(false);
  }

  if (!schoolClass) {
    return (
      <section className="principal-page-stack principal-class-detail">
        <p className="principal-class-detail-missing">Sınıf bulunamadı.</p>
        <button className="ghost-action principal-class-detail-back" type="button" onClick={() => navigate("/dashboard/classes")}>
          <ArrowLeft size={18} />
          Sınıf listesine dön
        </button>
      </section>
    );
  }

  return (
    <section className="principal-page-stack principal-class-detail">
      <header className="principal-class-detail-hero">
        <div className="principal-class-detail-title-row">
          <button className="ghost-action principal-class-detail-back-icon" type="button" onClick={() => navigate("/dashboard/classes")} aria-label="Sınıflara dön">
            <ArrowLeft size={16} />
          </button>
          <div className="principal-class-detail-title-icon" aria-hidden>
            <Building2 size={22} strokeWidth={1.75} />
          </div>
          <h1 className="principal-class-detail-title">{schoolClass.name}</h1>
          <button className="primary-action principal-class-detail-add" type="button" onClick={() => setSectionModalOpen(true)}>
            <Plus size={15} />
            Şube ekle
          </button>
        </div>
      </header>

      <article className="principal-surface-card principal-class-detail-card">
        <div className="principal-card-head">
          <h2>Şubeler</h2>
        </div>

        <div className="principal-table-wrap">
          <table className="principal-table">
            <thead>
              <tr>
                <th>Şube</th>
                <th>Öğrenci</th>
                <th>Kontenjan</th>
                <th>Sınıf öğretmeni</th>
                <th>Aksiyonlar</th>
              </tr>
            </thead>
            <tbody>
              {classSections.length === 0 ? (
                <tr>
                  <td colSpan={5}>Henüz şube yok. Şube ekle ile yeni şube oluşturabilirsiniz.</td>
                </tr>
              ) : (
                classSections.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="principal-section-name">
                        <strong>{item.name}</strong>
                        <small>{item.gradeLevel || "Kademe yok"}</small>
                      </span>
                    </td>
                    <td>
                      <span className="principal-section-count">
                        <UsersRound size={13} />
                        {studentCountBySection.get(item.id) ?? 0}
                      </span>
                    </td>
                    <td>{item.capacity || "—"}</td>
                    <td>
                      <span className={`principal-section-advisor${item.advisor ? "" : " principal-section-advisor--empty"}`}>
                        {item.advisor || "Atanmadı"}
                      </span>
                    </td>
                    <td>
                      <div className="principal-table-actions">
                        <button className="ghost-action principal-section-action" type="button" onClick={() => navigate(`/dashboard/classes/${item.classId}/${item.id}`)} title="Şubeyi aç">
                          <DoorOpen size={14} />
                          Aç
                        </button>
                        <button className="ghost-action danger principal-section-action principal-section-action--icon" type="button" onClick={() => onDeleteSection(item.id)} title="Şubeyi sil" aria-label={`${item.name} şubesini sil`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <SectionFormModal open={sectionModalOpen} teachers={teachers} onClose={() => setSectionModalOpen(false)} onSubmit={handleAddSection} />
    </section>
  );
}
