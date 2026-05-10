import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";

export function PrincipalClassStudentsPage({
  classes,
  sections,
  students,
  onAddStudent
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onAddStudent: (payload: Omit<ClassStudent, "id" | "createdAt">) => void;
}) {
  const navigate = useNavigate();
  const params = useParams();
  const classId = params.classId ?? "";
  const sectionId = params.sectionId ?? "";
  const schoolClass = classes.find((item) => item.id === classId);
  const section = sections.find((item) => item.id === sectionId && item.classId === classId);
  const [form, setForm] = useState({
    schoolNumber: "",
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    guardianName: "",
    guardianPhone: "",
    status: "active"
  });

  const rows = useMemo(
    () => students.filter((item) => item.classId === classId && item.sectionId === sectionId),
    [students, classId, sectionId]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classId || !sectionId || !form.firstName.trim() || !form.lastName.trim() || !form.schoolNumber.trim()) {
      return;
    }
    onAddStudent({
      classId,
      sectionId,
      schoolNumber: form.schoolNumber.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender.trim(),
      birthDate: form.birthDate.trim(),
      guardianName: form.guardianName.trim(),
      guardianPhone: form.guardianPhone.trim(),
      status: form.status as "active" | "passive"
    });
    setForm({
      schoolNumber: "",
      firstName: "",
      lastName: "",
      gender: "",
      birthDate: "",
      guardianName: "",
      guardianPhone: "",
      status: "active"
    });
  }

  if (!schoolClass || !section) {
    return (
      <section className="principal-page-stack">
        <header className="sa-page-header">
          <span className="sa-kicker">Öğrenci yönetimi</span>
          <h1>Sınıf/şube bulunamadı</h1>
          <p>Listeye geri dönüp geçerli bir sınıf ve şube seç.</p>
        </header>
        <button className="ghost-action" type="button" onClick={() => navigate("/dashboard/classes")}>
          Sınıf listesine dön
        </button>
      </section>
    );
  }

  return (
    <section className="principal-page-stack">
      <header className="sa-page-header">
        <span className="sa-kicker">Öğrenci yönetimi</span>
        <h1>
          {schoolClass.name} / {section.name} şubesi
        </h1>
        <p>Şube öğrencilerini yönet, yeni öğrenci ekle ve detay bilgileri tablo üzerinden takip et.</p>
      </header>

      <article className="principal-surface-card">
        <div className="principal-card-head">
          <h2>Öğrenci ekle</h2>
          <p>Öğrenci detaylarını doldurarak şubeye kayıt oluştur.</p>
        </div>
        <form className="principal-student-form" onSubmit={handleSubmit}>
          <input
            value={form.schoolNumber}
            onChange={(event) => setForm((current) => ({ ...current, schoolNumber: event.target.value }))}
            placeholder="Okul No"
          />
          <input
            value={form.firstName}
            onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
            placeholder="Ad"
          />
          <input
            value={form.lastName}
            onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
            placeholder="Soyad"
          />
          <input
            value={form.gender}
            onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
            placeholder="Cinsiyet"
          />
          <input
            type="date"
            value={form.birthDate}
            onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
            placeholder="Doğum tarihi"
          />
          <input
            value={form.guardianName}
            onChange={(event) => setForm((current) => ({ ...current, guardianName: event.target.value }))}
            placeholder="Veli adı"
          />
          <input
            value={form.guardianPhone}
            onChange={(event) => setForm((current) => ({ ...current, guardianPhone: event.target.value }))}
            placeholder="Veli telefonu"
          />
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
          <button className="primary-action" type="submit">
            Öğrenci Ekle
          </button>
        </form>
      </article>

      <article className="principal-surface-card">
        <div className="principal-card-head">
          <h2>Öğrenci tablosu</h2>
          <p>Şubeye kayıtlı öğrenciler detay bilgileriyle listelenir.</p>
        </div>
        <div className="principal-table-wrap">
          <table className="principal-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Ad Soyad</th>
                <th>Cinsiyet</th>
                <th>Doğum</th>
                <th>Veli</th>
                <th>Telefon</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>Henüz öğrenci eklenmedi.</td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.schoolNumber}</td>
                    <td>
                      {item.firstName} {item.lastName}
                    </td>
                    <td>{item.gender || "-"}</td>
                    <td>{item.birthDate || "-"}</td>
                    <td>{item.guardianName || "-"}</td>
                    <td>{item.guardianPhone || "-"}</td>
                    <td>{item.status === "active" ? "Aktif" : "Pasif"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
