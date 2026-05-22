import { Inbox, LifeBuoy, Loader2, MessageSquare, Plus, Search, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { AuthSession, SupportTicket } from "../../lib/api";
import { api } from "../../lib/api";
import { roleLabel } from "../../admin/utils/labels";
import { TablePagination } from "../components/TablePagination";
import { usePaginatedRows } from "../hooks/usePaginatedRows";
import { GuidanceKpiCard } from "../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../guidance/components/GuidanceMetricGrid";
import { formatGuidanceDate } from "../guidance/utils";
import {
  supportTicketStatusBadgeClass,
  supportTicketStatusLabel,
  supportTicketStatuses,
  supportTicketTypeLabel,
  supportTicketTypes
} from "../utils/labels";
import "../guidance/GuidanceDataPage.css";

const PAGE_SIZE = 12;

const emptyForm = { type: "support", subject: "", message: "" };

export function RoleSupportPage({ session }: { session: AuthSession }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.supportTickets();
      setTickets(items ?? []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === "open").length;
    const inReview = tickets.filter((ticket) => ticket.status === "in_review").length;
    const resolved = tickets.filter((ticket) => ticket.status === "resolved" || ticket.status === "closed").length;
    return { total: tickets.length, open, inReview, resolved };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return tickets.filter((ticket) => {
      const statusMatch = statusFilter === "all" || ticket.status === statusFilter;
      const typeMatch = typeFilter === "all" || ticket.type === typeFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${ticket.subject} ${ticket.message} ${supportTicketTypeLabel(ticket.type)} ${supportTicketStatusLabel(ticket.status)}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return statusMatch && typeMatch && queryMatch;
    });
  }, [tickets, statusFilter, typeFilter, query]);

  const filterKey = `${statusFilter}|${typeFilter}|${query}|${tickets.length}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filteredTickets, filterKey, PAGE_SIZE);

  function openModal() {
    setError(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setError(null);
    setSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createSupportTicket(form);
      closeModal();
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Destek talebi gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="guidance-page-stack guidance-data-page role-support-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<LifeBuoy size={20} />} label="Toplam talep" value={stats.total} detail="Gönderilen" tone="sky" />
        <GuidanceKpiCard icon={<Inbox size={20} />} label="Açık" value={stats.open} detail="Yanıt bekliyor" tone="amber" />
        <GuidanceKpiCard icon={<MessageSquare size={20} />} label="İnceleniyor" value={stats.inReview} detail="Destek ekibi" tone="violet" />
        <GuidanceKpiCard icon={<LifeBuoy size={20} />} label="Kapanan" value={stats.resolved} detail="Çözüldü / kapalı" tone="emerald" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Destek taleplerim</h2>
          <div className="guidance-data-card-head-actions">
            <span>{loading ? "Yükleniyor…" : `${filteredTickets.length} talep`}</span>
            <button className="primary-action small-action" type="button" onClick={openModal}>
              <Plus size={16} />
              Yeni talep
            </button>
          </div>
        </header>

        {error && !modalOpen ? <div className="guidance-data-inline-error">{error}</div> : null}

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Durum filtresi">
            {supportTicketStatuses.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <select className="guidance-data-select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Tür filtresi">
            <option value="all">Tüm türler</option>
            {supportTicketTypes.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Konu, mesaj…" type="search" />
          </label>
        </div>

        {loading ? (
          <p className="guidance-data-empty">Talepler yükleniyor…</p>
        ) : filteredTickets.length === 0 ? (
          <p className="guidance-data-empty">{tickets.length === 0 ? "Henüz destek talebi göndermediniz." : "Filtrelere uyan talep bulunamadı."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table role-support-table">
                <thead>
                  <tr>
                    <th>Konu</th>
                    <th>Tür</th>
                    <th>Durum</th>
                    <th>Öncelik</th>
                    <th>Mesaj</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <span className="guidance-data-primary">{ticket.subject}</span>
                      </td>
                      <td>
                        <span className="guidance-data-badge">{supportTicketTypeLabel(ticket.type)}</span>
                      </td>
                      <td>
                        <span className={supportTicketStatusBadgeClass(ticket.status)}>{supportTicketStatusLabel(ticket.status)}</span>
                      </td>
                      <td>
                        <span className="guidance-data-badge guidance-data-badge--slate">{ticket.priority}</span>
                      </td>
                      <td>
                        <p className="guidance-data-text">{ticket.message}</p>
                      </td>
                      <td className="guidance-data-date-cell">{formatGuidanceDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} />
          </>
        )}
      </article>

      <article className="guidance-data-card role-support-contact-card">
        <header className="guidance-data-card-head">
          <h2>İletişim bilgileri</h2>
        </header>
        <div className="role-support-contact-body">
          <p>
            <strong>{session.principal.name}</strong>
            <span>{session.principal.email || roleLabel(session.principal.role)}</span>
          </p>
          <p className="role-support-contact-hint">Yeni talepler destek ekibine iletilir; durum güncellemeleri bu listede görünür.</p>
        </div>
      </article>

      {modalOpen ? (
        <div className="guidance-modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="guidance-modal guidance-support-modal" role="dialog" aria-modal aria-labelledby="role-support-modal-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="role-support-modal-title">Yeni destek talebi</h3>
            {error ? <div className="form-error">{error}</div> : null}
            <form className="role-support-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Talep tipi</span>
                <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} required>
                  {supportTicketTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Konu</span>
                <input
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                  placeholder="Kısa konu başlığı"
                  maxLength={180}
                  required
                />
              </label>
              <label className="field">
                <span>Mesaj</span>
                <textarea
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  placeholder="Sorununuzu veya önerinizi yazın"
                  rows={6}
                  maxLength={2500}
                  required
                />
              </label>
              <div className="guidance-modal-actions">
                <button className="ghost-action" type="button" onClick={closeModal} disabled={submitting}>
                  İptal
                </button>
                <button className="primary-action" type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
                  Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
