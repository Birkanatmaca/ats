import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Eye,
  Flag,
  Inbox,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
  Trash2
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { SupportTicket } from "../../lib/api";
import { api } from "../../lib/api";
import { Metric } from "../components/Metric";
import { Modal } from "../components/Modal";
import { PanelHeader } from "../components/PanelHeader";
import { StatusBadge } from "../components/StatusBadge";
import { supportTypeIcon } from "../components/adminIcons";
import "./SupportPage.css";

export function SupportPage({ tickets, onRefresh }: { tickets: SupportTicket[]; onRefresh: () => Promise<void> }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewTicket, setViewTicket] = useState<SupportTicket | null>(null);
  const [editTicket, setEditTicket] = useState<SupportTicket | null>(null);
  const [editForm, setEditForm] = useState({ status: "open", priority: "normal", internalNote: "" });
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [replying, setReplying] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const reviewCount = tickets.filter((t) => t.status === "in_review").length;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" || t.priority === "high").length;
  const filteredTickets = tickets.filter((t) => statusFilter === "all" || t.status === statusFilter);

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
      const fresh = tickets.find((t) => t.id === viewTicket.id);
      if (fresh && fresh !== viewTicket) setViewTicket(fresh);
    }
    if (editTicket) {
      const fresh = tickets.find((t) => t.id === editTicket.id);
      if (fresh && fresh !== editTicket) setEditTicket(fresh);
    }
  }, [tickets]);

  return (
    <section className="sa-page-stack support-page">
      {/* ── KPI şeridi ── */}
      <div className="support-page-header">
        <div>
          <span className="sa-kicker">Süper admin</span>
          <h1>Destek</h1>
        </div>
      </div>

      <section className="sa-kpi-row">
        <Metric icon={<Inbox size={21} />} label="Toplam talep" value={tickets.length} tone="sky" hint="ticket ve öneri" />
        <Metric icon={<MessageSquare size={21} />} label="Açık" value={openCount} tone="mint" hint="yanıt bekleyen" />
        <Metric icon={<Activity size={21} />} label="İncelemede" value={reviewCount} tone="amber" hint="destek ekibinde" />
        <Metric icon={<Flag size={21} />} label="Öncelikli" value={urgentCount} tone="coral" hint="yüksek/acil" />
      </section>

      {/* ── Tablo kartı ── */}
      <section className="sa-card">
        <PanelHeader
          kicker="Destek merkezi"
          title="Tüm talepler"
          icon={<LifeBuoy size={22} />}
          trailing={
            <div className="sa-inline-controls support-filter-chips">
              {[
                ["all", "Tümü"],
                ["open", "Açık"],
                ["in_review", "İncelemede"],
                ["resolved", "Çözüldü"],
                ["closed", "Kapalı"]
              ].map(([val, lbl]) => (
                <button className={`sa-chip ${statusFilter === val ? "is-active" : ""}`} key={val} type="button" onClick={() => setStatusFilter(val)}>
                  {lbl}
                </button>
              ))}
            </div>
          }
        />

        {supportError && (
          <div className="form-error" style={{ margin: "0 18px 0" }}>
            {supportError}
          </div>
        )}

        <div className="sa-card-body" style={{ paddingTop: 10 }}>
          <div className="sa-data-grid">
            {/* Tablo başlığı */}
            <div className="sa-row-head support-table-head">
              <span>Konu</span>
              <span>İçerik özeti</span>
              <span>Tür</span>
              <span>Kurum</span>
              <span>Durum</span>
              <span>Öncelik</span>
              <span>Tarih</span>
              <span>İşlem</span>
            </div>

            {filteredTickets.map((ticket) => (
              <div className="sa-row-body support-table-row" key={ticket.id}>
                {/* Konu */}
                <div className="support-cell-subject">
                  <div className="sa-type-icon">{supportTypeIcon(ticket.type)}</div>
                  <div>
                    <strong>{ticket.subject}</strong>
                    <small>{ticket.reporterName}</small>
                  </div>
                </div>
                {/* İçerik özeti */}
                <span className="support-cell-preview">{ticket.message.length > 60 ? ticket.message.slice(0, 60) + "…" : ticket.message}</span>
                {/* Tür */}
                <StatusBadge value={ticket.type} />
                {/* Kurum */}
                <span className="support-cell-tenant">{ticket.tenant}</span>
                {/* Durum */}
                <StatusBadge value={ticket.status} />
                {/* Öncelik */}
                <StatusBadge value={ticket.priority} />
                {/* Tarih */}
                <span className="support-cell-date">{new Date(ticket.createdAt).toLocaleDateString("tr-TR")}</span>
                {/* İşlemler */}
                <div className="sa-row-actions">
                  <button
                    className="sa-icon-btn"
                    type="button"
                    aria-label="Görüntüle"
                    title="Görüntüle"
                    onClick={() => openView(ticket)}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    className="sa-icon-btn"
                    type="button"
                    aria-label="Düzenle"
                    title="Düzenle"
                    onClick={() => openEdit(ticket)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="sa-icon-btn danger"
                    type="button"
                    aria-label="Kapat"
                    title="Talebi kapat"
                    onClick={() => void closeTicket(ticket)}
                    disabled={ticket.status === "closed"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}

            {filteredTickets.length === 0 && (
              <p className="empty-text" style={{ padding: "14px 12px" }}>
                Bu filtrede destek talebi bulunamadı.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ══ GÖRÜNTÜLE MODALI ══ */}
      <Modal
        open={viewTicket !== null}
        onClose={closeView}
        title={viewTicket?.subject ?? "Talep detayı"}
        kicker={viewTicket ? `${viewTicket.tenant} · ${new Date(viewTicket.createdAt).toLocaleDateString("tr-TR")}` : ""}
        icon={supportTypeIcon(viewTicket?.type ?? "support")}
        size="lg"
      >
        {viewTicket && (
          <div className="support-view-body">
            {/* Meta */}
            <div className="support-view-meta">
              <div className="support-view-meta-row">
                <span>Gönderen</span>
                <strong>{viewTicket.reporterName}</strong>
              </div>
              <div className="support-view-meta-row">
                <span>E-posta</span>
                <strong>{viewTicket.reporterEmail || "—"}</strong>
              </div>
              <div className="support-view-meta-row">
                <span>Kurum</span>
                <strong>{viewTicket.tenant}</strong>
              </div>
              <div className="support-view-meta-row">
                <span>Durum</span>
                <StatusBadge value={viewTicket.status} />
              </div>
              <div className="support-view-meta-row">
                <span>Öncelik</span>
                <StatusBadge value={viewTicket.priority} />
              </div>
              <div className="support-view-meta-row">
                <span>Tür</span>
                <StatusBadge value={viewTicket.type} />
              </div>
            </div>

            {/* Mesaj */}
            <div className="support-view-message">
              <div className="support-view-message-label">
                <AlertCircle size={15} />
                Talep içeriği
              </div>
              <p>{viewTicket.message}</p>
            </div>

            {/* Mevcut iç not */}
            {viewTicket.internalNote && (
              <div className="support-view-existing-note">
                <div className="support-view-message-label">
                  <CheckCircle2 size={15} />
                  Mevcut iç not / cevap
                </div>
                <p>{viewTicket.internalNote}</p>
              </div>
            )}

            {/* Cevap / not formu */}
            {supportError && <div className="form-error">{supportError}</div>}
            <form className="support-reply-form" onSubmit={(e) => void saveReply(e)}>
              <label className="field">
                <span>İç not / Cevap</span>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  placeholder="Destek ekibinin göreceği not veya kullanıcıya iletilecek cevap…"
                />
              </label>
              <div className="sa-modal-actions">
                <button type="button" className="ghost-action" onClick={closeView}>
                  Kapat
                </button>
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() => openEdit(viewTicket)}
                >
                  <Pencil size={16} />
                  Düzenle
                </button>
                <button className="primary-action" type="submit" disabled={replying}>
                  {replying ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                  Cevabı kaydet
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* ══ DÜZENLE MODALI ══ */}
      <Modal
        open={editTicket !== null}
        onClose={closeEdit}
        title="Talebi düzenle"
        kicker={editTicket?.subject ?? ""}
        icon={<Pencil size={20} />}
      >
        {supportError && <div className="form-error">{supportError}</div>}
        <form className="sa-modal-form" onSubmit={(e) => void saveEdit(e)}>
          <label className="field">
            <span>Durum</span>
            <div className="field-control">
              <CheckCircle2 size={17} />
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
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
              <select value={editForm.priority} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}>
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
              value={editForm.internalNote}
              onChange={(e) => setEditForm((f) => ({ ...f, internalNote: e.target.value }))}
              rows={5}
              placeholder="Destek ekibinin göreceği inceleme notu"
            />
          </label>
          <div className="sa-modal-actions">
            <button type="button" className="ghost-action" onClick={closeEdit}>
              Vazgeç
            </button>
            <button className="primary-action" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : <Pencil size={18} />}
              Kaydet
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
