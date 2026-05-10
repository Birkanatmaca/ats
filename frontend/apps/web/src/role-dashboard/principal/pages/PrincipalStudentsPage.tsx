import { GraduationCap, School, UserCheck, UserX, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";
import "./PrincipalStudentsPage.css";

export function PrincipalStudentsPage({
  classes,
  sections,
  students
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
}) {
  const [search, setSearch] = useState("");

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const sectionLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sections) {
      const className = classNameById.get(s.classId) ?? "—";
      map.set(s.id, `${className} / ${s.name}`);
    }
    return map;
  }, [sections, classNameById]);

  const studentStats = useMemo(() => {
    const active = students.filter((s) => s.status === "active").length;
    const passive = students.length - active;
    const classCount = new Set(students.map((s) => s.classId)).size;
    const sectionCount = new Set(students.map((s) => s.sectionId)).size;
    return { total: students.length, active, passive, classCount, sectionCount };
  }, [students]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = [...students].sort((a, b) => {
      const ca = classNameById.get(a.classId) ?? "";
      const cb = classNameById.get(b.classId) ?? "";
      if (ca !== cb) {
        return ca.localeCompare(cb, "tr");
      }
      const sa = sectionLabelById.get(a.sectionId) ?? "";
      const sb = sectionLabelById.get(b.sectionId) ?? "";
      if (sa !== sb) {
        return sa.localeCompare(sb, "tr");
      }
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr");
    });
    if (!q) {
      return base;
    }
    return base.filter((item) => {
      const blob = `${item.schoolNumber} ${item.firstName} ${item.lastName} ${item.guardianName ?? ""} ${sectionLabelById.get(item.sectionId) ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [students, classNameById, sectionLabelById, search]);

  return (
    <section className="principal-page-stack principal-students-page">
      <div className="principal-stat-grid principal-students-stats" aria-label="Öğrenci istatistikleri">
        <article className="principal-stat-card principal-stat-card--sky">
          <span className="principal-stat-icon" aria-hidden>
            <UsersRound size={20} />
          </span>
          <small>Toplam öğrenci</small>
          <strong>{studentStats.total}</strong>
          <em>Kayıtlı öğrenci sayısı</em>
        </article>
        <article className="principal-stat-card principal-stat-card--emerald">
          <span className="principal-stat-icon" aria-hidden>
            <UserCheck size={20} />
          </span>
          <small>Aktif</small>
          <strong>{studentStats.active}</strong>
          <em>Devam eden kayıtlar</em>
        </article>
        <article className="principal-stat-card principal-stat-card--rose">
          <span className="principal-stat-icon" aria-hidden>
            <UserX size={20} />
          </span>
          <small>Pasif</small>
          <strong>{studentStats.passive}</strong>
          <em>Askıda veya pasif</em>
        </article>
        <article className="principal-stat-card principal-stat-card--violet">
          <span className="principal-stat-icon" aria-hidden>
            <School size={20} />
          </span>
          <small>Sınıf / şube</small>
          <strong>
            {studentStats.classCount}
            <span className="principal-students-stat-pair"> / {studentStats.sectionCount}</span>
          </strong>
          <em>Kayıt olan farklı sınıf · şube</em>
        </article>
      </div>

      <div className="principal-students-toolbar">
        <div className="principal-students-toolbar-text">
          <GraduationCap size={20} aria-hidden />
          <h2>Öğrenci listesi</h2>
        </div>
        <label className="principal-students-search">
          <span className="sr-only">Ara</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, numara, veli veya sınıf ara…" type="search" />
        </label>
      </div>

      <article className="principal-surface-card principal-students-table-card">
        {filteredRows.length === 0 ? (
          <p className="empty-text">{students.length === 0 ? "Henüz öğrenci kaydı yok." : "Aramaya uyan öğrenci yok."}</p>
        ) : (
          <div className="principal-table-wrap">
            <table className="principal-table">
              <thead>
                <tr>
                  <th>Okul no</th>
                  <th>Ad soyad</th>
                  <th>Sınıf / şube</th>
                  <th>Veli</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.schoolNumber}</td>
                    <td>
                      <span className="principal-table-name">
                        <UsersRound size={16} aria-hidden />
                        {item.firstName} {item.lastName}
                      </span>
                    </td>
                    <td>{sectionLabelById.get(item.sectionId) ?? classNameById.get(item.classId) ?? "—"}</td>
                    <td>{item.guardianName || "—"}</td>
                    <td>{item.status === "active" ? "Aktif" : "Pasif"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
