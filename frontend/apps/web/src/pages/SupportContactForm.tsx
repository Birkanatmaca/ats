import { Inbox, LifeBuoy, Loader2, MessageSquare, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { AuthSession } from "../lib/api";
import { api } from "../lib/api";
import { PanelHeader } from "../admin/components/PanelHeader";
import { roleLabel } from "../admin/utils/labels";
import "./SupportContactForm.css";

export function SupportContactForm({ session }: { session: AuthSession }) {
  const [form, setForm] = useState({ type: "support", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const created = await api.createSupportTicket(form);
      setResult(`${created.subject} talebi destek ekibine iletildi.`);
      setForm({ type: "support", subject: "", message: "" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Destek talebi gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="sa-card support-contact-pane">
      <PanelHeader kicker="Destek ekibiyle iletişim" title="Bize ulaş" icon={<LifeBuoy size={22} />} />
      <div className="sa-card-body">
        <div className="sa-contact-meta">
          <span>{session.principal.name}</span>
          <strong>{session.principal.email || roleLabel(session.principal.role)}</strong>
        </div>
        {result && <div className="form-success">{result}</div>}
        {error && <div className="form-error">{error}</div>}
        <form className="support-contact-form sa-form-stack" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>Talep tipi</span>
            <div className="field-control">
              <MessageSquare size={17} />
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                <option value="support">Destek talebi</option>
                <option value="complaint">Şikayet</option>
                <option value="suggestion">Öneri</option>
                <option value="report">Rapor / hata bildirimi</option>
              </select>
            </div>
          </label>
          <label className="field">
            <span>Konu</span>
            <div className="field-control">
              <Inbox size={17} />
              <input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Kısa konu başlığı"
                maxLength={180}
                required
              />
            </div>
          </label>
          <label className="field">
            <span>Mesaj</span>
            <textarea
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Yaşadığınız sorunu, önerinizi veya raporunuzu yazın"
              rows={6}
              maxLength={2500}
              required
            />
          </label>
          <button className="primary-action" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            Destek ekibine ilet
          </button>
        </form>
      </div>
    </section>
  );
}
