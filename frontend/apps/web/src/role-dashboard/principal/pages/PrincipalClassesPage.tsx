import { ArrowDownWideNarrow, Building2, Filter, GraduationCap, Plus, Search, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";
import "./PrincipalClassesPage.css";

export function PrincipalClassesPage({
  classes,
  sections,
  students,
  onAddClass,
  onDeleteClass
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onAddClass: (payload: { name: string }) => void;
  onDeleteClass: (classId: string) => void;
}) {
  const navigate = useNavigate();
  const [className, setClassName] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("grade_desc");

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

  const orderedClasses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
    return [...classes]
      .filter((item) => {
        const sectionCount = sectionCountByClass.get(item.id) ?? 0;
        const studentCount = studentCountByClass.get(item.id) ?? 0;

        if (filter === "with_sections" && sectionCount === 0) {
          return false;
        }
        if (filter === "without_sections" && sectionCount > 0) {
          return false;
        }
        if (filter === "with_students" && studentCount === 0) {
          return false;
        }
        if (filter === "without_students" && studentCount > 0) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }
        return item.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch);
      })
      .sort((a, b) => compareClasses(a, b, sort, sectionCountByClass, studentCountByClass));
  }, [classes, filter, search, sectionCountByClass, sort, studentCountByClass]);

  function handleAddClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = className.trim();
    if (!name) {
      return;
    }
    onAddClass({ name });
    setClassName("");
  }

  function handleDeleteClass(item: SchoolClass) {
    const sectionCount = sectionCountByClass.get(item.id) ?? 0;
    const studentCount = studentCountByClass.get(item.id) ?? 0;
    let message = `"${item.name}" sınıfını silmek istediğinize emin misiniz?`;
    if (sectionCount > 0 || studentCount > 0) {
      message += ` Bu işlem ${sectionCount} şube ve ${studentCount} öğrenci kaydını da kaldırır.`;
    }
    if (!window.confirm(message)) {
      return;
    }
    onDeleteClass(item.id);
  }

  return (
    <section className="principal-page-stack principal-classes-only">
      <div className="principal-classes-controls" aria-label="Sınıf filtreleri">
        <label className="principal-classes-search">
          <Search size={16} aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sınıf ara..." type="search" />
        </label>
        <label className="principal-classes-select">
          <Filter size={15} aria-hidden />
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Sınıf filtresi">
            <option value="all">Tüm sınıflar</option>
            <option value="with_sections">Şubesi olanlar</option>
            <option value="without_sections">Şubesiz</option>
            <option value="with_students">Öğrencisi olanlar</option>
            <option value="without_students">Öğrencisiz</option>
          </select>
        </label>
        <label className="principal-classes-select">
          <ArrowDownWideNarrow size={15} aria-hidden />
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sınıf sıralaması">
            <option value="grade_desc">Büyükten küçüğe</option>
            <option value="grade_asc">Küçükten büyüğe</option>
            <option value="newest">En yeni</option>
            <option value="oldest">En eski</option>
            <option value="students_desc">Öğrenci sayısı</option>
            <option value="sections_desc">Şube sayısı</option>
          </select>
        </label>
      </div>

      <div className="sa-inst-grid principal-classes-card-row">
        <article className="sa-inst-card sa-inst-card--add principal-add-class-card principal-class-card-slot">
          <div className="sa-inst-card-add-icon">
            <Plus size={20} />
          </div>
          <strong>Yeni sınıf ekle</strong>
          <span className="principal-add-class-hint">Sınıf adını yazıp hızlıca ekleyin.</span>
          <form className="principal-add-class-form" onSubmit={handleAddClass}>
            <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Örn: 11" />
            <button className="primary-action" type="submit">
              Ekle
            </button>
          </form>
        </article>

        {orderedClasses.map((item) => (
          <article
            key={item.id}
            className="sa-inst-card principal-class-card principal-class-card-slot principal-class-card-btn"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/dashboard/classes/${item.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/dashboard/classes/${item.id}`);
              }
            }}
          >
            <button
              type="button"
              className="ghost-action danger principal-class-card-delete"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteClass(item);
              }}
              title="Sınıfı sil"
              aria-label={`${item.name} sınıfını sil`}
            >
              <Trash2 size={14} />
            </button>
            <div className="sa-inst-card-band" />
            <div className="principal-class-card-title-block">
              <div className="principal-class-card-title-icon" aria-hidden>
                <Building2 size={20} strokeWidth={1.75} />
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
          </article>
        ))}
      </div>

      {orderedClasses.length === 0 ? (
        <p className="principal-classes-empty">{classes.length === 0 ? "Henüz sınıf oluşturulmadı." : "Filtrelere uyan sınıf bulunamadı."}</p>
      ) : null}
    </section>
  );
}

function compareClasses(
  a: SchoolClass,
  b: SchoolClass,
  sort: string,
  sectionCountByClass: Map<string, number>,
  studentCountByClass: Map<string, number>
) {
  if (sort === "newest") {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
  if (sort === "oldest") {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  if (sort === "students_desc") {
    return (studentCountByClass.get(b.id) ?? 0) - (studentCountByClass.get(a.id) ?? 0) || compareGradeLikeNames(a.name, b.name, "desc");
  }
  if (sort === "sections_desc") {
    return (sectionCountByClass.get(b.id) ?? 0) - (sectionCountByClass.get(a.id) ?? 0) || compareGradeLikeNames(a.name, b.name, "desc");
  }
  return compareGradeLikeNames(a.name, b.name, sort === "grade_asc" ? "asc" : "desc");
}

function compareGradeLikeNames(a: string, b: string, direction: "asc" | "desc") {
  const aNumber = extractClassNumber(a);
  const bNumber = extractClassNumber(b);
  if (aNumber !== null && bNumber !== null && aNumber !== bNumber) {
    return direction === "asc" ? aNumber - bNumber : bNumber - aNumber;
  }
  if (aNumber !== null && bNumber === null) {
    return -1;
  }
  if (aNumber === null && bNumber !== null) {
    return 1;
  }
  return direction === "asc" ? a.localeCompare(b, "tr") : b.localeCompare(a, "tr");
}

function extractClassNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}
