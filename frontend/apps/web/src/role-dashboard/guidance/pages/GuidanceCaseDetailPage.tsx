import { ArrowLeft, Plus, RotateCcw, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { GuidanceCase, GuidanceCaseTimelineItem } from "../../../lib/api";
import { api } from "../../../lib/api";
import {
  caseEventTypeLabel,
  casePriorityBadgeClass,
  casePriorityLabel,
  caseStatusLabel,
  caseTimelineSourceLabel,
  formatGuidanceDate
} from "../utils";
import "../GuidanceDataPage.css";

const EVENT_TYPES = [
  { value: "note", label: "Not" },
  { value: "meeting", label: "Görüşme" },
  { value: "plan", label: "Plan" },
  { value: "risk", label: "Risk" },
  { value: "follow_up", label: "Takip" }
] as const;

const VISIBILITY_OPTIONS = [
  { value: "guidance_only", label: "Yalnızca rehberlik" },
  { value: "principal_summary", label: "Müdür özeti" },
  { value: "shared_with_guardian", label: "Veli ile paylaş" }
] as const;

const emptyEventForm = { eventType: "note" as const, title: "", body: "", visibility: "guidance_only" as const };

export function GuidanceCaseDetailPage({
  readOnly = false,
  listPath = "/dashboard/cases"
}: {
  readOnly?: boolean;
  listPath?: string;
}) {
  const { caseId = "" } = useParams();
  const [item, setItem] = useState<GuidanceCase | null>(null);
  const [timeline, setTimeline] = useState<GuidanceCaseTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [eventLoading, setEventLoading] = useState(false);

  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const [caseItem, timelineItems] = await Promise.all([api.guidanceCase(caseId), api.guidanceCaseTimeline(caseId)]);
      setItem(caseItem);
      setTimeline(timelineItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vaka detayı alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCloseCase = async () => {
    if (!caseId || !window.confirm("Vaka dosyasını kapatmak istediğinize emin misiniz?")) return;
    setActionError(null);
    try {
      const result = await api.closeGuidanceCase(caseId);
      setItem(result.case);
      if (result.warnings?.length) {
        window.alert(result.warnings.join("\n"));
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Vaka kapatılamadı.");
    }
  };

  const onReopenCase = async () => {
    if (!caseId) return;
    setActionError(null);
    try {
      const reopened = await api.reopenGuidanceCase(caseId);
      setItem(reopened);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Vaka yeniden açılamadı.");
    }
  };

  const onCreateEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!caseId || !eventForm.title.trim() || !eventForm.body.trim()) {
      setActionError("Başlık ve içerik zorunludur.");
      return;
    }
    setEventLoading(true);
    setActionError(null);
    try {
      await api.createGuidanceCaseEvent(caseId, {
        eventType: eventForm.eventType,
        title: eventForm.title.trim(),
        body: eventForm.body.trim(),
        visibility: eventForm.visibility
      });
      setEventOpen(false);
      setEventForm(emptyEventForm);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Kayıt eklenemedi.");
    } finally {
      setEventLoading(false);
    }
  };

  if (loading) {
    return <p className="loading-line">Vaka detayı yükleniyor…</p>;
  }

  if (error || !item) {
    return (
      <section className="guidance-page-stack guidance-data-page">
        <Link className="guidance-back-link" to={listPath}>
          <ArrowLeft size={16} />
          Vaka listesi
        </Link>
        <div className="form-error sa-alert">{error ?? "Vaka bulunamadı."}</div>
      </section>
    );
  }

  const isClosed = item.status === "closed";

  return (
    <section className="guidance-page-stack guidance-data-page guidance-case-detail-page">
      <Link className="guidance-back-link" to={listPath}>
        <ArrowLeft size={16} />
        Vaka listesi
      </Link>

      <article className="guidance-case-detail-hero">
        <div className="guidance-case-detail-head">
          <span className={casePriorityBadgeClass(item.priority)}>
            <ShieldAlert size={14} />
            {casePriorityLabel(item.priority)}
          </span>
          <span className="guidance-case-status">{caseStatusLabel(item.status)}</span>
        </div>
        <h1>{item.title}</h1>
        <p className="guidance-data-secondary">
          {item.studentName} · {item.className}
        </p>
        <p className="guidance-case-summary">{item.masked ? "[Gizli özet — rehberlik görüşmesi gerekir]" : item.summary}</p>
        <small>Sorumlu: {item.ownerName}</small>
      </article>

      {!readOnly ? (
        <div className="guidance-case-detail-actions">
          {!isClosed ? (
            <>
              <button className="primary-action small-action" onClick={() => setEventOpen(true)} type="button">
                <Plus size={16} />
                Kayıt ekle
              </button>
              <button className="ghost-action small-action" onClick={() => void onCloseCase()} type="button">
                Vakayı kapat
              </button>
            </>
          ) : (
            <button className="ghost-action small-action" onClick={() => void onReopenCase()} type="button">
              <RotateCcw size={16} />
              Yeniden aç
            </button>
          )}
        </div>
      ) : null}

      {actionError ? <div className="form-error sa-alert">{actionError}</div> : null}

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Zaman çizelgesi</h2>
          <span>{timeline.length} kayıt</span>
        </header>
        {timeline.length === 0 ? <p className="guidance-empty-copy">Henüz zaman çizelgesi kaydı yok.</p> : null}
        <div className="guidance-case-timeline">
          {timeline.map((entry) => (
            <div className="guidance-case-timeline-item" key={entry.id}>
              <div className="guidance-case-timeline-meta">
                <strong>
                  {entry.source === "case_event" ? caseEventTypeLabel(entry.eventType) : caseTimelineSourceLabel(entry.source)}
                </strong>
                <span>{formatGuidanceDate(entry.occurredAt)}</span>
              </div>
              <p className="guidance-data-primary">{entry.title}</p>
              <p>{entry.masked ? "[Gizli içerik]" : entry.body}</p>
              <small>{entry.actorName}</small>
            </div>
          ))}
        </div>
      </article>

      {eventOpen && !readOnly ? (
        <div className="modal-backdrop">
          <form className="modal-card guidance-case-create-modal" onSubmit={onCreateEvent}>
            <header>
              <h2>Vaka kaydı ekle</h2>
              <button onClick={() => setEventOpen(false)} type="button">
                Kapat
              </button>
            </header>
            <label>
              Tür
              <select
                onChange={(event) => setEventForm((prev) => ({ ...prev, eventType: event.target.value as typeof eventForm.eventType }))}
                value={eventForm.eventType}
              >
                {EVENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Görünürlük
              <select
                onChange={(event) =>
                  setEventForm((prev) => ({ ...prev, visibility: event.target.value as typeof eventForm.visibility }))
                }
                value={eventForm.visibility}
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Başlık
              <input onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))} required value={eventForm.title} />
            </label>
            <label>
              İçerik
              <textarea onChange={(event) => setEventForm((prev) => ({ ...prev, body: event.target.value }))} required rows={4} value={eventForm.body} />
            </label>
            <footer>
              <button className="ghost-action" onClick={() => setEventOpen(false)} type="button">
                İptal
              </button>
              <button className="primary-action" disabled={eventLoading} type="submit">
                {eventLoading ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </section>
  );
}
