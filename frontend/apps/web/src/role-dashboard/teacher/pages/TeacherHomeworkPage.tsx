import { BookOpenCheck, CalendarClock, ClipboardList, Loader2, Plus, RefreshCw, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, type HomeworkAssignment, type Lesson } from "../../../lib/api";
import { GuidanceKpiCard } from "../../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../../guidance/components/GuidanceMetricGrid";
import "../../guidance/GuidanceDataPage.css";
import "../../guidance/GuidanceSurface.css";
import "../../homework/HomeworkPages.css";

type ClassOption = {
  id: string;
  name: string;
  courses: string[];
};

function addDaysISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function dueTone(dueDate: string) {
  const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  if (due < today) return "late";
  if (due - today <= 2 * 24 * 60 * 60 * 1000) return "soon";
  return "open";
}

function buildClassOptions(lessons: Lesson[]) {
  const map = new Map<string, ClassOption>();
  for (const lesson of lessons) {
    const current = map.get(lesson.classId) ?? { id: lesson.classId, name: lesson.className, courses: [] };
    if (lesson.subjectName && !current.courses.includes(lesson.subjectName)) {
      current.courses.push(lesson.subjectName);
    }
    map.set(lesson.classId, current);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
}

export function TeacherHomeworkPage({ lessons }: { lessons: Lesson[] }) {
  const classOptions = useMemo(() => buildClassOptions(lessons), [lessons]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    course: "",
    dueDate: addDaysISO(7),
    description: ""
  });

  const selectedClass = classOptions.find((item) => item.id === selectedClassId) ?? classOptions[0] ?? null;
  const hasClassOptions = classOptions.length > 0;
  const totalSubmissions = assignments.reduce((sum, item) => sum + item.submissionCount, 0);
  const overdueCount = assignments.filter((item) => dueTone(item.dueDate) === "late").length;

  const reload = useCallback(async () => {
    if (!selectedClassId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAssignments(await api.homeworkAssignments({ classId: selectedClassId }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ödev listesi alınamadı.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    setSelectedClassId((current) => (current && classOptions.some((item) => item.id === current) ? current : classOptions[0]?.id ?? ""));
  }, [classOptions]);

  useEffect(() => {
    const nextClass = classOptions.find((item) => item.id === selectedClassId) ?? classOptions[0];
    setForm((current) => ({
      ...current,
      course: current.course && nextClass?.courses.includes(current.course) ? current.course : nextClass?.courses[0] ?? current.course
    }));
  }, [classOptions, selectedClassId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createAssignment(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!selectedClassId || !form.title.trim() || !form.dueDate) {
        throw new Error("Sınıf, başlık ve teslim tarihi zorunludur.");
      }
      const created = await api.createHomeworkAssignment({
        classId: selectedClassId,
        course: form.course.trim() || selectedClass?.courses[0] || "Ders",
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate
      });
      setMessage(`${created.title} ödevi yayınlandı.`);
      setForm((current) => ({ ...current, title: "", description: "", dueDate: addDaysISO(7) }));
      await reload();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Ödev oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="guidance-page-stack guidance-surface-page guidance-data-page homework-page teacher-homework-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<BookOpenCheck size={20} />} label="Ödev" value={assignments.length} detail={selectedClass?.name ?? "Sınıf seçin"} tone="sky" />
        <GuidanceKpiCard icon={<UsersRound size={20} />} label="Teslim" value={totalSubmissions} detail="Toplam teslim kaydı" tone="emerald" />
        <GuidanceKpiCard icon={<CalendarClock size={20} />} label="Geciken" value={overdueCount} detail="Teslim tarihi geçmiş" tone="amber" />
        <GuidanceKpiCard icon={<ClipboardList size={20} />} label="Ders" value={selectedClass?.courses.length ?? 0} detail="Programdaki ders çeşidi" tone="violet" />
      </GuidanceMetricGrid>

      {error ? <p className="homework-alert homework-alert--error">{error}</p> : null}
      {message ? <p className="homework-alert homework-alert--success">{message}</p> : null}

      <div className="homework-layout">
        <article className="guidance-data-card homework-create-card">
          <header className="guidance-data-card-head">
            <h2>Ödev oluştur</h2>
            <span>{selectedClass?.name ?? "Sınıf yok"}</span>
          </header>
          {!hasClassOptions ? (
            <p className="homework-muted-note">Yayınlanmış ders programında size atanmış sınıf yok. Sınıf/ders ataması yapıldığında ödev yayınlama aktif olur.</p>
          ) : null}
          <form className="homework-form" onSubmit={(event) => void createAssignment(event)}>
            <label>
              <span>Sınıf</span>
              <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} disabled={!hasClassOptions}>
                {classOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Ders</span>
              <select value={form.course} onChange={(event) => setForm((current) => ({ ...current, course: event.target.value }))} disabled={!hasClassOptions}>
                {(selectedClass?.courses ?? []).map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </label>
            <label className="homework-field-wide">
              <span>Başlık</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Hafta sonu okuma çalışması"
                disabled={!hasClassOptions}
              />
            </label>
            <label>
              <span>Teslim tarihi</span>
              <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} disabled={!hasClassOptions} />
            </label>
            <label className="homework-field-wide">
              <span>Açıklama</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Beklenen çalışma, sayfa aralığı veya teslim notu"
                disabled={!hasClassOptions}
              />
            </label>
            <button className="guidance-data-primary-button homework-action-button" type="submit" disabled={busy || !selectedClassId || !hasClassOptions}>
              {busy ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
              Yayınla
            </button>
          </form>
        </article>

        <article className="guidance-data-card homework-list-card">
          <header className="guidance-data-card-head">
            <h2>Yayınlanan ödevler</h2>
            <div className="guidance-data-card-head-actions">
              <span>{loading ? "Yükleniyor..." : `${assignments.length} ödev`}</span>
              <button className="ghost-action small-action" type="button" onClick={() => void reload()} disabled={loading || !selectedClassId}>
                <RefreshCw className={loading ? "spin" : undefined} size={15} />
                Yenile
              </button>
            </div>
          </header>

          {assignments.length === 0 ? (
            <p className="guidance-data-empty">{loading ? "Ödevler yükleniyor..." : "Bu sınıf için yayınlanmış ödev yok."}</p>
          ) : (
            <div className="homework-assignment-list">
              {assignments.map((assignment) => (
                <div className="homework-assignment-row" key={assignment.id}>
                  <div className="homework-assignment-main">
                    <strong>{assignment.title}</strong>
                    <span>
                      {assignment.course} · {formatDate(assignment.dueDate)}
                    </span>
                    {assignment.description ? <p>{assignment.description}</p> : null}
                  </div>
                  <span className={`homework-due-pill homework-due-pill--${dueTone(assignment.dueDate)}`}>
                    {dueTone(assignment.dueDate) === "late" ? "Gecikti" : dueTone(assignment.dueDate) === "soon" ? "Yakın" : "Açık"}
                  </span>
                  <strong className="homework-submission-count">{assignment.submissionCount} teslim</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
