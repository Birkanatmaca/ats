import { ArrowLeft, BookOpen, ChevronRight, GraduationCap, LayoutGrid, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";
import "./PrincipalClassesPage.css";

type EcosystemStats = {
  classes: number;
  sections: number;
  students: number;
  teachers: number;
};

type View = { kind: "school" } | { kind: "class"; classId: string };

const GRADE_TONES: Record<number, { label: string; color: string; bg: string; badge: string }> = {
  9:  { label: "9",  color: "#7c3aed", bg: "#faf5ff", badge: "#ede9fe" },
  10: { label: "10", color: "#2563eb", bg: "#eff6ff", badge: "#dbeafe" },
  11: { label: "11", color: "#0d9488", bg: "#f0fdfa", badge: "#ccfbf1" },
  12: { label: "12", color: "#d97706", bg: "#fffbeb", badge: "#fef3c7" },
};
const DEFAULT_TONE = { color: "#475569", bg: "#f8fafc", badge: "#e2e8f0" };

function getTone(name: string) {
  const match = name.match(/\d+/);
  const n = match ? Number(match[0]) : null;
  return n !== null && GRADE_TONES[n] ? GRADE_TONES[n] : DEFAULT_TONE;
}

function sortClasses(a: SchoolClass, b: SchoolClass) {
  const an = a.name.match(/\d+/);
  const bn = b.name.match(/\d+/);
  if (an && bn) return Number(an[0]) - Number(bn[0]);
  return a.name.localeCompare(b.name, "tr");
}

export function PrincipalClassesPage({
  schoolName,
  stats,
  classes,
  sections,
  students,
  onAddClass,
  onDeleteClass,
}: {
  schoolName: string;
  stats?: EcosystemStats;
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onAddClass: (payload: { name: string }) => void;
  onDeleteClass: (classId: string) => void;
}) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>({ kind: "school" });
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const sectionsByClass = useMemo(() => {
    const map = new Map<string, ClassSection[]>();
    for (const s of sections) {
      const arr = map.get(s.classId) ?? [];
      arr.push(s);
      map.set(s.classId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return map;
  }, [sections]);

  const studentsBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const st of students) map.set(st.sectionId, (map.get(st.sectionId) ?? 0) + 1);
    return map;
  }, [students]);

  const studentsByClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const st of students) map.set(st.classId, (map.get(st.classId) ?? 0) + 1);
    return map;
  }, [students]);

  const q = search.trim().toLocaleLowerCase("tr-TR");

  const filteredClasses = useMemo(() => {
    return [...classes]
      .sort(sortClasses)
      .filter((c) => !q || c.name.toLocaleLowerCase("tr-TR").includes(q));
  }, [classes, q]);

  const ecosystemStats: EcosystemStats = stats ?? {
    classes: classes.length,
    sections: sections.length,
    students: students.length,
    teachers: 0,
  };

  const selectedClass = view.kind === "class"
    ? classes.find((c) => c.id === view.classId) ?? null
    : null;

  const selectedSections = view.kind === "class"
    ? (sectionsByClass.get(view.classId) ?? []).filter(
        (s) => !q || s.name.toLocaleLowerCase("tr-TR").includes(q)
      )
    : [];

  function handleAddClass(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onAddClass({ name });
    setNewName("");
    setAddOpen(false);
  }

  function handleDeleteClass(item: SchoolClass) {
    const sc = (sectionsByClass.get(item.id) ?? []).length;
    const st = studentsByClass.get(item.id) ?? 0;
    let msg = `"${item.name}" sınıfını silmek istediğinize emin misiniz?`;
    if (sc > 0 || st > 0) msg += ` Bu işlem ${sc} şube ve ${st} öğrenci kaydını da kaldırır.`;
    if (!window.confirm(msg)) return;
    if (view.kind === "class" && view.classId === item.id) setView({ kind: "school" });
    onDeleteClass(item.id);
  }

  function openClass(classId: string) {
    setSearch("");
    setView({ kind: "class", classId });
  }

  const isClassView = view.kind === "class" && selectedClass !== null;

  return (
    <section className="clp-page">

      {/* ── Üst şerit ── */}
      <div className="clp-topbar">
        {isClassView ? (
          <button
            type="button"
            className="clp-back"
            onClick={() => { setSearch(""); setView({ kind: "school" }); }}
          >
            <ArrowLeft size={16} />
            <span>Sınıflar</span>
          </button>
        ) : (
          <div className="clp-topbar-title">
            <LayoutGrid size={18} aria-hidden />
            <span>Sınıflar</span>
          </div>
        )}

        <label className="clp-search">
          <Search size={15} aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isClassView ? "Şube ara…" : "Sınıf ara…"}
            type="search"
          />
          {search ? (
            <button type="button" className="clp-search-clear" onClick={() => setSearch("")} aria-label="Temizle">
              <X size={13} />
            </button>
          ) : null}
        </label>

        {!isClassView ? (
          <button
            type="button"
            className="clp-add-btn primary-action"
            onClick={() => setAddOpen((o) => !o)}
          >
            <Plus size={16} />
            Sınıf ekle
          </button>
        ) : (
          <button
            type="button"
            className="clp-add-btn primary-action"
            onClick={() => navigate(`/dashboard/classes/${selectedClass!.id}`)}
          >
            <Plus size={16} />
            Şube ekle
          </button>
        )}
      </div>

      {/* ── Yeni sınıf formu ── */}
      {addOpen && !isClassView ? (
        <form className="clp-add-form" onSubmit={handleAddClass}>
          <label className="clp-add-form-label">Sınıf adı</label>
          <div className="clp-add-form-row">
            <input
              className="clp-add-form-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Örn: 9, 10A, 11-Fen…"
              autoFocus
            />
            <button className="primary-action" type="submit">Ekle</button>
            <button className="ghost-action" type="button" onClick={() => setAddOpen(false)}>Vazgeç</button>
          </div>
        </form>
      ) : null}

      {/* ══════════════════════════════════
           OKUL GÖRÜNÜMÜ
      ══════════════════════════════════ */}
      {!isClassView ? (
        <>
          {/* Hero */}
          <div className="clp-hero">
            <div className="clp-hero-left">
              <div className="clp-hero-icon" aria-hidden>
                <BookOpen size={22} strokeWidth={1.7} />
              </div>
              <div>
                <h1 className="clp-hero-name">{schoolName}</h1>
                <p className="clp-hero-sub">Sınıf ve şube yönetimi</p>
              </div>
            </div>
            <div className="clp-hero-stats">
              <div className="clp-hero-stat">
                <strong>{ecosystemStats.classes}</strong>
                <span>Sınıf</span>
              </div>
              <div className="clp-hero-stat">
                <strong>{ecosystemStats.sections}</strong>
                <span>Şube</span>
              </div>
              <div className="clp-hero-stat">
                <strong>{ecosystemStats.students}</strong>
                <span>Öğrenci</span>
              </div>
            </div>
          </div>

          {/* Sınıf kartları */}
          {filteredClasses.length === 0 ? (
            <div className="clp-empty">
              {classes.length === 0
                ? <>
                    <GraduationCap size={32} strokeWidth={1.4} />
                    <strong>Henüz sınıf oluşturulmadı</strong>
                    <p>Okul yapınızı oluşturmaya başlamak için ilk sınıfı ekleyin.</p>
                    <button type="button" className="primary-action" onClick={() => setAddOpen(true)}>
                      <Plus size={15} /> İlk sınıfı ekle
                    </button>
                  </>
                : <>
                    <Search size={28} strokeWidth={1.4} />
                    <strong>Sonuç bulunamadı</strong>
                    <p>"{search}" araması için eşleşen sınıf yok.</p>
                  </>}
            </div>
          ) : (
            <div className="clp-class-grid">
              {filteredClasses.map((cls, i) => {
                const tone = getTone(cls.name);
                const sc = (sectionsByClass.get(cls.id) ?? []).length;
                const st = studentsByClass.get(cls.id) ?? 0;
                return (
                  <article
                    key={cls.id}
                    className="clp-class-card"
                    style={{
                      "--clp-tone": tone.color,
                      "--clp-tone-bg": tone.bg,
                      "--clp-tone-badge": tone.badge,
                      animationDelay: `${i * 40}ms`,
                    } as React.CSSProperties}
                  >
                    <div className="clp-class-card-accent" aria-hidden />

                    <button
                      type="button"
                      className="ghost-action danger clp-class-card-del"
                      onClick={() => handleDeleteClass(cls)}
                      title={`${cls.name} sınıfını sil`}
                    >
                      <Trash2 size={13} />
                    </button>

                    <div className="clp-class-card-grade" aria-hidden>
                      {cls.name}
                    </div>

                    <div className="clp-class-card-body">
                      <p className="clp-class-card-label">Sınıf</p>

                      <div className="clp-class-card-chips">
                        <span className="clp-chip">
                          <GraduationCap size={11} aria-hidden />
                          {sc} şube
                        </span>
                        <span className="clp-chip">
                          <UsersRound size={11} aria-hidden />
                          {st} öğrenci
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="clp-class-card-open"
                      onClick={() => openClass(cls.id)}
                    >
                      Şubeleri gör
                      <ChevronRight size={14} aria-hidden />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {/* ══════════════════════════════════
           SINIF / ŞUBE GÖRÜNÜMÜ
      ══════════════════════════════════ */}
      {isClassView ? (
        <>
          {/* Sınıf hero */}
          {(() => {
            const tone = getTone(selectedClass!.name);
            const sc = (sectionsByClass.get(selectedClass!.id) ?? []).length;
            const st = studentsByClass.get(selectedClass!.id) ?? 0;
            return (
              <div
                className="clp-class-hero"
                style={{ "--clp-tone": tone.color, "--clp-tone-bg": tone.bg } as React.CSSProperties}
              >
                <div className="clp-class-hero-grade">{selectedClass!.name}</div>
                <div className="clp-class-hero-info">
                  <h2>{selectedClass!.name}. Sınıf</h2>
                  <div className="clp-class-hero-chips">
                    <span className="clp-chip"><GraduationCap size={11} />{sc} şube</span>
                    <span className="clp-chip"><UsersRound size={11} />{st} öğrenci</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Şube kartları */}
          {selectedSections.length === 0 ? (
            <div className="clp-empty">
              {(sectionsByClass.get(selectedClass!.id) ?? []).length === 0
                ? <>
                    <GraduationCap size={30} strokeWidth={1.4} />
                    <strong>Bu sınıfta şube yok</strong>
                    <p>Şube ekleyerek sınıfı tamamlayın.</p>
                    <button
                      type="button"
                      className="primary-action"
                      onClick={() => navigate(`/dashboard/classes/${selectedClass!.id}`)}
                    >
                      <Plus size={15} /> İlk şubeyi ekle
                    </button>
                  </>
                : <>
                    <Search size={26} strokeWidth={1.4} />
                    <strong>Sonuç bulunamadı</strong>
                    <p>"{search}" araması için eşleşen şube yok.</p>
                  </>}
            </div>
          ) : (
            <div className="clp-section-grid">
              {selectedSections.map((sec, i) => {
                const tone = getTone(selectedClass!.name);
                const st = studentsBySection.get(sec.id) ?? 0;
                return (
                  <article
                    key={sec.id}
                    className="clp-section-card"
                    style={{
                      "--clp-tone": tone.color,
                      "--clp-tone-bg": tone.bg,
                      "--clp-tone-badge": tone.badge,
                      animationDelay: `${i * 50}ms`,
                    } as React.CSSProperties}
                  >
                    <div className="clp-section-card-name">{sec.name}</div>
                    <div className="clp-section-card-stats">
                      <div className="clp-section-stat">
                        <UsersRound size={13} aria-hidden />
                        <div>
                          <strong>{st}</strong>
                          <span>Öğrenci</span>
                        </div>
                      </div>
                      {sec.capacity > 0 ? (
                        <div className="clp-section-stat">
                          <LayoutGrid size={13} aria-hidden />
                          <div>
                            <strong>{sec.capacity}</strong>
                            <span>Kapasite</span>
                          </div>
                        </div>
                      ) : null}
                      {sec.advisor ? (
                        <div className="clp-section-stat clp-section-stat--wide">
                          <GraduationCap size={13} aria-hidden />
                          <div>
                            <strong>{sec.advisor}</strong>
                            <span>Sınıf Danışmanı</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {st > 0 && sec.capacity > 0 ? (
                      <div className="clp-section-progress" aria-label={`Doluluk: ${st} / ${sec.capacity}`}>
                        <div
                          className="clp-section-progress-fill"
                          style={{ width: `${Math.min(100, Math.round((st / sec.capacity) * 100))}%` }}
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="clp-section-open"
                      onClick={() => navigate(`/dashboard/classes/${selectedClass!.id}/${sec.id}`)}
                    >
                      Öğrencileri gör
                      <ChevronRight size={14} aria-hidden />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
