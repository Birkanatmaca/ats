import { Link2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ManagedGuardian } from "../../../lib/api";
import type { ClassStudent } from "../types";

export function LinkGuardianStudentModal({
  open,
  guardian,
  students,
  onClose,
  onSubmit
}: {
  open: boolean;
  guardian: ManagedGuardian | null;
  students: ClassStudent[];
  onClose: () => void;
  onSubmit: (payload: { studentId: string; relation: string; isPrimary: boolean }) => Promise<void>;
}) {
  const [studentId, setStudentId] = useState("");
  const [relation, setRelation] = useState("Veli");
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStudentId("");
    setRelation("Veli");
    setIsPrimary(false);
    setError(null);
  }, [open, guardian?.id]);

  const availableStudents = useMemo(() => {
    const linked = new Set(guardian?.students.map((item) => item.studentId) ?? []);
    return students
      .filter((item) => item.status !== "passive" && !linked.has(item.id))
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr"));
  }, [students, guardian]);

  if (!open || !guardian) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!studentId) {
      setError("Öğrenci seçimi zorunludur.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ studentId, relation: relation.trim() || "Veli", isPrimary });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="principal-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="principal-modal principal-guardian-modal" onSubmit={handleSubmit}>
        <header className="principal-modal-head">
          <div className="principal-modal-title">
            <Link2 size={22} />
            <h2>Öğrenci bağla — {guardian.fullName}</h2>
          </div>
          <button aria-label="Kapat" className="ghost-action icon-action" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="principal-modal-body">
          <label>
            Öğrenci
            <select onChange={(event) => setStudentId(event.target.value)} required value={studentId}>
              <option value="">Seçin</option>
              {availableStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName} · {student.schoolNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            Yakınlık
            <input onChange={(event) => setRelation(event.target.value)} value={relation} />
          </label>
          <label className="principal-checkbox-row">
            <input checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} type="checkbox" />
            Birincil veli olarak işaretle
          </label>
          {error ? <div className="form-error">{error}</div> : null}
        </div>

        <footer className="principal-modal-foot">
          <button className="ghost-action" onClick={onClose} type="button">
            İptal
          </button>
          <button className="primary-action" disabled={loading} type="submit">
            {loading ? "Bağlanıyor…" : "Bağla"}
          </button>
        </footer>
      </form>
    </div>
  );
}
