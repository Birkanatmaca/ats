import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Eye,
  Flag,
  Inbox,
  Loader2,
  MessageSquare,
  Pencil,
  Search,
  Send,
  Trash2
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { SupportTicket } from "../../lib/api";
import { api } from "../../lib/api";
import { Modal } from "../components/Modal";
import { supportTypeIcon } from "../components/adminIcons";
import { statusLabel } from "../utils/labels";
import "./SupportPage.css";

const STATUS_FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "open", label: "Açık" },
  { value: "in_review", label: "İncelemede" },
  { value: "resolved", label: "Çözüldü" },
  { value: "closed", label: "Kapalı" }
] as const;

function badgeTone(kind: "status" | "priority" | "type", value: string) {
  if (kind === "status") {
    if (value === "open") return "open";
    if (value === "in_review") return "review";
    if (value === "resolved") return "ok";
    return "off";
  }
  if (kind === "priority") {
    if (value === "urgent" || value === "high") return "urgent";
    if (value === "low") return "muted";
    return "wait";
  }
  if (value === "complaint") return "urgent";
  if (value === "suggestion") return "ok";
  if (value === "report") return "review";
  return "info";
}

export function SupportPage({ tickets, onRefresh }: { tickets: SupportTicket[]; onRefresh: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewTicket, setViewTicket] = useState<SupportTicket | null>(null);
  const [editTicket, setEditTicket] = useState<SupportTicket | null>(null);
  const [editForm, setEditForm] = useState({ status: "open", priority: "normal", internalNote: "" });
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [replying, setReplying] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const openCount = tickets.filter((ticket) => ticket.status === "open").length;
  const reviewCount = tickets.filter((ticket) => ticket.status === "in_review").length;
  const urgentCount = tickets.filter((ticket) => ticket.priority === "urgent" || ticket.priority === "high").length;

  const filteredTickets = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return tickets.filter((ticket) => {
      if (statusFilter !== "all" && ticket.status !== statusFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const blob = `${ticket.subject} ${ticket.message} ${ticket.reporterName} ${ticket.reporterEmail} ${ticket.tenant}`.toLocaleLowerCase("tr-TR");
      return blob.includes(needle);
    });
  }, [query, statusFilter, tickets]);

  function openEdit(ticket: SupportTicket) {
    setSupportError(null);
    setEditForm({ status: ticket.status, priority: ticket.priority, internalNote: ticket.internalNote ?? "" });
    setEditTicket(ticket);
  }

  function openView(ticket: SupportTicket) {
    setReplyText(ticket.internalNote ?? "");
    setSupportError(null);
    setViewTicket(ticket);
  }

  function closeView() {
    setViewTicket(null);
    setSupportError(null);
  }

  function closeEdit() {
    setEditTicket(null);
    setSupportError(null);
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTicket) return;
    setSaving(true);
    setSupportError(null);
    try {
      await api.updateSuperAdminSupportTicket(editTicket.id, editForm);
      closeEdit();
      await onRefresh();
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function saveReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewTicket) return;
    setReplying(true);
    setSupportError(null);
    try {
      await api.updateSuperAdminSupportTicket(viewTicket.id, {
        status: viewTicket.status,
        priority: viewTicket.priority,
        internalNote: replyText
      });
      closeView();
      await onRefresh();
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : "Cevap gönderilemedi.");
    } finally {
      setReplying(false);
    }
  }

  async function closeTicket(ticket: SupportTicket) {
    const ok = window.confirm(`"${ticket.subject}" talebi kapatılsın mı?`);
    if (!ok) return;
    setSupportError(null);
    try {
      await api.updateSuperAdminSupportTicket(ticket.id, {
        status: "closed",
        priority: ticket.priority,
        internalNote: ticket.internalNote ?? ""
      });
      await onRefresh();
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : "Kapatma işlemi başarısız.");
    }
  }

  useEffect(() => {
    if (viewTicket) {
      const fresh = tickets.find((ticket) => ticket.id === viewTicket.id);
      if (fresh && fresh !== viewTicket) setViewTicket(fresh);
    }
    if (editTicket) {
      const fresh = tickets.find((ticket) => ticket.id === editTicket.id);
      if (fresh && fresh !== editTicket) setEditTicket(fresh);
    }
  }, [tickets]);

  return (
    <section className="sup">
      <header className="sup-hero">
        <div>
          <p className="sup-kicker">Destek merkezi</p>
          <h1>Destek</h1>
        </div>
        <p className="sup-hero-note">Kurum talepleri, şikayetler ve öneriler</p>
      </header>

      <div className="sup-kpi-grid">
        <article className="sup-kpi">
          <div className="sup-kpi-icon">
            <Inbox size={18} />
          </div>
          <span>Toplam talep</span>
          <strong>{tickets.length}</strong>
        </article>
        <article className="sup-kpi">
          <div className="sup-kpi-icon sup-kpi-icon--green">
            <MessageSquare size={18} />
          </div>
          <span>Açık</span>
          <strong>{openCount}</strong>
        </article>
        <article className="sup-kpi">
          <div className="sup-kpi-icon sup-kpi-icon--amber">
            <Activity size={18} />
          </div>
          <span>İncelemede</span>
          <strong>{reviewCount}</strong>
        </article>
        <article className="sup-kpi">
          <div className="sup-kpi-icon sup-kpi-icon--rose">
            <Flag size={18} />
          </div>
          <span>Öncelikli</span>
          <strong>{urgentCount}</strong>
        </article>
      </div>

      <div className="sup-toolbar">
        <label className="sup-search">
          <Search size={16} />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Konu, gönderen veya kurum ara" type="search" value={query} />
        </label>
        <div className="sup-filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              className={statusFilter === filter.value ? "is-active" : undefined}
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {supportError && !viewTicket && !editTicket ? <div className="form-error sa-alert">{supportError}</div> : null}

      <article className="sup-card">
        {filteredTickets.length === 0 ? (
          <p className="sup-empty">{tickets.length === 0 ? "Henüz destek talebi yok." : "Bu filtrede destek talebi bulunamadı."}</p>
        ) : (
          <div className="sup-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Konu</th>
                  <th>Özet</th>
                  <th>Tür</th>
                  <th>Kurum</th>
                  <th>Durum</th>
                  <th>Öncelik</th>
                  <th>Tarih</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <div className="sup-subject">
                        <span className="sup-type-icon">{supportTypeIcon(ticket.type)}</span>
                        <div>
                          <strong>{ticket.subject}</strong>
                          <small>{ticket.reporterName}</small>
                        </div>
                      </div>
                    </td>
                    <td className="sup-preview">{ticket.message.length > 72 ? `${ticket.message.slice(0, 72)}…` : ticket.message}</td>
                    <td>
                      <span className={`sup-badge sup-badge--${badgeTone("type", ticket.type)}`}>{statusLabel(ticket.type)}</span>
                    </td>
                    <td>{ticket.tenant}</td>
                    <td>
                      <span className={`sup-badge sup-badge--${badgeTone("status", ticket.status)}`}>{statusLabel(ticket.status)}</span>
                    </td>
                    <td>
                      <span className={`sup-badge sup-badge--${badgeTone("priority", ticket.priority)}`}>{statusLabel(ticket.priority)}</span>
                    </td>
                    <td className="sup-date">{new Date(ticket.createdAt).toLocaleDateString("tr-TR")}</td>
                    <td>
                      <div className="sup-row-actions">
                        <button aria-label="Görüntüle" className="sup-btn sup-btn--icon" onClick={() => openView(ticket)} title="Görüntüle" type="button">
                          <Eye size={15} />
                        </button>
                        <button aria-label="Düzenle" className="sup-btn sup-btn--icon" onClick={() => openEdit(ticket)} title="Düzenle" type="button">
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label="Kapat"
                          className="sup-btn sup-btn--icon sup-btn--danger"
                          disabled={ticket.status === "closed"}
                          onClick={() => void closeTicket(ticket)}
                          title="Talebi kapat"
                          type="button"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <Modal
        icon={supportTypeIcon(viewTicket?.type ?? "support")}
        kicker={viewTicket ? `${viewTicket.tenant} · ${new Date(viewTicket.createdAt).toLocaleDateString("tr-TR")}` : ""}
        onClose={closeView}
        open={viewTicket !== null}
        size="lg"
        title={viewTicket?.subject ?? "Talep detayı"}
      >
        {viewTicket && (
          <div className="sup-view">
            <div className="sup-view-meta">
              <div>
                <span>Gönderen</span>
                <strong>{viewTicket.reporterName}</strong>
              </div>
              <div>
                <span>E-posta</span>
                <strong>{viewTicket.reporterEmail || "—"}</strong>
              </div>
              <div>
                <span>Kurum</span>
                <strong>{viewTicket.tenant}</strong>
              </div>
              <div>
                <span>Durum</span>
                <strong>
                  <span className={`sup-badge sup-badge--${badgeTone("status", viewTicket.status)}`}>{statusLabel(viewTicket.status)}</span>
                </strong>
              </div>
              <div>
                <span>Öncelik</span>
                <strong>
                  <span className={`sup-badge sup-badge--${badgeTone("priority", viewTicket.priority)}`}>{statusLabel(viewTicket.priority)}</span>
                </strong>
              </div>
              <div>
                <span>Tür</span>
                <strong>
                  <span className={`sup-badge sup-badge--${badgeTone("type", viewTicket.type)}`}>{statusLabel(viewTicket.type)}</span>
                </strong>
              </div>
            </div>

            <div className="sup-view-block">
              <div className="sup-view-label">
                <AlertCircle size={15} />
                Talep içeriği
              </div>
              <p>{viewTicket.message}</p>
            </div>

            {viewTicket.internalNote ? (
              <div className="sup-view-block sup-view-block--note">
                <div className="sup-view-label">
                  <CheckCircle2 size={15} />
                  Mevcut iç not / cevap
                </div>
                <p>{viewTicket.internalNote}</p>
              </div>
            ) : null}

            {supportError ? <div className="form-error">{supportError}</div> : null}
            <form className="sup-reply" onSubmit={(event) => void saveReply(event)}>
              <label className="field">
                <span>İç not / Cevap</span>
                <textarea
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Destek ekibinin göreceği not veya kullanıcıya iletilecek cevap…"
                  rows={5}
                  value={replyText}
                />
              </label>
              <div className="sa-modal-actions">
                <button className="ghost-action" onClick={closeView} type="button">
                  Kapat
                </button>
                <button className="ghost-action" onClick={() => openEdit(viewTicket)} type="button">
                  <Pencil size={16} />
                  Düzenle
                </button>
                <button className="primary-action" disabled={replying} type="submit">
                  {replying ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                  Cevabı kaydet
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <Modal icon={<Pencil size={20} />} kicker={editTicket?.subject ?? ""} onClose={closeEdit} open={editTicket !== null} title="Talebi düzenle">
        {supportError ? <div className="form-error">{supportError}</div> : null}
        <form className="sa-modal-form" onSubmit={(event) => void saveEdit(event)}>
          <label className="field">
            <span>Durum</span>
            <div className="field-control">
              <CheckCircle2 size={17} />
              <select onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))} value={editForm.status}>
                <option value="open">Açık</option>
                <option value="in_review">İncelemede</option>
                <option value="resolved">Çözüldü</option>
                <option value="closed">Kapalı</option>
              </select>
            </div>
          </label>
          <label className="field">
            <span>Öncelik</span>
            <div className="field-control">
              <Flag size={17} />
              <select onChange={(event) => setEditForm((form) => ({ ...form, priority: event.target.value }))} value={editForm.priority}>
                <option value="low">Düşük</option>
                <option value="normal">Normal</option>
                <option value="high">Yüksek</option>
                <option value="urgent">Acil</option>
              </select>
            </div>
          </label>
          <label className="field">
            <span>İç not</span>
            <textarea
              onChange={(event) => setEditForm((form) => ({ ...form, internalNote: event.target.value }))}
              placeholder="Destek ekibinin göreceği inceleme notu"
              rows={5}
              value={editForm.internalNote}
            />
          </label>
          <div className="sa-modal-actions">
            <button className="ghost-action" onClick={closeEdit} type="button">
              Vazgeç
            </button>
            <button className="primary-action" disabled={saving} type="submit">
              {saving ? <Loader2 className="spin" size={18} /> : <Pencil size={18} />}
              Kaydet
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
