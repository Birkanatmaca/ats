import { UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ManagedGuardian } from "../../../lib/api";
import type { ClassStudent } from "../types";

export type GuardianFormPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relation: string;
  studentIds: string[];
};

const emptyForm: GuardianFormPayload = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  relation: "Veli",
  studentIds: []
};

export function GuardianFormModal({
  open,
  mode,
  initial,
  students,
  onClose,
  onSubmit
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: ManagedGuardian | null;
  students: ClassStudent[];
  onClose: () => void;
  onSubmit: (payload: GuardianFormPayload) => Promise<void>;
}) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        firstName: initial.firstName,
        lastName: initial.lastName,
        email: initial.email,
        phone: initial.phone,
        relation: "Veli",
        studentIds: initial.students.map((item) => item.studentId)
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, mode, initial]);

  const activeStudents = useMemo(
    () => students.filter((item) => item.status !== "passive").sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr")),
    [students]
  );

  if (!open) return null;

  const toggleStudent = (studentId: string) => {
    setForm((current) => {
      const exists = current.studentIds.includes(studentId);
      return {
        ...current,
        studentIds: exists ? current.studentIds.filter((id) => id !== studentId) : [...current.studentIds, studentId]
      };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Ad ve soyad zorunludur.");
      return;
    }
    if (mode === "create" && (!form.email.trim() || form.studentIds.length === 0)) {
      setError("E-posta ve en az bir öğrenci seçimi zorunludur.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt tamamlanamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="principal-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="principal-modal principal-guardian-modal" onSubmit={handleSubmit}>
        <header className="principal-modal-head">
          <div className="principal-modal-title">
            <UserRound size={22} />
            <h2 id="guardian-modal-title">{mode === "create" ? "Yeni veli" : "Veli düzenle"}</h2>
          </div>
          <button aria-label="Kapat" className="ghost-action icon-action" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="principal-modal-body">
          <label>
            Ad
            <input onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} required value={form.firstName} />
          </label>
          <label>
            Soyad
            <input onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} required value={form.lastName} />
          </label>
          <label>
            E-posta
            <input
              disabled={mode === "edit"}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required={mode === "create"}
              type="email"
              value={form.email}
            />
          </label>
          <label>
            Telefon
            <input onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} value={form.phone} />
          </label>
          {mode === "create" ? (
            <>
              <label>
                Yakınlık
                <input onChange={(event) => setForm((current) => ({ ...current, relation: event.target.value }))} value={form.relation} />
              </label>
              <div className="principal-guardian-student-picker">
                <span>Öğrenci bağlantıları</span>
                <div className="principal-guardian-student-options">
                  {activeStudents.map((student) => {
                    const active = form.studentIds.includes(student.id);
                    return (
                      <button
                        className={active ? "active" : ""}
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        type="button"
                      >
                        {student.firstName} {student.lastName} · {student.schoolNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
          {error ? <div className="form-error">{error}</div> : null}
        </div>

        <footer className="principal-modal-foot">
          <button className="ghost-action" onClick={onClose} type="button">
            İptal
          </button>
          <button className="primary-action" disabled={loading} type="submit">
            {loading ? "Kaydediliyor…" : mode === "create" ? "Veli oluştur" : "Güncelle"}
          </button>
        </footer>
      </form>
    </div>
  );
}
