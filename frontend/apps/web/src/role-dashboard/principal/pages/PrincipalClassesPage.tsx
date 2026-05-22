import { ArrowLeft, Building2, GraduationCap, GripHorizontal, Layers, Plus, Search, Sparkles, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";
import "./PrincipalClassesPage.css";

type EcosystemStats = {
  classes: number;
  sections: number;
  students: number;
  teachers: number;
};

type OrbitView = "school" | "class";
type Vec2 = { x: number; y: number };
type EcosystemLayout = { center: Vec2; nodes: Record<string, Vec2> };

type OrbitItem =
  | { kind: "class"; id: string; data: SchoolClass }
  | { kind: "section"; id: string; data: ClassSection };

const DRAG_CLICK_THRESHOLD = 6;

export function PrincipalClassesPage({
  schoolName,
  stats,
  classes,
  sections,
  students,
  onAddClass,
  onDeleteClass
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
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ target: "center" | string; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const [className, setClassName] = useState("");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<OrbitView>("school");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<Record<string, EcosystemLayout>>(() => readStoredLayouts(schoolName));
  const [draggingTarget, setDraggingTarget] = useState<"center" | string | null>(null);

  const layoutScope = view === "school" ? "school" : `class-${selectedClassId ?? "unknown"}`;

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

  const studentCountBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students) {
      map.set(student.sectionId, (map.get(student.sectionId) ?? 0) + 1);
    }
    return map;
  }, [students]);

  const sectionsByClass = useMemo(() => {
    const map = new Map<string, ClassSection[]>();
    for (const section of sections) {
      const list = map.get(section.classId) ?? [];
      list.push(section);
      map.set(section.classId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    }
    return map;
  }, [sections]);

  const orderedClasses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
    return [...classes]
      .filter((item) => {
        if (!normalizedSearch) {
          return true;
        }
        const classMatch = item.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch);
        const sectionMatch = (sectionsByClass.get(item.id) ?? []).some((section) =>
          section.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch)
        );
        return classMatch || sectionMatch;
      })
      .sort((a, b) => compareGradeLikeNames(a.name, b.name, "asc"));
  }, [classes, search, sectionsByClass]);

  const selectedClass = selectedClassId ? classes.find((item) => item.id === selectedClassId) ?? null : null;

  const classSections = useMemo(() => {
    if (!selectedClassId) {
      return [];
    }
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
    return (sectionsByClass.get(selectedClassId) ?? []).filter((section) => {
      if (!normalizedSearch) {
        return true;
      }
      return (
        section.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch) ||
        (selectedClass?.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch) ?? false)
      );
    });
  }, [selectedClassId, sectionsByClass, search, selectedClass?.name]);

  const orbitItems: OrbitItem[] =
    view === "school"
      ? orderedClasses.map((item) => ({ kind: "class", id: item.id, data: item }))
      : classSections.map((item) => ({ kind: "section", id: item.id, data: item }));

  const orbitRadius = computeOrbitRadius(orbitItems.length);
  const activeLayout = layouts[layoutScope] ?? { center: { x: 0, y: 0 }, nodes: {} };

  const resolvedPositions = useMemo(() => {
    const nodes: Record<string, Vec2> = {};
    orbitItems.forEach((item, index) => {
      nodes[item.id] = activeLayout.nodes[item.id] ?? radialOffset(index, orbitItems.length, orbitRadius);
    });
    return nodes;
  }, [activeLayout.nodes, orbitItems, orbitRadius]);

  const centerPosition = activeLayout.center;
  const stageSize = computeStageSize(centerPosition, Object.values(resolvedPositions));

  useEffect(() => {
    writeStoredLayouts(schoolName, layouts);
  }, [layouts, schoolName]);

  const getStagePoint = useCallback((clientX: number, clientY: number): Vec2 => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + rect.height / 2)
    };
  }, []);

  const patchLayout = useCallback(
    (scope: string, patch: Partial<EcosystemLayout> | ((current: EcosystemLayout) => EcosystemLayout)) => {
      setLayouts((current) => {
        const base = current[scope] ?? { center: { x: 0, y: 0 }, nodes: {} };
        const next = typeof patch === "function" ? patch(base) : { ...base, ...patch, nodes: { ...base.nodes, ...(patch.nodes ?? {}) } };
        return { ...current, [scope]: next };
      });
    },
    []
  );

  const beginDrag = useCallback(
    (event: ReactPointerEvent, target: "center" | string, current: Vec2) => {
      event.preventDefault();
      event.stopPropagation();
      const point = getStagePoint(event.clientX, event.clientY);
      dragRef.current = {
        target,
        offsetX: point.x - current.x,
        offsetY: point.y - current.y,
        moved: false
      };
      setDraggingTarget(target);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [getStagePoint]
  );

  const onDragMove = useCallback(
    (event: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const point = getStagePoint(event.clientX, event.clientY);
      const next = { x: point.x - drag.offsetX, y: point.y - drag.offsetY };
      if (!drag.moved) {
        const current = drag.target === "center" ? centerPosition : resolvedPositions[drag.target];
        if (current && Math.hypot(next.x - current.x, next.y - current.y) > DRAG_CLICK_THRESHOLD) {
          drag.moved = true;
        }
      }
      if (drag.target === "center") {
        patchLayout(layoutScope, { center: next });
        return;
      }
      patchLayout(layoutScope, { nodes: { [drag.target]: next } });
    },
    [centerPosition, getStagePoint, layoutScope, patchLayout, resolvedPositions]
  );

  const endDrag = useCallback((event: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    if (drag.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragRef.current = null;
    setDraggingTarget(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const ecosystemStats: EcosystemStats = stats ?? {
    classes: classes.length,
    sections: sections.length,
    students: students.length,
    teachers: 0
  };

  function handleAddClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = className.trim();
    if (!name) {
      return;
    }
    onAddClass({ name });
    setClassName("");
    setAddOpen(false);
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
    if (selectedClassId === item.id) {
      setView("school");
      setSelectedClassId(null);
    }
    onDeleteClass(item.id);
  }

  function openClassView(classId: string) {
    if (suppressClickRef.current) {
      return;
    }
    setSelectedClassId(classId);
    setView("class");
  }

  function openSection(classId: string, sectionId: string) {
    if (suppressClickRef.current) {
      return;
    }
    navigate(`/dashboard/classes/${classId}/${sectionId}`);
  }

  function backToSchool() {
    setView("school");
    setSelectedClassId(null);
  }

  function matchesSearch(value: string) {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
    if (!normalizedSearch) {
      return true;
    }
    return value.toLocaleLowerCase("tr-TR").includes(normalizedSearch);
  }

  const maxOrbitDistance = Math.max(
    orbitRadius,
    ...Object.values(resolvedPositions).map((pos) => Math.hypot(pos.x - centerPosition.x, pos.y - centerPosition.y))
  );

  return (
    <section className="principal-page-stack school-ecosystem-page">
      <div className="school-ecosystem-shell">
        <div className="school-ecosystem-toolbar">
          <label className="school-ecosystem-search">
            <Search size={16} aria-hidden />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sınıf veya şube ara…" type="search" />
          </label>
          {view === "school" ? (
            <button className="ghost-action school-ecosystem-add-toggle" type="button" onClick={() => setAddOpen((open) => !open)}>
              <Plus size={16} />
              Yeni sınıf
            </button>
          ) : selectedClass ? (
            <button className="ghost-action school-ecosystem-add-toggle" type="button" onClick={() => navigate(`/dashboard/classes/${selectedClass.id}`)}>
              <Plus size={16} />
              Şube yönet
            </button>
          ) : null}
        </div>

        {addOpen && view === "school" ? (
          <form className="school-ecosystem-add-panel" onSubmit={handleAddClass}>
            <strong>Yeni sınıf ekle</strong>
            <div className="school-ecosystem-add-row">
              <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Örn: 11" autoFocus />
              <button className="primary-action" type="submit">
                Ekle
              </button>
              <button className="ghost-action" type="button" onClick={() => setAddOpen(false)}>
                Vazgeç
              </button>
            </div>
          </form>
        ) : null}

        <div className={`school-ecosystem-canvas${draggingTarget ? " is-dragging" : ""}`} aria-label="Okul ekosistemi akış haritası">
          {view === "class" ? (
            <button className="school-ecosystem-back" type="button" onClick={backToSchool} aria-label="Okula dön">
              <ArrowLeft size={15} />
              <span>Geri</span>
            </button>
          ) : null}

          <p className="school-ecosystem-hint">
            <GripHorizontal size={14} aria-hidden />
            Kartları sürükleyerek düzenleyin
          </p>

          <div className="school-ecosystem-glow school-ecosystem-glow--left" aria-hidden />
          <div className="school-ecosystem-glow school-ecosystem-glow--right" aria-hidden />

          <div className={`school-ecosystem-orbit-view school-ecosystem-orbit-view--${view}`}>
            {view === "school" && orderedClasses.length === 0 ? (
              <div className="school-ecosystem-empty">
                <article className="school-ecosystem-root-node school-ecosystem-root-node--solo">
                  <span className="school-ecosystem-root-badge">
                    <Sparkles size={14} aria-hidden />
                    Okul ekosistemi
                  </span>
                  <div className="school-ecosystem-root-icon" aria-hidden>
                    <Building2 size={28} strokeWidth={1.6} />
                  </div>
                  <h1>{schoolName}</h1>
                  <p>{classes.length === 0 ? "Henüz sınıf oluşturulmadı." : "Aramanıza uyan sınıf bulunamadı."}</p>
                </article>
                {classes.length === 0 ? (
                  <button className="primary-action" type="button" onClick={() => setAddOpen(true)}>
                    <Plus size={16} />
                    İlk sınıfı ekle
                  </button>
                ) : null}
              </div>
            ) : (
              <div ref={stageRef} className="school-ecosystem-orbit-stage" style={{ width: stageSize, height: stageSize }}>
                <svg className="school-ecosystem-orbit-lines" aria-hidden viewBox={`${-stageSize / 2} ${-stageSize / 2} ${stageSize} ${stageSize}`}>
                  <defs>
                    <linearGradient id="eco-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0891b2" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#64748b" stopOpacity="0.75" />
                    </linearGradient>
                  </defs>
                  <circle className="school-ecosystem-orbit-ring" cx={centerPosition.x} cy={centerPosition.y} r={maxOrbitDistance} />
                  {orbitItems.map((item) => {
                    const pos = resolvedPositions[item.id];
                    return (
                      <g key={`link-${item.id}`}>
                        <line
                          className="school-ecosystem-orbit-line school-ecosystem-orbit-line--glow"
                          x1={centerPosition.x}
                          y1={centerPosition.y}
                          x2={pos.x}
                          y2={pos.y}
                        />
                        <line
                          className="school-ecosystem-orbit-line"
                          x1={centerPosition.x}
                          y1={centerPosition.y}
                          x2={pos.x}
                          y2={pos.y}
                        />
                      </g>
                    );
                  })}
                </svg>

                <div
                  className={`school-ecosystem-orbit-center school-ecosystem-draggable${draggingTarget === "center" ? " is-dragging" : ""}`}
                  style={{ transform: `translate(calc(-50% + ${centerPosition.x}px), calc(-50% + ${centerPosition.y}px))` }}
                  onPointerDown={(event) => beginDrag(event, "center", centerPosition)}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  {view === "school" ? (
                    <article className="school-ecosystem-root-node">
                      <span className="school-ecosystem-drag-handle" aria-hidden>
                        <GripHorizontal size={14} />
                      </span>
                      <span className="school-ecosystem-root-badge">
                        <Sparkles size={14} aria-hidden />
                        Okul
                      </span>
                      <div className="school-ecosystem-root-icon" aria-hidden>
                        <Building2 size={26} strokeWidth={1.6} />
                      </div>
                      <h1>{schoolName}</h1>
                      <p>Tüm sınıflar bu merkeze bağlı</p>
                      <div className="school-ecosystem-root-stats">
                        <span>
                          <Layers size={13} />
                          {ecosystemStats.classes} sınıf
                        </span>
                        <span>
                          <GraduationCap size={13} />
                          {ecosystemStats.sections} şube
                        </span>
                        <span>
                          <UsersRound size={13} />
                          {ecosystemStats.students} öğrenci
                        </span>
                      </div>
                    </article>
                  ) : selectedClass ? (
                    <article className={`school-ecosystem-class-node school-ecosystem-class-node--center school-ecosystem-class-node--${classToneFromName(selectedClass.name)}`}>
                      <span className="school-ecosystem-drag-handle" aria-hidden>
                        <GripHorizontal size={14} />
                      </span>
                      <button
                        type="button"
                        className="ghost-action danger school-ecosystem-class-delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteClass(selectedClass);
                        }}
                        title="Sınıfı sil"
                        aria-label={`${selectedClass.name} sınıfını sil`}
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="school-ecosystem-class-label">Sınıf</span>
                      <strong>{selectedClass.name}</strong>
                      <div className="school-ecosystem-class-meta">
                        <span>{sectionCountByClass.get(selectedClass.id) ?? 0} şube</span>
                        <span>{studentCountByClass.get(selectedClass.id) ?? 0} öğrenci</span>
                      </div>
                      <button
                        className="ghost-action school-ecosystem-center-link"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/dashboard/classes/${selectedClass.id}`);
                        }}
                      >
                        Şube ve detay yönetimi
                      </button>
                    </article>
                  ) : null}
                </div>

                {orbitItems.map((item) => {
                  const pos = resolvedPositions[item.id];
                  const isDragging = draggingTarget === item.id;
                  const style = {
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`
                  };

                  if (item.kind === "class") {
                    const schoolClass = item.data;
                    const tone = classToneFromName(schoolClass.name);
                    const classDimmed =
                      search.trim() !== "" &&
                      !matchesSearch(schoolClass.name) &&
                      !(sectionsByClass.get(schoolClass.id) ?? []).some((section) => matchesSearch(section.name));

                    return (
                      <div
                        key={schoolClass.id}
                        className={`school-ecosystem-orbit-satellite school-ecosystem-draggable${classDimmed ? " is-dimmed" : ""}${isDragging ? " is-dragging" : ""}`}
                        style={style}
                        onPointerDown={(event) => beginDrag(event, schoolClass.id, pos)}
                        onPointerMove={onDragMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                      >
                        <button
                          type="button"
                          className={`school-ecosystem-class-node school-ecosystem-class-node--satellite school-ecosystem-class-node--${tone}`}
                          onClick={() => openClassView(schoolClass.id)}
                        >
                          <span className="school-ecosystem-drag-handle" aria-hidden>
                            <GripHorizontal size={13} />
                          </span>
                          <span className="school-ecosystem-class-label">Sınıf</span>
                          <strong>{schoolClass.name}</strong>
                          <div className="school-ecosystem-class-meta">
                            <span>{sectionCountByClass.get(schoolClass.id) ?? 0} şube</span>
                            <span>{studentCountByClass.get(schoolClass.id) ?? 0} öğrenci</span>
                          </div>
                        </button>
                      </div>
                    );
                  }

                  const section = item.data;
                  const tone = selectedClass ? classToneFromName(selectedClass.name) : "slate";
                  return (
                    <div
                      key={section.id}
                      className={`school-ecosystem-orbit-satellite school-ecosystem-draggable${isDragging ? " is-dragging" : ""}`}
                      style={style}
                      onPointerDown={(event) => beginDrag(event, section.id, pos)}
                      onPointerMove={onDragMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    >
                      <button
                        type="button"
                        className={`school-ecosystem-section-node school-ecosystem-section-node--satellite school-ecosystem-section-node--${tone}`}
                        onClick={() => selectedClassId && openSection(selectedClassId, section.id)}
                      >
                        <span className="school-ecosystem-drag-handle" aria-hidden>
                          <GripHorizontal size={12} />
                        </span>
                        <span className="school-ecosystem-section-name">{section.name}</span>
                        <span className="school-ecosystem-section-detail">
                          {studentCountBySection.get(section.id) ?? 0} öğrenci
                          {section.advisor ? ` · ${section.advisor}` : ""}
                        </span>
                      </button>
                    </div>
                  );
                })}

                {view === "class" && selectedClass && classSections.length === 0 ? (
                  <div className="school-ecosystem-orbit-empty-hint">
                    <p>{sectionsByClass.get(selectedClass.id)?.length === 0 ? "Bu sınıfa henüz şube eklenmedi." : "Aramanıza uyan şube yok."}</p>
                    {sectionsByClass.get(selectedClass.id)?.length === 0 ? (
                      <button className="primary-action small-action" type="button" onClick={() => navigate(`/dashboard/classes/${selectedClass.id}`)}>
                        <Plus size={14} />
                        İlk şubeyi ekle
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function radialOffset(index: number, total: number, radius: number) {
  if (total === 0) {
    return { x: 0, y: 0 };
  }
  const angle = (360 / total) * index - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius
  };
}

function computeOrbitRadius(count: number) {
  if (count === 0) {
    return 0;
  }
  if (count === 1) {
    return 150;
  }
  if (count <= 3) {
    return 168;
  }
  if (count <= 6) {
    return 198;
  }
  return Math.min(248, 168 + count * 10);
}

function computeStageSize(center: Vec2, positions: Vec2[]) {
  const nodePadding = 120;
  let maxExtent = 0;
  for (const pos of positions) {
    maxExtent = Math.max(maxExtent, Math.abs(pos.x - center.x), Math.abs(pos.y - center.y));
  }
  maxExtent = Math.max(maxExtent, 150);
  return Math.max(380, (maxExtent + nodePadding) * 2);
}

function readStoredLayouts(schoolName: string): Record<string, EcosystemLayout> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(storageKey(schoolName));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, EcosystemLayout>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredLayouts(schoolName: string, layouts: Record<string, EcosystemLayout>) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey(schoolName), JSON.stringify(layouts));
  } catch {
    /* ignore quota errors */
  }
}

function storageKey(schoolName: string) {
  return `ots-ecosystem-layout:${schoolName.trim().toLocaleLowerCase("tr-TR")}`;
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

function classToneFromName(name: string): "violet" | "sky" | "teal" | "amber" | "rose" | "slate" {
  const grade = extractClassNumber(name);
  if (grade === 9) {
    return "violet";
  }
  if (grade === 10) {
    return "sky";
  }
  if (grade === 11) {
    return "teal";
  }
  if (grade === 12) {
    return "amber";
  }
  if (grade !== null && grade <= 8) {
    return "rose";
  }
  return "slate";
}
