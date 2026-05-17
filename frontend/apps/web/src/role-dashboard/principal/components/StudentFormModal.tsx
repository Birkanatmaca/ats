import { X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";

export type StudentFormPayload = Omit<ClassStudent, "id" | "createdAt" | "updatedAt">;

export function StudentFormModal({
  open,
  mode,
  classes,
  sections,
  initial,
  existingSchoolNumbers,
  onClose,
  onSubmit
}: {
  open: boolean;
  mode: "create" | "edit";
  classes: SchoolClass[];
  sections: ClassSection[];
  initial: ClassStudent | null;
  existingSchoolNumbers: string[];
  onClose: () => void;
  onSubmit: (payload: StudentFormPayload) => void;
}) {
  const [schoolNumber, setSchoolNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [status, setStatus] = useState<ClassStudent["status"]>("active");
  const [formError, setFormError] = useState<string | null>(null);

  const availableSections = useMemo(() => sections.filter((section) => section.classId === classId), [sections, classId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setFormError(null);
    if (mode === "edit" && initial) {
      setSchoolNumber(initial.schoolNumber);
      setFirstName(initial.firstName);
      setLastName(initial.lastName);
      setClassId(initial.classId);
      setSectionId(initial.sectionId);
      setGender(initial.gender);
      setBirthDate(initial.birthDate);
      setGuardianName(initial.guardianName);
      setGuardianPhone(initial.guardianPhone);
      setStatus(initial.status);
      return;
    }
    const defaultClassId = classes[0]?.id ?? "";
    const defaultSectionId = defaultClassId ? sections.find((section) => section.classId === defaultClassId)?.id ?? "" : "";
    setSchoolNumber("");
    setFirstName("");
    setLastName("");
    setClassId(defaultClassId);
    setSectionId(defaultSectionId);
    setGender("");
    setBirthDate("");
    setGuardianName("");
    setGuardianPhone("");
    setStatus("active");
  }, [open, mode, initial, classes, sections]);

  useEffect(() => {
    if (!classId) {
      setSectionId("");
      return;
    }
    if (!availableSections.some((section) => section.id === sectionId)) {
      setSectionId(availableSections[0]?.id ?? "");
    }
  }, [availableSections, classId, sectionId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const no = schoolNumber.trim();
    const fn = firstName.trim();
    const ln = lastName.trim();
    const guardian = guardianName.trim();
    const phone = guardianPhone.trim();

    if (!no || !fn || !ln) {
      setFormError("Okul no, ad ve soyad zorunludur.");
      return;
    }
    if (!classId || !sectionId) {
      setFormError("Öğrenci için sınıf ve şube seçilmelidir.");
      return;
    }

    const others = existingSchoolNumbers.filter((item) => item !== (initial?.schoolNumber ?? ""));
    if (others.includes(no)) {
      setFormError("Bu okul numarası zaten kullanılıyor.");
      return;
    }

    onSubmit({
      classId,
      sectionId,
      schoolNumber: no,
      firstName: fn,
      lastName: ln,
      gender: gender.trim(),
      birthDate: birthDate.trim(),
      guardianName: guardian,
      guardianPhone: phone,
      status
    });
  }

  if (!open) {
    return null;
  }

  const hasSections = sections.length > 0;

  return (
    <div className="principal-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="principal-modal principal-student-form-modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
        <form onSubmit={handleSubmit}>
          <header className="principal-modal-head">
            <h2 id="student-modal-title">{mode === "create" ? "Öğrenci ekle" : "Öğrenciyi düzenle"}</h2>
            <button className="principal-modal-close" type="button" onClick={onClose} aria-label="Kapat">
              <X size={20} />
            </button>
          </header>

          <div className="principal-modal-body principal-student-form-body">
            {formError ? <div className="form-error principal-modal-error">{formError}</div> : null}
            {!hasSections ? <div className="form-error principal-modal-error">Öğrenci eklemek için önce sınıf ve şube oluşturmalısınız.</div> : null}

            <div className="principal-student-form-grid">
              <label className="principal-field">
                <span>Okul no</span>
                <input value={schoolNumber} onChange={(event) => setSchoolNumber(event.target.value)} required />
              </label>
              <label className="principal-field">
                <span>Durum</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as ClassStudent["status"])}>
                  <option value="active">Aktif</option>
                  <option value="passive">Pasif</option>
                </select>
              </label>
              <label className="principal-field">
                <span>Ad</span>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required />
              </label>
              <label className="principal-field">
                <span>Soyad</span>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required />
              </label>
              <label className="principal-field">
                <span>Sınıf</span>
                <select value={classId} onChange={(event) => setClassId(event.target.value)} disabled={!hasSections} required>
                  {classes.length === 0 ? <option value="">Sınıf yok</option> : null}
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="principal-field">
                <span>Şube</span>
                <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} disabled={!classId || availableSections.length === 0} required>
                  {availableSections.length === 0 ? <option value="">Şube yok</option> : null}
                  {availableSections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="principal-field">
                <span>Cinsiyet</span>
                <input value={gender} onChange={(event) => setGender(event.target.value)} placeholder="Opsiyonel" />
              </label>
              <label className="principal-field">
                <span>Doğum tarihi</span>
                <input value={birthDate} onChange={(event) => setBirthDate(event.target.value)} type="date" />
              </label>
              <label className="principal-field">
                <span>Veli adı</span>
                <input value={guardianName} onChange={(event) => setGuardianName(event.target.value)} />
              </label>
              <label className="principal-field">
                <span>Veli telefonu</span>
                <input value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} inputMode="tel" />
              </label>
            </div>
          </div>

          <footer className="principal-modal-foot">
            <button className="ghost-action" type="button" onClick={onClose}>
              Vazgeç
            </button>
            <button className="primary-action" type="submit" disabled={!hasSections}>
              {mode === "create" ? "Kaydet" : "Güncelle"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
