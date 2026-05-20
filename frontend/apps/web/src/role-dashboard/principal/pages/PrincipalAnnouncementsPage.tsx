import { Loader2, Plus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "../../../lib/api";
import type { PrincipalConsoleData, SchoolClass } from "../types";

const audienceOptions = [
  { value: "all", label: "Tüm kurum", description: "Öğretmenler ve veliler" },
  { value: "teachers", label: "Öğretmenler", description: "Yalnızca öğretmen hesapları" },
  { value: "guardians", label: "Veliler", description: "Yalnızca veli hesapları" }
] as const;

function audienceLabel(value: string) {
  return audienceOptions.find((item) => item.value === value)?.label ?? value;
}

export function PrincipalAnnouncementsPage({
  data,
  classes = [],
  onAnnouncementCreated
}: {
  data: PrincipalConsoleData;
  classes?: SchoolClass[];
  onAnnouncementCreated?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [classScope, setClassScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const audienceValue = classScope ? `class:${classScope}` : audience;
    try {
      await api.createAnnouncement({ title: title.trim(), body: body.trim(), audience: audienceValue });
      setTitle("");
      setBody("");
      setAudience("all");
      setClassScope("");
      setShowForm(false);
      setSuccess("Duyuru yayınlandı.");
      onAnnouncementCreated?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Duyuru oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="principal-page-stack">
      <header className="sa-page-header">
        <span className="sa-kicker">Duyurular</span>
        <h1>Yayınlanan duyurular</h1>
        <p>Veli ve öğretmen iletişiminde kullanılan güncel kurum duyurularını yönet.</p>
        <button className="primary-action small-action" type="button" onClick={() => setShowForm((current) => !current)}>
          <Plus size={16} />
          {showForm ? "Formu kapat" : "Yeni duyuru"}
        </button>
      </header>

      {showForm ? (
        <article className="principal-surface-card">
          <h2>Yeni duyuru oluştur</h2>
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}
          <form className="principal-announcement-form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="field">
              <span>Başlık</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
            </label>

            <div className="principal-announcement-audience-grid">
              <label className="field">
                <span>Hedef kitle</span>
                <select value={audience} onChange={(event) => setAudience(event.target.value)} disabled={Boolean(classScope)}>
                  {audienceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>{audienceOptions.find((item) => item.value === audience)?.description}</small>
              </label>

              <label className="field">
                <span>Sınıf (opsiyonel)</span>
                <select value={classScope} onChange={(event) => setClassScope(event.target.value)}>
                  <option value="">Tüm hedef kitle</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <small>Seçilirse duyuru yalnızca o sınıf velilerine yöneltilir.</small>
              </label>
            </div>

            <label className="field">
              <span>İçerik</span>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={5} maxLength={4000} />
            </label>
            <button className="primary-action" type="submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={17} /> : null}
              Yayınla
            </button>
          </form>
        </article>
      ) : null}

      <article className="principal-surface-card">
        {data.announcements.length === 0 ? (
          <p className="empty-text">Yayınlanmış duyuru bulunamadı.</p>
        ) : (
          <div className="principal-list">
            {data.announcements.map((item) => (
              <div className="principal-list-row principal-announcement-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span className="principal-announcement-audience">
                    <Users size={14} aria-hidden />
                    {audienceLabel(item.audience.startsWith("class:") ? "guardians" : item.audience)}
                    {item.audience.startsWith("class:") ? " · Sınıf hedefli" : ""}
                  </span>
                </div>
                <small>{new Date(item.publishedAt).toLocaleDateString("tr-TR")}</small>
                <em>{item.body}</em>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
