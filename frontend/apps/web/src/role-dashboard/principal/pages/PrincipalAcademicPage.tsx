import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  GraduationCap,
  LineChart,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Target,
  UsersRound
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  api,
  type AcademicAssessment,
  type AcademicResultInput,
  type AcademicAssessmentType,
  type AcademicResult,
  type ClassAcademicSummary,
  type SchoolSubjectRecord,
  type StudentAcademicSummary
} from "../../../lib/api";
import "../../guidance/GuidanceDataPage.css";
import type { ClassStudent, SchoolClass } from "../types";
import "./PrincipalAcademicPage.css";

const assessmentTypeLabels: Record<AcademicAssessmentType, string> = {
  exam: "Sınav",
  quiz: "Quiz",
  homework: "Ödev",
  project: "Proje"
};

type ResultDraft = Record<string, { score: string; note: string }>;

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function studentName(student: ClassStudent) {
  return `${student.firstName} ${student.lastName}`.trim() || student.schoolNumber;
}

function formatPercent(value?: number) {
  if (!Number.isFinite(value ?? Number.NaN)) return "%0";
  return `%${Math.round(value ?? 0)}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function clampPercent(value?: number) {
  if (!Number.isFinite(value ?? Number.NaN)) return 0;
  return Math.max(0, Math.min(100, value ?? 0));
}

function trendLabel(value: string) {
  switch (value) {
    case "up":
    case "rising":
      return "Yükseliyor";
    case "down":
    case "falling":
      return "Düşüyor";
    case "flat":
    case "stable":
      return "Stabil";
    default:
      return "Veri bekliyor";
  }
}

function StatCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) {
  return (
    <article className={`principal-academic-stat principal-academic-stat--${tone}`}>
      <div className="principal-academic-stat-icon" aria-hidden>
        {icon}
      </div>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
  );
}

export function PrincipalAcademicPage({ classes, students }: { classes: SchoolClass[]; students: ClassStudent[] }) {
  const [assessments, setAssessments] = useState<AcademicAssessment[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubjectRecord[]>([]);
  const [classSummary, setClassSummary] = useState<ClassAcademicSummary | null>(null);
  const [studentSummary, setStudentSummary] = useState<StudentAcademicSummary | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<AcademicResult[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [resultDraft, setResultDraft] = useState<ResultDraft>({});
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [assessmentForm, setAssessmentForm] = useState({
    name: "",
    subjectId: "",
    classId: "",
    assessmentType: "exam" as AcademicAssessmentType,
    maxScore: "100",
    assessmentDate: todayISODate()
  });

  const activeStudents = useMemo(() => students.filter((student) => student.status === "active"), [students]);
  const classStudents = useMemo(
    () => activeStudents.filter((student) => !selectedClassId || student.classId === selectedClassId),
    [activeStudents, selectedClassId]
  );
  const selectedClass = useMemo(() => classes.find((item) => item.id === selectedClassId) ?? null, [classes, selectedClassId]);
  const selectedAssessment = useMemo(
    () => assessments.find((assessment) => assessment.id === selectedAssessmentId) ?? null,
    [assessments, selectedAssessmentId]
  );
  const relevantAssessments = useMemo(
    () => assessments.filter((assessment) => !selectedClassId || !assessment.classId || assessment.classId === selectedClassId),
    [assessments, selectedClassId]
  );
  const latestResultMap = useMemo(() => new Map(assessmentResults.map((item) => [item.studentId, item])), [assessmentResults]);

  const reloadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setError(null);
    try {
      const [nextAssessments, nextSubjects] = await Promise.all([api.academicAssessments(), api.listSubjects()]);
      setAssessments(nextAssessments);
      setSubjects(nextSubjects);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Akademik katalog verileri alınamadı.");
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const reloadSummaries = useCallback(async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const [nextClassSummary, nextStudentSummary] = await Promise.allSettled([
        selectedClassId ? api.classAcademicSummary(selectedClassId) : Promise.resolve(null),
        selectedStudentId ? api.studentAcademicSummary(selectedStudentId) : Promise.resolve(null)
      ]);
      if (nextClassSummary.status === "fulfilled") {
        setClassSummary(nextClassSummary.value);
      } else {
        setClassSummary(null);
      }
      if (nextStudentSummary.status === "fulfilled") {
        setStudentSummary(nextStudentSummary.value);
      } else {
        setStudentSummary(null);
      }
      if (nextClassSummary.status === "rejected" || nextStudentSummary.status === "rejected") {
        setError("Akademik özetin bir bölümü alınamadı; erişilebilen veriler gösteriliyor.");
      }
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedClassId, selectedStudentId]);

  const reloadResults = useCallback(async () => {
    if (!selectedAssessmentId) {
      setAssessmentResults([]);
      setResultDraft({});
      return;
    }
    setLoadingResults(true);
    setError(null);
    try {
      const rows = await api.academicResults(selectedAssessmentId);
      const rowByStudent = new Map(rows.map((row) => [row.studentId, row]));
      const nextDraft: ResultDraft = {};
      for (const student of classStudents) {
        const row = rowByStudent.get(student.id);
        nextDraft[student.id] = {
          score: row ? String(row.score) : "",
          note: row?.note ?? ""
        };
      }
      setAssessmentResults(rows);
      setResultDraft(nextDraft);
    } catch (loadError) {
      setAssessmentResults([]);
      setError(loadError instanceof Error ? loadError.message : "Sonuç listesi alınamadı.");
    } finally {
      setLoadingResults(false);
    }
  }, [classStudents, selectedAssessmentId]);

  useEffect(() => {
    void reloadCatalog();
  }, [reloadCatalog]);

  useEffect(() => {
    setSelectedClassId((current) => {
      if (current && classes.some((item) => item.id === current)) return current;
      return classes[0]?.id ?? "";
    });
  }, [classes]);

  useEffect(() => {
    setSelectedStudentId((current) => {
      if (current && classStudents.some((student) => student.id === current)) return current;
      return classStudents[0]?.id ?? activeStudents[0]?.id ?? "";
    });
  }, [activeStudents, classStudents]);

  useEffect(() => {
    setAssessmentForm((current) => ({
      ...current,
      classId: current.classId && classes.some((item) => item.id === current.classId) ? current.classId : selectedClassId || classes[0]?.id || ""
    }));
  }, [classes, selectedClassId]);

  useEffect(() => {
    setAssessmentForm((current) => ({
      ...current,
      subjectId: current.subjectId && subjects.some((item) => item.id === current.subjectId) ? current.subjectId : subjects[0]?.id || ""
    }));
  }, [subjects]);

  useEffect(() => {
    setSelectedAssessmentId((current) => {
      if (current && relevantAssessments.some((assessment) => assessment.id === current)) return current;
      return relevantAssessments[0]?.id ?? "";
    });
  }, [relevantAssessments]);

  useEffect(() => {
    void reloadSummaries();
  }, [reloadSummaries]);

  useEffect(() => {
    void reloadResults();
  }, [reloadResults]);

  async function refreshAll() {
    await reloadCatalog();
    await reloadSummaries();
    await reloadResults();
  }

  async function createAssessment(event: FormEvent) {
    event.preventDefault();
    setBusyAction("createAssessment");
    setError(null);
    setMessage(null);
    try {
      const maxScore = Number(assessmentForm.maxScore);
      if (!assessmentForm.name.trim() || !assessmentForm.subjectId || !assessmentForm.assessmentDate || !Number.isFinite(maxScore) || maxScore <= 0) {
        throw new Error("Değerlendirme adı, ders, tarih ve geçerli maksimum puan zorunludur.");
      }
      const created = await api.createAcademicAssessment({
        name: assessmentForm.name.trim(),
        subjectId: assessmentForm.subjectId,
        classId: assessmentForm.classId || undefined,
        assessmentType: assessmentForm.assessmentType,
        maxScore,
        assessmentDate: assessmentForm.assessmentDate
      });
      setAssessmentForm((current) => ({ ...current, name: "", maxScore: "100", assessmentDate: todayISODate() }));
      setMessage(`${created.name} değerlendirmesi oluşturuldu.`);
      await reloadCatalog();
      setSelectedAssessmentId(created.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Değerlendirme oluşturulamadı.");
    } finally {
      setBusyAction(null);
    }
  }

  async function saveResults(event: FormEvent) {
    event.preventDefault();
    if (!selectedAssessment) {
      setError("Sonuç girmek için bir değerlendirme seçin.");
      return;
    }
    setBusyAction("saveResults");
    setError(null);
    setMessage(null);
    try {
      const payload: AcademicResultInput[] = [];
      for (const student of classStudents) {
        const draft = resultDraft[student.id];
        const rawScore = draft?.score.trim() ?? "";
        if (!rawScore) continue;
        const score = Number(rawScore);
        if (!Number.isFinite(score) || score < 0 || score > selectedAssessment.maxScore) {
          throw new Error(`${studentName(student)} için puan 0-${selectedAssessment.maxScore} aralığında olmalı.`);
        }
        payload.push({ studentId: student.id, score, note: draft?.note.trim() || undefined });
      }

      if (payload.length === 0) {
        throw new Error("Kaydedilecek en az bir öğrenci puanı girin.");
      }

      await api.saveAcademicResults(selectedAssessment.id, payload);
      setMessage(`${payload.length} öğrenci sonucu kaydedildi.`);
      await Promise.all([reloadResults(), reloadSummaries()]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Sonuçlar kaydedilemedi.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="principal-page-stack guidance-data-page principal-academic-page">
      <header className="principal-academic-hero">
        <div>
          <span className="principal-academic-eyebrow">Akademik gelişim</span>
          <h1>Sınıf, ders ve öğrenci başarı takibi</h1>
          <p>Değerlendirme oluştur, hızlı sonuç gir, sınıf kırılımlarını ve destek ihtiyacı olan öğrencileri aynı ekrandan izle.</p>
        </div>
        <button className="guidance-data-secondary-button" type="button" onClick={() => void refreshAll()} disabled={loadingCatalog || loadingSummary || loadingResults}>
          <RefreshCw className={loadingCatalog || loadingSummary || loadingResults ? "spin" : undefined} size={16} />
          Yenile
        </button>
      </header>

      {error ? <p className="principal-academic-alert principal-academic-alert--error">{error}</p> : null}
      {message ? <p className="principal-academic-alert principal-academic-alert--success">{message}</p> : null}

      <div className="principal-academic-controls">
        <label>
          <span>Sınıf</span>
          <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Öğrenci</span>
          <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
            {classStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {studentName(student)} · {student.schoolNumber}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Değerlendirme</span>
          <select value={selectedAssessmentId} onChange={(event) => setSelectedAssessmentId(event.target.value)}>
            {relevantAssessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.name} · {assessment.subjectName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="principal-academic-stats" aria-label="Akademik özet göstergeleri">
        <StatCard icon={<UsersRound size={19} />} label="Sınıf ortalaması" value={formatPercent(classSummary?.averagePercent)} detail={`${classSummary?.studentCount ?? classStudents.length} aktif öğrenci`} tone="blue" />
        <StatCard icon={<ClipboardList size={19} />} label="Değerlendirme" value={String(classSummary?.assessmentCount ?? relevantAssessments.length)} detail={selectedClass?.name ?? "Sınıf seçilmedi"} tone="green" />
        <StatCard icon={<Award size={19} />} label="Öğrenci ortalaması" value={formatPercent(studentSummary?.averagePercent)} detail={studentSummary?.student.fullName ?? "Öğrenci seçilmedi"} tone="amber" />
        <StatCard icon={<AlertTriangle size={19} />} label="Destek sinyali" value={String(classSummary?.supportStudents.length ?? 0)} detail="Sınıf içinde öncelikli takip" tone="rose" />
      </div>

      <div className="principal-academic-layout">
        <div className="principal-academic-main-column">
          <article className="principal-surface-card principal-academic-panel">
            <div className="principal-card-head">
              <div>
                <h2>Ders kırılımı</h2>
                <p>Seçili sınıftaki ders bazlı başarı ve destek yoğunluğu.</p>
              </div>
              {loadingSummary ? <Loader2 className="spin" size={18} /> : <BarChart3 size={18} />}
            </div>
            <div className="principal-academic-subject-list">
              {(classSummary?.subjectSummaries ?? []).length > 0 ? (
                classSummary?.subjectSummaries.map((subject) => (
                  <div className="principal-academic-subject-row" key={subject.subjectId}>
                    <div className="principal-academic-subject-main">
                      <strong>{subject.subjectName}</strong>
                      <span>
                        {subject.assessmentCount} ölçüm · {trendLabel(subject.trend)}
                      </span>
                    </div>
                    <div className="principal-academic-bar" aria-label={`${subject.subjectName} ortalaması ${formatPercent(subject.averagePercent)}`}>
                      <i style={{ width: `${clampPercent(subject.averagePercent)}%` }} />
                    </div>
                    <strong>{formatPercent(subject.averagePercent)}</strong>
                    <em>{subject.needsSupportCount} destek</em>
                  </div>
                ))
              ) : (
                <p className="principal-academic-empty">Bu sınıf için henüz sonuç girilmedi.</p>
              )}
            </div>
          </article>

          <article className="principal-surface-card principal-academic-panel">
            <div className="principal-card-head">
              <div>
                <h2>Öncelikli destek listesi</h2>
                <p>Ortalaması düşük öğrenciler için hızlı müdahale görünümü.</p>
              </div>
              <Target size={18} />
            </div>
            <div className="principal-academic-support-list">
              {(classSummary?.supportStudents ?? []).length > 0 ? (
                classSummary?.supportStudents.map((student) => (
                  <div className="principal-academic-support-row" key={student.studentId}>
                    <div>
                      <strong>{student.studentName}</strong>
                      <span>{student.schoolNumber}</span>
                    </div>
                    <p>{student.signal}</p>
                    <strong>{formatPercent(student.averagePercent)}</strong>
                  </div>
                ))
              ) : (
                <p className="principal-academic-empty">Destek alarmı oluşan öğrenci yok.</p>
              )}
            </div>
          </article>
        </div>

        <aside className="principal-surface-card principal-academic-panel principal-academic-student-card">
          <div className="principal-card-head">
            <div>
              <h2>Öğrenci gelişimi</h2>
              <p>Seçili öğrencinin son ölçümleri ve ders bazlı eğilimi.</p>
            </div>
            <LineChart size={18} />
          </div>
          {studentSummary ? (
            <div className="principal-academic-student-body">
              <div className="principal-academic-student-headline">
                <div>
                  <strong>{studentSummary.student.fullName}</strong>
                  <span>
                    {studentSummary.student.schoolNumber} · {studentSummary.student.className}
                  </span>
                </div>
                <b>{formatPercent(studentSummary.averagePercent)}</b>
              </div>
              <p className="principal-academic-ai-summary">{studentSummary.aiWeeklySummary}</p>
              <div className="principal-academic-mini-list">
                {studentSummary.subjectSummaries.map((subject) => (
                  <div key={subject.subjectId}>
                    <span>{subject.subjectName}</span>
                    <strong>{formatPercent(subject.averagePercent)}</strong>
                  </div>
                ))}
              </div>
              <div className="principal-academic-recent-results">
                <h3>Son sonuçlar</h3>
                {studentSummary.recentResults.length > 0 ? (
                  studentSummary.recentResults.map((result) => (
                    <div key={`${result.assessmentId}-${result.assessmentDate}`}>
                      <span>{formatDate(result.assessmentDate)}</span>
                      <strong>{result.assessmentName}</strong>
                      <em>
                        {result.score}/{result.maxScore} · {formatPercent(result.percent)}
                      </em>
                    </div>
                  ))
                ) : (
                  <p className="principal-academic-empty">Sonuç kaydı yok.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="principal-academic-empty principal-academic-empty--inset">Öğrenci seçildiğinde gelişim özeti burada görünecek.</p>
          )}
        </aside>
      </div>

      <div className="principal-academic-workbench">
        <article className="principal-surface-card principal-academic-panel">
          <div className="principal-card-head">
            <div>
              <h2>Değerlendirme oluştur</h2>
              <p>Yeni sınav, quiz, ödev veya proje kaydı aç.</p>
            </div>
            <BookOpenCheck size={18} />
          </div>
          <form className="principal-academic-form" onSubmit={(event) => void createAssessment(event)}>
            <label>
              <span>Ad</span>
              <input value={assessmentForm.name} onChange={(event) => setAssessmentForm((current) => ({ ...current, name: event.target.value }))} placeholder="Matematik 1. yazılı" />
            </label>
            <label>
              <span>Ders</span>
              <select value={assessmentForm.subjectId} onChange={(event) => setAssessmentForm((current) => ({ ...current, subjectId: event.target.value }))}>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Sınıf</span>
              <select value={assessmentForm.classId} onChange={(event) => setAssessmentForm((current) => ({ ...current, classId: event.target.value }))}>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Tür</span>
              <select value={assessmentForm.assessmentType} onChange={(event) => setAssessmentForm((current) => ({ ...current, assessmentType: event.target.value as AcademicAssessmentType }))}>
                {(Object.keys(assessmentTypeLabels) as AcademicAssessmentType[]).map((type) => (
                  <option key={type} value={type}>
                    {assessmentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Maksimum puan</span>
              <input type="number" min="1" step="0.5" value={assessmentForm.maxScore} onChange={(event) => setAssessmentForm((current) => ({ ...current, maxScore: event.target.value }))} />
            </label>
            <label>
              <span>Tarih</span>
              <input type="date" value={assessmentForm.assessmentDate} onChange={(event) => setAssessmentForm((current) => ({ ...current, assessmentDate: event.target.value }))} />
            </label>
            <button className="guidance-data-primary-button principal-academic-form-action" type="submit" disabled={busyAction === "createAssessment" || subjects.length === 0 || classes.length === 0}>
              {busyAction === "createAssessment" ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
              Oluştur
            </button>
          </form>
        </article>

        <article className="principal-surface-card principal-academic-panel">
          <div className="principal-card-head">
            <div>
              <h2>Hızlı sonuç girişi</h2>
              <p>{selectedAssessment ? `${selectedAssessment.name} · ${selectedAssessment.subjectName} · ${formatDate(selectedAssessment.assessmentDate)}` : "Önce değerlendirme seçin."}</p>
            </div>
            {loadingResults ? <Loader2 className="spin" size={18} /> : <GraduationCap size={18} />}
          </div>
          <form className="principal-academic-results-form" onSubmit={(event) => void saveResults(event)}>
            <div className="principal-academic-result-head">
              <span>Öğrenci</span>
              <span>Puan</span>
              <span>Not</span>
              <span>Mevcut</span>
            </div>
            <div className="principal-academic-result-list">
              {classStudents.length > 0 ? (
                classStudents.map((student) => {
                  const existing = latestResultMap.get(student.id);
                  return (
                    <div className="principal-academic-result-row" key={student.id}>
                      <div>
                        <strong>{studentName(student)}</strong>
                        <span>{student.schoolNumber}</span>
                      </div>
                      <input
                        aria-label={`${studentName(student)} puanı`}
                        inputMode="decimal"
                        placeholder="0"
                        value={resultDraft[student.id]?.score ?? ""}
                        onChange={(event) =>
                          setResultDraft((current) => ({
                            ...current,
                            [student.id]: { score: event.target.value, note: current[student.id]?.note ?? "" }
                          }))
                        }
                      />
                      <input
                        aria-label={`${studentName(student)} notu`}
                        placeholder="Kısa not"
                        value={resultDraft[student.id]?.note ?? ""}
                        onChange={(event) =>
                          setResultDraft((current) => ({
                            ...current,
                            [student.id]: { score: current[student.id]?.score ?? "", note: event.target.value }
                          }))
                        }
                      />
                      <span>{existing ? `${existing.score}/${selectedAssessment?.maxScore ?? "-"}` : "-"}</span>
                    </div>
                  );
                })
              ) : (
                <p className="principal-academic-empty">Bu sınıfta aktif öğrenci bulunamadı.</p>
              )}
            </div>
            <button className="guidance-data-primary-button principal-academic-form-action" type="submit" disabled={busyAction === "saveResults" || !selectedAssessment || classStudents.length === 0}>
              {busyAction === "saveResults" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              Sonuçları kaydet
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
