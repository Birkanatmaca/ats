import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { PrincipalManagedTeacher, SchoolClass } from "../types";
import { generateOneTimePassword, normalizeUsername } from "../teacherCredentials";

export type TeacherFormPayload = {
  firstName: string;
  lastName: string;
  branch: string;
  weeklyLessonHours: number;
  classId: string | null;
  username: string;
  /** Yalnızca oluşturma veya şifre sıfırlama sonrası dolu olabilir. */
  password: string;
};

export function TeacherFormModal({
  open,
  mode,
  classes,
  initial,
  existingUsernames,
  onClose,
  onSubmit
}: {
  open: boolean;
  mode: "create" | "edit";
  classes: SchoolClass[];
  initial: PrincipalManagedTeacher | null;
  existingUsernames: string[];
  onClose: () => void;
  onSubmit: (payload: TeacherFormPayload) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [branch, setBranch] = useState("");
  const [weeklyLessonHours, setWeeklyLessonHours] = useState("18");
  const [classId, setClassId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setFormError(null);
    if (mode === "edit" && initial) {
      setFirstName(initial.firstName);
      setLastName(initial.lastName);
      setBranch(initial.branch);
      setWeeklyLessonHours(String(initial.weeklyLessonHours));
      setClassId(initial.classId ?? "");
      setUsername(initial.username);
      setPassword("");
    } else {
      setFirstName("");
      setLastName("");
      setBranch("");
      setWeeklyLessonHours("18");
      setClassId("");
      setUsername("");
      setPassword("");
    }
  }, [open, mode, initial]);

  function handleUsernameBlur() {
    if (mode !== "create") {
      return;
    }
    const user = normalizeUsername(username);
    if (user.length >= 3) {
      setPassword((current) => current || generateOneTimePassword());
    }
  }

  function regeneratePassword() {
    setPassword(generateOneTimePassword());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const br = branch.trim();
    const user = normalizeUsername(username);
    const hours = Number(weeklyLessonHours);
    if (!fn || !ln || !br) {
      setFormError("Ad, soyad ve branş zorunludur.");
      return;
    }
    if (!user || user.length < 3) {
      setFormError("Kullanıcı adı en az 3 karakter olmalıdır.");
      return;
    }
    if (Number.isNaN(hours) || hours < 0 || hours > 60) {
      setFormError("Haftalık ders saati 0–60 arasında olmalıdır.");
      return;
    }
    const others = existingUsernames.filter((item) => item !== (initial?.username ?? ""));
    if (others.includes(user)) {
      setFormError("Bu kullanıcı adı zaten kullanılıyor.");
      return;
    }
    const cid = classId || null;
    let pwd = password;
    if (mode === "create") {
      pwd = pwd || (user.length >= 3 ? generateOneTimePassword() : "");
      if (!pwd) {
        setFormError("Tek kullanımlık şifre oluşturulamadı; kullanıcı adını kontrol edin.");
        return;
      }
    }
    onSubmit({
      firstName: fn,
      lastName: ln,
      branch: br,
      weeklyLessonHours: hours,
      classId: cid,
      username: user,
      password: mode === "create" ? pwd : ""
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div className="principal-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="principal-modal principal-teacher-form-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-modal-title">
        <form onSubmit={handleSubmit}>
          <header className="principal-modal-head">
            <h2 id="teacher-modal-title">{mode === "create" ? "Öğretmen ekle" : "Öğretmeni düzenle"}</h2>
            <button className="principal-modal-close" type="button" onClick={onClose} aria-label="Kapat">
              <X size={20} />
            </button>
          </header>
          <div className="principal-modal-body principal-teacher-form">
            {formError ? <div className="form-error principal-modal-error">{formError}</div> : null}
            <div className="principal-teacher-form-grid">
              <label className="principal-field">
                <span>Ad</span>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required />
              </label>
              <label className="principal-field">
                <span>Soyad</span>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required />
              </label>
              <label className="principal-field principal-field--full">
                <span>Branş</span>
                <input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="Örn: Matematik" required />
              </label>
              <label className="principal-field">
                <span>Haftalık ders saati</span>
                <input
                  value={weeklyLessonHours}
                  onChange={(event) => setWeeklyLessonHours(event.target.value)}
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  required
                />
              </label>
              <label className="principal-field">
                <span>Sınıf (opsiyonel)</span>
                <select value={classId} onChange={(event) => setClassId(event.target.value)}>
                  <option value="">Atanmadı</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="principal-field principal-field--full">
                <span>Kullanıcı adı (giriş)</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onBlur={handleUsernameBlur}
                  autoComplete="username"
                  readOnly={mode === "edit"}
                  required
                  placeholder="ornek.ogretmen"
                />
              </label>
              {mode === "create" ? (
                <div className="principal-field principal-field--full principal-password-preview">
                  <span>Tek kullanımlık şifre</span>
                  <p className="principal-password-note">
                    Kullanıcı adı yazılıp alan dışına çıkıldığında otomatik üretilir. Öğretmen ilk girişte bu şifreyle bağlanıp kalıcı şifresini belirler.
                  </p>
                  <div className="principal-password-row">
                    <code className="principal-password-code">{password || "—"}</code>
                    <button type="button" className="ghost-action" onClick={regeneratePassword} disabled={normalizeUsername(username).length < 3}>
                      Yenile
                    </button>
                  </div>
                </div>
              ) : (
                <div className="principal-field principal-field--full principal-password-preview">
                  <span>Şifre</span>
                  <p className="principal-password-note">Düzenlemede şifre değişmez. Yeni tek kullanımlık şifre için tablodaki &quot;Şifre sıfırla&quot; kullanın.</p>
                </div>
              )}
            </div>
          </div>
          <footer className="principal-modal-foot">
            <button className="ghost-action" type="button" onClick={onClose}>
              Vazgeç
            </button>
            <button className="primary-action" type="submit">
              {mode === "create" ? "Kaydet" : "Güncelle"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
