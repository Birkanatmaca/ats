import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";

export function AssignStudentsModal({
  open,
  targetSectionId,
  classes,
  sections,
  students,
  onClose,
  onAssign
}: {
  open: boolean;
  targetSectionId: string;
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onClose: () => void;
  onAssign: (studentIds: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const classNameById = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);
  const sectionLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of sections) {
      map.set(section.id, `${classNameById.get(section.classId) ?? "—"} / ${section.name}`);
    }
    return map;
  }, [classNameById, sections]);

  const availableStudents = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return students
      .filter((student) => student.sectionId !== targetSectionId)
      .filter((student) => {
        if (!q) {
          return true;
        }
        const blob = `${student.schoolNumber} ${student.firstName} ${student.lastName} ${student.guardianName} ${
          sectionLabelById.get(student.sectionId) ?? ""
        }`.toLocaleLowerCase("tr-TR");
        return blob.includes(q);
      })
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr"));
  }, [search, sectionLabelById, students, targetSectionId]);

  function close() {
    setSearch("");
    setSelectedIds([]);
    onClose();
  }

  function toggleStudent(studentId: string) {
    setSelectedIds((current) => (current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]));
  }

  function assignSelected() {
    if (selectedIds.length === 0) {
      return;
    }
    onAssign(selectedIds);
    close();
  }

  if (!open) {
    return null;
  }

  return (
    <div className="principal-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="principal-modal principal-assign-students-modal" role="dialog" aria-modal="true" aria-labelledby="assign-students-title">
        <header className="principal-modal-head">
          <h2 id="assign-students-title">Öğrenci aktar</h2>
          <button className="principal-modal-close" type="button" onClick={close} aria-label="Kapat">
            <X size={20} />
          </button>
        </header>

        <div className="principal-modal-body">
          <label className="principal-section-students-modal-search">
            <Search size={15} aria-hidden />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, okul no, veli veya mevcut şube ara..." type="search" />
          </label>

          <div className="principal-assign-list">
            {availableStudents.length === 0 ? (
              <p className="empty-text">Aktarılabilecek öğrenci yok. Önce Öğrenciler sayfasından öğrenci oluşturun.</p>
            ) : (
              availableStudents.map((student) => (
                <label className="principal-assign-row" key={student.id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <small>
                      {student.schoolNumber} · {sectionLabelById.get(student.sectionId) ?? classNameById.get(student.classId) ?? "Atanmadı"}
                    </small>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <footer className="principal-modal-foot">
          <button className="ghost-action" type="button" onClick={close}>
            Vazgeç
          </button>
          <button className="primary-action" type="button" onClick={assignSelected} disabled={selectedIds.length === 0}>
            {selectedIds.length > 0 ? `${selectedIds.length} öğrenciyi aktar` : "Aktar"}
          </button>
        </footer>
      </div>
    </div>
  );
}
