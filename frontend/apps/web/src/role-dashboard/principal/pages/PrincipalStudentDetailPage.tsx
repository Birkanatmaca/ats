import { ArrowLeft, BookOpenCheck, ClipboardCheck, FileText, HeartHandshake, Loader2, Pencil, Trash2, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type StudentAcademicSummary, type StudentAttendanceSummary } from "../../../lib/api";
import { ResourceFileManager } from "../../components/ResourceFileManager";
import { StudentFormModal, type StudentFormPayload } from "../components/StudentFormModal";
import type { ClassSection, ClassStudent, SchoolClass } from "../types";
import "./PrincipalStudentDetailPage.css";

const STATUS_LABEL: Record<string, string> = {
  present: "Geldi",
  absent: "Devamsız",
  late: "Geç",
  excused: "İzinli",
  unknown: "Belirsiz"
};

function initials(firstName: string, lastName: string) {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toLocaleUpperCase("tr-TR") || "?";
}

function genderLabel(value: string) {
  if (value === "female") return "Kız";
  if (value === "male") return "Erkek";
  return value || "—";
}

function formatBirthDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function PrincipalStudentDetailPage({
  classes,
  sections,
  students,
  onUpdateStudent,
  onDeleteStudent
}: {
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  onUpdateStudent: (id: string, payload: StudentFormPayload) => void;
  onDeleteStudent: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { studentId = "" } = useParams<{ studentId: string }>();
  const student = useMemo(() => students.find((item) => item.id === studentId) ?? null, [students, studentId]);
  const className = classes.find((item) => item.id === student?.classId)?.name ?? "";
  const section = sections.find((item) => item.id === student?.sectionId);
  const sectionLabel = section ? `${className || "Sınıf"} / ${section.name}` : className || "Sınıf yok";

  const [attendance, setAttendance] = useState<StudentAttendanceSummary | null>(null);
  const [academic, setAcademic] = useState<StudentAcademicSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState<"attendance" | "development" | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportRefresh, setReportRefresh] = useState(0);

  useEffect(() => {
    if (!studentId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.allSettled([api.studentAttendanceSummary(studentId), api.studentAcademicSummary(studentId)]).then(
      ([attendanceResult, academicResult]) => {
        if (cancelled) {
          return;
        }
        if (attendanceResult.status === "fulfilled") {
          setAttendance(attendanceResult.value);
        }
        if (academicResult.status === "fulfilled") {
          setAcademic(academicResult.value);
        }
        if (attendanceResult.status === "rejected" && academicResult.status === "rejected") {
          setError("Öğrenci performans verileri alınamadı.");
        }
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const attendanceTotal = (attendance?.present ?? 0) + (attendance?.absent ?? 0) + (attendance?.late ?? 0) + (attendance?.excused ?? 0);
  const presencePct = attendanceTotal > 0 ? Math.round((((attendance?.present ?? 0) + (attendance?.late ?? 0)) / attendanceTotal) * 100) : 0;
  const recentRecords = (attendance?.records ?? []).slice(-12).reverse();

  async function generateReport(type: "attendance" | "development") {
    if (!student) {
      return;
    }
    setReportBusy(type);
    setReportError(null);
    setReportMessage(null);
    try {
      const report =
        type === "attendance"
          ? await api.generateAttendanceReport({ studentId: student.id })
          : await api.generateStudentDevelopmentReport({ studentId: student.id });
      setReportMessage(`${report.title} oluşturuldu.`);
      setReportRefresh((value) => value + 1);
    } catch (generateError) {
      setReportError(generateError instanceof Error ? generateError.message : "Rapor oluşturulamadı.");
    } finally {
      setReportBusy(null);
    }
  }

  function handleDelete() {
    if (!student) {
      return;
    }
    if (!window.confirm(`${student.firstName} ${student.lastName} öğrenci kaydını silmek istediğinize emin misiniz?`)) {
      return;
    }
    onDeleteStudent(student.id);
    navigate("/dashboard/students");
  }

  if (!student) {
    return (
      <section className="psd">
        <p className="psd-missing">Öğrenci bulunamadı.</p>
        <button className="psd-action" type="button" onClick={() => navigate("/dashboard/students")}>
          <ArrowLeft size={16} />
          Öğrenci listesine dön
        </button>
      </section>
    );
  }

  return (
    <section className="psd">
      <header className="psd-hero">
        <div className="psd-hero-main">
          <button className="psd-back" type="button" onClick={() => navigate("/dashboard/students")} aria-label="Öğrencilere dön">
            <ArrowLeft size={16} />
          </button>
          <span className="psd-avatar">{initials(student.firstName, student.lastName)}</span>
          <div>
            <p className="psd-kicker">Öğrenci detayı</p>
            <h1>
              {student.firstName} {student.lastName}
            </h1>
            <p>
              No {student.schoolNumber} · {sectionLabel}
              {student.birthDate ? ` · ${formatBirthDate(student.birthDate)}` : ""}
            </p>
            <div className="psd-hero-meta">
              <span className={`psd-pill${student.status === "active" ? " psd-pill--ok" : " psd-pill--off"}`}>
                {student.status === "active" ? "Aktif" : "Pasif"}
              </span>
              {student.gender ? <span className="psd-pill">{genderLabel(student.gender)}</span> : null}
              {student.guardianName ? <span className="psd-pill">{student.guardianName}</span> : null}
              {student.guardianPhone ? <span className="psd-pill">{student.guardianPhone}</span> : null}
            </div>
          </div>
        </div>
        <div className="psd-hero-actions">
          <button className="psd-action" type="button" onClick={() => setModalOpen(true)}>
            <Pencil size={15} />
            Düzenle
          </button>
          <button className="psd-action psd-action--danger" type="button" onClick={handleDelete}>
            <Trash2 size={15} />
            Sil
          </button>
        </div>
      </header>

      {error ? <p className="psd-error">{error}</p> : null}
      {loading ? (
        <p className="psd-loading">
          <Loader2 className="spin" size={16} /> Öğrenci verileri yükleniyor…
        </p>
      ) : null}

      <div className="psd-kpi-grid">
        <article className="psd-kpi">
          <div className="psd-kpi-icon psd-kpi-icon--teal">
            <ClipboardCheck size={18} />
          </div>
          <span>Katılım</span>
          <strong>%{presencePct}</strong>
          <small>{attendanceTotal} kesinleşmiş yoklama</small>
        </article>
        <article className="psd-kpi">
          <div className="psd-kpi-icon">
            <UserX size={18} />
          </div>
          <span>Devamsız / geç</span>
          <strong>
            {attendance?.absent ?? 0} / {attendance?.late ?? 0}
          </strong>
          <small>{attendance?.excused ?? 0} izinli</small>
        </article>
        <article className="psd-kpi">
          <div className="psd-kpi-icon psd-kpi-icon--violet">
            <BookOpenCheck size={18} />
          </div>
          <span>Akademik ortalama</span>
          <strong>%{Math.round(academic?.averagePercent ?? 0)}</strong>
          <small>{academic?.assessmentCount ?? 0} değerlendirme</small>
        </article>
        <article className="psd-kpi">
          <div className="psd-kpi-icon psd-kpi-icon--amber">
            <HeartHandshake size={18} />
          </div>
          <span>Veli</span>
          <strong>{student.guardianName ? student.guardianName.split(" ")[0] : "—"}</strong>
          <small>{student.guardianPhone || "Telefon yok"}</small>
        </article>
      </div>

      <div className="psd-bento">
        <article className="psd-card">
          <div className="psd-card-head">
            <span>Yoklama</span>
            <h2>Son devamsızlık kayıtları</h2>
            <small>
              {attendance?.present ?? 0} geldi · {attendance?.absent ?? 0} devamsız · {attendance?.late ?? 0} geç
            </small>
          </div>
          {recentRecords.length === 0 ? (
            <p className="psd-empty">Henüz kesinleşmiş yoklama kaydı yok.</p>
          ) : (
            <table className="psd-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Ders</th>
                  <th>Sınıf</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((record, index) => (
                  <tr key={`${record.date}-${record.subjectName}-${index}`}>
                    <td>{record.date}</td>
                    <td>{record.subjectName}</td>
                    <td>{record.className}</td>
                    <td>
                      <span className={`psd-status psd-status--${record.status}`}>{STATUS_LABEL[record.status] ?? record.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <article className="psd-card">
          <div className="psd-card-head">
            <span>Akademik</span>
            <h2>Ders kırılımı</h2>
            <small>{academic?.supportSignals.length ? academic.supportSignals[0] : "Değerlendirme ortalamaları"}</small>
          </div>
          {(academic?.subjectSummaries.length ?? 0) === 0 ? (
            <p className="psd-empty">Akademik sonuç henüz girilmedi.</p>
          ) : (
            <table className="psd-table">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th>Ortalama</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {academic?.subjectSummaries.map((item) => (
                  <tr key={item.subjectId}>
                    <td>{item.subjectName}</td>
                    <td>%{Math.round(item.averagePercent)}</td>
                    <td>
                      <div className={`psd-bar${item.needsSupport ? " psd-bar--warn" : ""}`}>
                        <i style={{ width: `${Math.max(4, Math.min(100, Math.round(item.averagePercent)))}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </div>

      <article className="psd-card">
        <div className="psd-card-head">
          <span>Belgeler</span>
          <h2>Rapor ve dosyalar</h2>
          <small>Devamsızlık ve gelişim PDF’lerini buradan üretin.</small>
        </div>
        <div className="psd-docs">
          <button className="psd-action" type="button" onClick={() => void generateReport("attendance")} disabled={reportBusy !== null}>
            {reportBusy === "attendance" ? <Loader2 className="spin" size={15} /> : <FileText size={15} />}
            Devamsızlık PDF
          </button>
          <button className="psd-action" type="button" onClick={() => void generateReport("development")} disabled={reportBusy !== null}>
            {reportBusy === "development" ? <Loader2 className="spin" size={15} /> : <FileText size={15} />}
            Gelişim PDF
          </button>
        </div>
        {reportError ? <p className="psd-error">{reportError}</p> : null}
        {reportMessage ? <p className="psd-ok">{reportMessage}</p> : null}
        <ResourceFileManager
          title="Üretilen raporlar"
          category="report"
          resourceType="student_report"
          resourceId={student.id}
          canUpload={false}
          emptyText="Bu öğrenci için henüz PDF rapor üretilmedi."
          refreshSignal={reportRefresh}
        />
        <ResourceFileManager
          title="Öğrenci belgeleri"
          category="student"
          resourceType="student"
          resourceId={student.id}
          emptyText="Bu öğrenci için henüz belge yüklenmedi."
        />
      </article>

      <StudentFormModal
        open={modalOpen}
        mode="edit"
        classes={classes}
        sections={sections}
        initial={student}
        existingSchoolNumbers={students.map((item) => item.schoolNumber)}
        onClose={() => setModalOpen(false)}
        onSubmit={(payload) => {
          onUpdateStudent(student.id, payload);
          setModalOpen(false);
        }}
      />
    </section>
  );
}
