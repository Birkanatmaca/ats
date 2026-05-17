import { X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { PrincipalManagedTeacher } from "../types";

export type SectionFormPayload = {
  name: string;
  gradeLevel: string;
  advisor: string;
  capacity: number;
};

export function SectionFormModal({
  open,
  teachers,
  onClose,
  onSubmit
}: {
  open: boolean;
  teachers: PrincipalManagedTeacher[];
  onClose: () => void;
  onSubmit: (payload: SectionFormPayload) => void;
}) {
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [capacity, setCapacity] = useState("30");
  const [formError, setFormError] = useState<string | null>(null);

  const teacherOptions = useMemo(
    () =>
      [...teachers].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr")
      ),
    [teachers]
  );

  function reset() {
    setName("");
    setGradeLevel("");
    setAdvisor("");
    setCapacity("30");
    setFormError(null);
  }

  function close() {
    reset();
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const sectionName = name.trim();
    const parsedCapacity = Number(capacity);
    if (!sectionName) {
      setFormError("Şube adı zorunludur.");
      return;
    }
    if (Number.isNaN(parsedCapacity) || parsedCapacity < 0 || parsedCapacity > 80) {
      setFormError("Kontenjan 0-80 arasında olmalıdır.");
      return;
    }

    onSubmit({
      name: sectionName,
      gradeLevel: gradeLevel.trim(),
      advisor,
      capacity: parsedCapacity
    });
    reset();
  }

  if (!open) {
    return null;
  }

  return (
    <div className="principal-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="principal-modal principal-section-form-modal" role="dialog" aria-modal="true" aria-labelledby="section-modal-title">
        <form onSubmit={handleSubmit}>
          <header className="principal-modal-head">
            <h2 id="section-modal-title">Şube ekle</h2>
            <button className="principal-modal-close" type="button" onClick={close} aria-label="Kapat">
              <X size={20} />
            </button>
          </header>

          <div className="principal-modal-body">
            {formError ? <div className="form-error principal-modal-error">{formError}</div> : null}
            <div className="principal-section-form-grid">
              <label className="principal-field">
                <span>Şube adı</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="A, B, Fen-A" required />
              </label>
              <label className="principal-field">
                <span>Kademe</span>
                <input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="Opsiyonel" />
              </label>
              <label className="principal-field">
                <span>Kontenjan</span>
                <input value={capacity} onChange={(event) => setCapacity(event.target.value)} type="number" min={0} max={80} step={1} />
              </label>
              <label className="principal-field">
                <span>Sınıf öğretmeni</span>
                <select value={advisor} onChange={(event) => setAdvisor(event.target.value)}>
                  <option value="">Atanmadı</option>
                  {teacherOptions.map((teacher) => {
                    const fullName = `${teacher.firstName} ${teacher.lastName}`;
                    return (
                      <option key={teacher.id} value={fullName}>
                        {fullName} {teacher.branch ? `- ${teacher.branch}` : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          </div>

          <footer className="principal-modal-foot">
            <button className="ghost-action" type="button" onClick={close}>
              Vazgeç
            </button>
            <button className="primary-action" type="submit">
              Kaydet
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
