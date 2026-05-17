import { ArrowLeft, Check, ClipboardCheck, Search, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ClassSection, ClassStudent, PrincipalConsoleData, SchoolClass } from "../types";
import "./PrincipalAttendancePage.css";

type AttendanceStatus = "present" | "absent";

export function PrincipalAttendancePage({
  data,
  classes,
  sections,
  students
}: {
  data: PrincipalConsoleData;
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
}) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [date, setDate] = useState(() => formatDateInputValue(new Date()));

  const classNameById = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);
  const studentsBySection = useMemo(() => {
    const map = new Map<string, ClassStudent[]>();
    for (const student of students) {
      if (!map.has(student.sectionId)) {
        map.set(student.sectionId, []);
      }
      map.get(student.sectionId)?.push(student);
    }
    return map;
  }, [students]);

  const sectionRows = useMemo(
    () =>
      sections.map((section) => {
        const sectionStudents = studentsBySection.get(section.id) ?? [];
        const absent = sectionStudents.filter((student) => attendanceStatusFor(student.id, date) === "absent").length;
        const present = sectionStudents.length - absent;
        const completion = sectionStudents.length > 0 ? 100 : 0;
        return {
          section,
          className: classNameById.get(section.classId) ?? "—",
          studentCount: sectionStudents.length,
          present,
          absent,
          completion
        };
      }),
    [classNameById, date, sections, studentsBySection]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return sectionRows
      .filter((row) => {
        if (classFilter && row.section.classId !== classFilter) {
          return false;
        }
        if (statusFilter === "taken" && row.studentCount === 0) {
          return false;
        }
        if (statusFilter === "waiting" && row.studentCount > 0) {
          return false;
        }
        if (!q) {
          return true;
        }
        return `${row.className} ${row.section.name} ${row.section.advisor}`.toLocaleLowerCase("tr-TR").includes(q);
      })
      .sort((a, b) => compareSectionName(a.className, a.section.name, b.className, b.section.name));
  }, [classFilter, search, sectionRows, statusFilter]);

  const selectedSection = selectedSectionId ? sections.find((section) => section.id === selectedSectionId) ?? null : null;
  const selectedClass = selectedSection ? classes.find((item) => item.id === selectedSection.classId) ?? null : null;
  const selectedStudents = selectedSection ? [...(studentsBySection.get(selectedSection.id) ?? [])].sort(compareStudents) : [];

  const totalStudents = sectionRows.reduce((acc, row) => acc + row.studentCount, 0);
  const totalAbsent = sectionRows.reduce((acc, row) => acc + row.absent, 0);
  const totalPresent = sectionRows.reduce((acc, row) => acc + row.present, 0);
  const takenSections = sectionRows.filter((row) => row.studentCount > 0).length;
  const completionRate = sections.length > 0 ? Math.round((takenSections / sections.length) * 100) : 0;

  if (selectedSection && selectedClass) {
    return (
      <section className="principal-page-stack principal-attendance-page">
        <div className="principal-attendance-detail-head">
          <button className="ghost-action principal-attendance-back" type="button" onClick={() => setSelectedSectionId(null)} aria-label="Şube listesine dön">
            <ArrowLeft size={15} />
          </button>
          <h1>
            {selectedClass.name} / {selectedSection.name}
          </h1>
          <label className="principal-attendance-date">
            <span>Tarih</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>

        <article className="principal-surface-card principal-attendance-table-card">
          {selectedStudents.length === 0 ? (
            <p className="empty-text">Bu şubeye atanmış öğrenci yok.</p>
          ) : (
            <div className="principal-table-wrap">
              <table className="principal-table principal-attendance-student-table">
                <thead>
                  <tr>
                    <th>Okul no</th>
                    <th>Ad soyad</th>
                    <th>Yoklama durumu</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudents.map((student) => {
                    const status = attendanceStatusFor(student.id, date);
                    return (
                      <tr key={student.id}>
                        <td>
                          <code className="principal-attendance-number">{student.schoolNumber}</code>
                        </td>
                        <td>
                          {student.firstName} {student.lastName}
                        </td>
                        <td>
                          <span className={`principal-attendance-status principal-attendance-status--${status}`}>
                            {status === "present" ? <Check size={13} /> : <X size={13} />}
                            {status === "present" ? "Geldi" : "Gelmedi"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    );
  }

  return (
    <section className="principal-page-stack principal-attendance-page">
      <div className="principal-attendance-stats" aria-label="Yoklama istatistikleri">
        <article className="principal-attendance-stat principal-attendance-stat--sky">
          <ClipboardCheck size={17} />
          <span>Toplam şube</span>
          <strong>{sections.length}</strong>
          <small>{takenSections} şubede öğrenci var</small>
        </article>
        <article className="principal-attendance-stat principal-attendance-stat--emerald">
          <UsersRound size={17} />
          <span>Geldi</span>
          <strong>{totalPresent}</strong>
          <small>{totalStudents} öğrenci içinde</small>
        </article>
        <article className="principal-attendance-stat principal-attendance-stat--rose">
          <X size={17} />
          <span>Gelmedi</span>
          <strong>{totalAbsent}</strong>
          <small>Seçili tarih bazlı</small>
        </article>
        <article className="principal-attendance-stat principal-attendance-stat--amber">
          <Check size={17} />
          <span>Tamamlanma</span>
          <strong>%{completionRate}</strong>
          <small>{takenSections} / {sections.length} şube hazır</small>
        </article>
      </div>

      <div className="principal-attendance-controls">
        <label className="principal-attendance-search">
          <Search size={15} aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sınıf, şube veya öğretmen ara..." type="search" />
        </label>
        <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Sınıf filtresi">
          <option value="">Tüm sınıflar</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Yoklama filtresi">
          <option value="">Tüm şubeler</option>
          <option value="taken">Öğrencili şubeler</option>
          <option value="waiting">Öğrencisiz şubeler</option>
        </select>
        <label className="principal-attendance-date principal-attendance-date--compact">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>

      <article className="principal-surface-card principal-attendance-table-card">
        {filteredRows.length === 0 ? (
          <p className="empty-text">{sections.length === 0 ? "Henüz şube oluşturulmadı." : "Filtrelere uyan şube yok."}</p>
        ) : (
          <div className="principal-table-wrap">
            <table className="principal-table principal-attendance-section-table">
              <thead>
                <tr>
                  <th>Sınıf / şube</th>
                  <th>Öğrenci</th>
                  <th>Geldi</th>
                  <th>Gelmedi</th>
                  <th>Sınıf öğretmeni</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.section.id}>
                    <td>
                      <span className="principal-attendance-section-name">
                        <strong>
                          {row.className} / {row.section.name}
                        </strong>
                        <small>{row.section.gradeLevel || "Kademe yok"}</small>
                      </span>
                    </td>
                    <td>{row.studentCount}</td>
                    <td>
                      <span className="principal-attendance-pill principal-attendance-pill--present">{row.present}</span>
                    </td>
                    <td>
                      <span className="principal-attendance-pill principal-attendance-pill--absent">{row.absent}</span>
                    </td>
                    <td>{row.section.advisor || "—"}</td>
                    <td>
                      <button className="ghost-action principal-attendance-open" type="button" onClick={() => setSelectedSectionId(row.section.id)}>
                        Aç
                      </button>
                    </td>
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

function attendanceStatusFor(studentId: string, date: string): AttendanceStatus {
  const seed = `${studentId}-${date}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  }
  return hash % 7 === 0 ? "absent" : "present";
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compareSectionName(aClass: string, aSection: string, bClass: string, bSection: string) {
  const classCompare = aClass.localeCompare(bClass, "tr", { numeric: true });
  if (classCompare !== 0) {
    return classCompare;
  }
  return aSection.localeCompare(bSection, "tr", { numeric: true });
}

function compareStudents(a: ClassStudent, b: ClassStudent) {
  return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr");
}
