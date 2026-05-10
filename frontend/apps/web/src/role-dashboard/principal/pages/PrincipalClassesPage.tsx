import { Building2, GraduationCap, Plus, UsersRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";

export function PrincipalClassesPage({
  classes,
  sections,
  students,
  onAddClass
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onAddClass: (payload: { name: string }) => void;
}) {
  const navigate = useNavigate();
  const [className, setClassName] = useState("");

  const orderedClasses = useMemo(
    () => [...classes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [classes]
  );

  const sectionCountByClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const section of sections) {
      map.set(section.classId, (map.get(section.classId) ?? 0) + 1);
    }
    return map;
  }, [sections]);

  const studentCountByClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students) {
      map.set(student.classId, (map.get(student.classId) ?? 0) + 1);
    }
    return map;
  }, [students]);

  function handleAddClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = className.trim();
    if (!name) {
      return;
    }
    onAddClass({ name });
    setClassName("");
  }

  return (
    <section className="principal-page-stack principal-classes-only">
      <div className="sa-inst-grid principal-classes-card-row">
        <article className="sa-inst-card sa-inst-card--add principal-add-class-card principal-class-card-slot">
          <div className="sa-inst-card-add-icon">
            <Plus size={28} />
          </div>
          <strong>Yeni sınıf ekle</strong>
          <span className="principal-add-class-hint">Sınıf adını yazıp ekleyin.</span>
          <form className="principal-add-class-form" onSubmit={handleAddClass}>
            <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Örn: 11" />
            <button className="primary-action" type="submit">
              Ekle
            </button>
          </form>
        </article>

        {orderedClasses.map((item) => (
          <button
            key={item.id}
            type="button"
            className="sa-inst-card sa-inst-card--plan-growth principal-class-card principal-class-card-slot principal-class-card-btn"
            onClick={() => navigate(`/dashboard/classes/${item.id}`)}
          >
            <div className="sa-inst-card-band" />
            <div className="principal-class-card-title-block">
              <div className="principal-class-card-title-icon" aria-hidden>
                <Building2 size={28} strokeWidth={1.75} />
              </div>
              <span className="principal-class-card-title-text">{item.name}</span>
            </div>
            <p className="sa-inst-card-meta principal-class-card-meta">Oluşturulma: {new Date(item.createdAt).toLocaleDateString("tr-TR")}</p>
            <div className="sa-inst-card-stats principal-class-card-stats">
              <div>
                <GraduationCap size={15} />
                <div>
                  <span>Şube sayısı</span>
                  <strong>{sectionCountByClass.get(item.id) ?? 0}</strong>
                </div>
              </div>
              <div>
                <UsersRound size={15} />
                <div>
                  <span>Toplam öğrenci</span>
                  <strong>{studentCountByClass.get(item.id) ?? 0}</strong>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
