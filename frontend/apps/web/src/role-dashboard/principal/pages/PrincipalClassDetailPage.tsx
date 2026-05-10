import { ArrowLeft, Building2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";

export function PrincipalClassDetailPage({
  classes,
  sections,
  students,
  onAddSection,
  onDeleteSection
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onAddSection: (payload: { classId: string; name: string; gradeLevel: string; advisor: string; capacity: number }) => void;
  onDeleteSection: (sectionId: string) => void;
}) {
  const navigate = useNavigate();
  const { classId = "" } = useParams<{ classId: string }>();
  const schoolClass = classes.find((item) => item.id === classId);

  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    name: "",
    gradeLevel: "",
    advisor: "",
    capacity: "30"
  });

  const classSections = useMemo(() => sections.filter((item) => item.classId === classId), [sections, classId]);

  const studentCountBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students) {
      map.set(student.sectionId, (map.get(student.sectionId) ?? 0) + 1);
    }
    return map;
  }, [students]);

  function handleAddSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classId || !sectionForm.name.trim()) {
      return;
    }
    onAddSection({
      classId,
      name: sectionForm.name.trim(),
      gradeLevel: sectionForm.gradeLevel.trim(),
      advisor: sectionForm.advisor.trim(),
      capacity: Number(sectionForm.capacity) || 0
    });
    setSectionForm({ name: "", gradeLevel: "", advisor: "", capacity: "30" });
    setShowSectionForm(false);
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
      <button className="ghost-action principal-class-detail-back" type="button" onClick={() => navigate("/dashboard/classes")}>
        <ArrowLeft size={18} />
        Sınıflar
      </button>

      <header className="principal-class-detail-hero">
        <div className="principal-class-detail-title-row">
          <div className="principal-class-detail-title-icon" aria-hidden>
            <Building2 size={40} strokeWidth={1.75} />
          </div>
          <h1 className="principal-class-detail-title">{schoolClass.name}</h1>
        </div>
        <p className="principal-class-detail-sub">Şubeleri tablodan yönetin; öğrenci eklemek için şubenin yanındaki Aç düğmesini kullanın.</p>
      </header>

      <article className="principal-surface-card principal-class-detail-card">
        <div className="principal-card-head principal-card-head--split">
          <div>
            <h2>Şubeler</h2>
            <p>Bu sınıfa ait şubeler ve öğrenci sayıları.</p>
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              setShowSectionForm((current) => !current);
              setSectionForm({ name: "", gradeLevel: "", advisor: "", capacity: "30" });
            }}
          >
            {showSectionForm ? "Formu kapat" : "Şube ekle"}
          </button>
        </div>

        {showSectionForm ? (
          <form className="principal-inline-form principal-inline-form--wide principal-class-detail-section-form" onSubmit={handleAddSection}>
            <input
              value={sectionForm.name}
              onChange={(event) => setSectionForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Şube adı (A, B, Fen-A)"
              required
            />
            <input
              value={sectionForm.gradeLevel}
              onChange={(event) => setSectionForm((current) => ({ ...current, gradeLevel: event.target.value }))}
              placeholder="Kademe"
            />
            <input
              value={sectionForm.advisor}
              onChange={(event) => setSectionForm((current) => ({ ...current, advisor: event.target.value }))}
              placeholder="Sınıf öğretmeni"
            />
            <input
              value={sectionForm.capacity}
              onChange={(event) => setSectionForm((current) => ({ ...current, capacity: event.target.value }))}
              placeholder="Kontenjan"
            />
            <button className="primary-action" type="submit">
              Kaydet
            </button>
          </form>
        ) : null}

        <div className="principal-table-wrap">
          <table className="principal-table">
            <thead>
              <tr>
                <th>Şube</th>
                <th>Öğrenci sayısı</th>
                <th>Sınıf öğretmeni</th>
                <th>Aksiyonlar</th>
              </tr>
            </thead>
            <tbody>
              {classSections.length === 0 ? (
                <tr>
                  <td colSpan={4}>Henüz şube yok. Şube ekle ile yeni şube oluşturabilirsiniz.</td>
                </tr>
              ) : (
                classSections.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{studentCountBySection.get(item.id) ?? 0}</td>
                    <td>{item.advisor || "—"}</td>
                    <td>
                      <div className="principal-table-actions">
                        <button className="ghost-action" type="button" onClick={() => navigate(`/dashboard/classes/${item.classId}/${item.id}`)}>
                          Aç
                        </button>
                        <button className="ghost-action danger" type="button" onClick={() => onDeleteSection(item.id)}>
                          Sil
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
    </section>
  );
}
