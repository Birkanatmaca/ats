import { Activity, CheckCircle2, Flag, Inbox, LifeBuoy, Loader2, MessageSquare, Pencil } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { SupportTicket } from "../../lib/api";
import { api } from "../../lib/api";
import { PanelHeader } from "../components/PanelHeader";
import { Metric } from "../components/Metric";
import { StatusBadge } from "../components/StatusBadge";
import { supportTypeIcon } from "../components/adminIcons";
import "./SupportPage.css";

export function SupportPage({ tickets, onRefresh }: { tickets: SupportTicket[]; onRefresh: () => Promise<void> }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(tickets[0] ?? null);
  const [editForm, setEditForm] = useState({ status: "open", priority: "normal", internalNote: "" });
  const [saving, setSaving] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const openCount = tickets.filter((ticket) => ticket.status === "open").length;
  const reviewCount = tickets.filter((ticket) => ticket.status === "in_review").length;
  const urgentCount = tickets.filter((ticket) => ticket.priority === "urgent" || ticket.priority === "high").length;
  const filteredTickets = tickets.filter((ticket) => statusFilter === "all" || ticket.status === statusFilter);

  async function updateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket) {
      return;
    }
    setSaving(true);
    setSupportError(null);
    try {
      const updated = await api.updateSuperAdminSupportTicket(selectedTicket.id, editForm);
      setSelectedTicket(updated);
      await onRefresh();
    } catch (updateError) {
      setSupportError(updateError instanceof Error ? updateError.message : "Destek talebi güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!selectedTicket && tickets[0]) {
      setSelectedTicket(tickets[0]);
      return;
    }
    if (selectedTicket) {
      const fresh = tickets.find((ticket) => ticket.id === selectedTicket.id);
      if (fresh && fresh !== selectedTicket) {
        setSelectedTicket(fresh);
      }
    }
  }, [tickets, selectedTicket]);

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }
    setEditForm({
      status: selectedTicket.status,
      priority: selectedTicket.priority,
      internalNote: selectedTicket.internalNote ?? ""
    });
  }, [selectedTicket]);

  return (
    <section className="sa-page-stack">
      <section className="sa-kpi-row">
        <Metric icon={<Inbox size={21} />} label="Toplam talep" value={tickets.length} tone="sky" hint="ticket ve öneri" />
        <Metric icon={<MessageSquare size={21} />} label="Açık" value={openCount} tone="mint" hint="yanıt bekleyen" />
        <Metric icon={<Activity size={21} />} label="İncelemede" value={reviewCount} tone="amber" hint="destek ekibinde" />
        <Metric icon={<Flag size={21} />} label="Öncelikli" value={urgentCount} tone="coral" hint="yüksek/acil" />
      </section>

      <section className="sa-split">
        <section className="sa-card">
          <PanelHeader
            kicker="Destek merkezi"
            title="Şikayet, ticket, rapor ve öneriler"
            icon={<LifeBuoy size={22} />}
            trailing={
              <div className="sa-inline-controls">
                <StatusBadge value="open" />
                <StatusBadge value="in_review" />
              </div>
            }
          />
          <div className="sa-card-body">
            <div className="sa-inline-controls sa-support-filters">
              {[
                ["all", "Tümü"],
                ["open", "Açık"],
                ["in_review", "İncelemede"],
                ["resolved", "Çözüldü"],
                ["closed", "Kapalı"]
              ].map(([value, label]) => (
                <button className={`sa-chip ${statusFilter === value ? "is-active" : ""}`} key={value} type="button" onClick={() => setStatusFilter(value)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="sa-data-grid">
              <div className="sa-row-head sa-support-head">
                <span>Talep</span>
                <span>Kurum</span>
                <span>Tip</span>
                <span>Durum</span>
                <span>Öncelik</span>
              </div>
              {filteredTickets.map((ticket) => (
                <button
                  className={`sa-row-body sa-support-row support-ticket-row ${selectedTicket?.id === ticket.id ? "sa-row-selected" : ""}`}
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="support-ticket-cell">
                    <div className="sa-type-icon">{supportTypeIcon(ticket.type)}</div>
                    <div>
                      <strong>{ticket.subject}</strong>
                      <small>
                        {ticket.reporterName} · {new Date(ticket.createdAt).toLocaleString("tr-TR")}
                      </small>
                    </div>
                  </div>
                  <span>{ticket.tenant}</span>
                  <StatusBadge value={ticket.type} />
                  <StatusBadge value={ticket.status} />
                  <StatusBadge value={ticket.priority} />
                </button>
              ))}
              {filteredTickets.length === 0 && <p className="empty-text">Bu filtrede destek talebi yok.</p>}
            </div>
          </div>
        </section>

        <aside className="sa-card support-detail-pane">
          <PanelHeader kicker="İnceleme" title={selectedTicket?.subject ?? "Talep seç"} icon={<LifeBuoy size={22} />} />
          <div className="sa-card-body">
            {supportError && <div className="form-error workspace-error sa-alert">{supportError}</div>}
            {selectedTicket ? (
              <div className="sa-form-stack">
                <div className="sa-message-block">
                  <div className="sa-message-meta">
                    <span>{selectedTicket.reporterName}</span>
                    <strong>{selectedTicket.reporterEmail || selectedTicket.tenant}</strong>
                  </div>
                  <p>{selectedTicket.message}</p>
                </div>

                <form className="sa-form-stack" onSubmit={(event) => void updateTicket(event)}>
                  <label className="field">
                    <span>Durum</span>
                    <div className="field-control">
                      <CheckCircle2 size={17} />
                      <select value={editForm.status} onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))}>
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
                      <select value={editForm.priority} onChange={(event) => setEditForm((form) => ({ ...form, priority: event.target.value }))}>
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
                      onChange={(event) => setEditForm((form) => ({ ...form, internalNote: event.target.value }))}
                      rows={6}
                      placeholder="Destek ekibinin göreceği inceleme notu"
                    />
                  </label>
                  <button className="primary-action" type="submit" disabled={saving}>
                    {saving ? <Loader2 className="spin" size={18} /> : <Pencil size={18} />}
                    İncelemeyi kaydet
                  </button>
                </form>
              </div>
            ) : (
              <p className="empty-text">İncelemek için soldan bir destek talebi seç.</p>
            )}
          </div>
        </aside>
      </section>
    </section>
  );
}
