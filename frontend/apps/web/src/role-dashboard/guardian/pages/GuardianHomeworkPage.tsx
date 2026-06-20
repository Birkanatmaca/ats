import { BookOpenCheck, CalendarClock, CheckCircle2, Loader2, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, type HomeworkAssignment } from "../../../lib/api";
import { GuidanceKpiCard } from "../../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../../guidance/components/GuidanceMetricGrid";
import "../../guidance/GuidanceDataPage.css";
import "../../guidance/GuidanceSurface.css";
import "../../homework/HomeworkPages.css";
import type { GuardianChild } from "../types";

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

export function GuardianHomeworkPage({ child }: { child: GuardianChild }) {
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const overdueCount = useMemo(() => assignments.filter((item) => dueTone(item.dueDate) === "late").length, [assignments]);
  const soonCount = useMemo(() => assignments.filter((item) => dueTone(item.dueDate) === "soon").length, [assignments]);
  const coursesCount = useMemo(() => new Set(assignments.map((item) => item.course)).size, [assignments]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssignments(await api.homeworkAssignments({ studentId: child.id }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Ödev listesi alınamadı.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [child.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function submitAssignment(event: FormEvent, assignment: HomeworkAssignment) {
    event.preventDefault();
    setBusyId(assignment.id);
    setError(null);
    setMessage(null);
    try {
      const content = submissionDrafts[assignment.id]?.trim() ?? "";
      if (!content) {
        throw new Error("Teslim açıklaması zorunludur.");
      }
      await api.submitHomeworkAssignment(assignment.id, { studentId: child.id, content });
      setMessage(`${assignment.title} için teslim kaydedildi.`);
      setSubmissionDrafts((current) => ({ ...current, [assignment.id]: "" }));
      await reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ödev teslim edilemedi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="guidance-page-stack guidance-surface-page guidance-data-page homework-page guardian-homework-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<BookOpenCheck size={20} />} label="Ödev" value={assignments.length} detail={child.fullName} tone="sky" />
        <GuidanceKpiCard icon={<CalendarClock size={20} />} label="Yakın tarih" value={soonCount} detail="2 gün içinde" tone="amber" />
        <GuidanceKpiCard icon={<CheckCircle2 size={20} />} label="Ders" value={coursesCount} detail={child.className} tone="emerald" />
        <GuidanceKpiCard icon={<CalendarClock size={20} />} label="Geciken" value={overdueCount} detail="Teslim tarihi geçmiş" tone="violet" />
      </GuidanceMetricGrid>

      {error ? <p className="homework-alert homework-alert--error">{error}</p> : null}
      {message ? <p className="homework-alert homework-alert--success">{message}</p> : null}

      <article className="guidance-data-card homework-list-card">
        <header className="guidance-data-card-head">
          <h2>Ödevler</h2>
          <div className="guidance-data-card-head-actions">
            <span>{loading ? "Yükleniyor..." : `${assignments.length} ödev`}</span>
            <button className="ghost-action small-action" type="button" onClick={() => void reload()} disabled={loading}>
              <RefreshCw className={loading ? "spin" : undefined} size={15} />
              Yenile
            </button>
          </div>
        </header>

        {assignments.length === 0 ? (
          <p className="guidance-data-empty">{loading ? "Ödevler yükleniyor..." : "Bu öğrenci için yayınlanmış ödev yok."}</p>
        ) : (
          <div className="homework-assignment-list">
            {assignments.map((assignment) => (
              <div className="homework-assignment-row homework-assignment-row--stacked" key={assignment.id}>
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
                <form className="homework-submit-form" onSubmit={(event) => void submitAssignment(event, assignment)}>
                  <label>
                    <span>Teslim açıklaması</span>
                    <textarea
                      value={submissionDrafts[assignment.id] ?? ""}
                      onChange={(event) => setSubmissionDrafts((current) => ({ ...current, [assignment.id]: event.target.value }))}
                      placeholder="Çalışma tamamlandı, teslim notu..."
                    />
                  </label>
                  <button className="guidance-data-primary-button homework-action-button" type="submit" disabled={busyId === assignment.id}>
                    {busyId === assignment.id ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                    Teslim et
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
