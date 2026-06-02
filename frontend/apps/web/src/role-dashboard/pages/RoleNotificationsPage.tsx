import { Bell, CheckCheck, Eye, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GuardianNotification, UserNotification } from "../../lib/api";
import { api } from "../../lib/api";
import { TablePagination } from "../components/TablePagination";
import { usePaginatedRows } from "../hooks/usePaginatedRows";
import { GuidanceKpiCard } from "../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../guidance/components/GuidanceMetricGrid";
import { formatGuidanceDate } from "../guidance/utils";
import { notificationKindLabel } from "../utils/labels";
import "../guidance/GuidanceDataPage.css";

const PAGE_SIZE = 12;

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  kind: string;
  readAt?: string | null;
  createdAt: string;
};

export function RoleNotificationsPage({
  mode = "user",
  onUnreadChange
}: {
  mode?: "user" | "guardian";
  onUnreadChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [readFilter, setReadFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result =
        mode === "guardian"
          ? ((await api.guardianNotifications()) ?? []).map(mapGuardianRow)
          : ((await api.notifications()) ?? []).map(mapUserRow);
      setItems(result);
      onUnreadChange?.(result.filter((item) => !item.readAt).length);
    } catch {
      setItems([]);
      onUnreadChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [mode, onUnreadChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const unread = items.filter((item) => !item.readAt).length;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = items.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length;
    const attendance = items.filter((item) => item.kind.includes("absence") || item.kind.includes("attendance")).length;
    return { total: items.length, unread, recent, attendance };
  }, [items]);

  const kindOptions = useMemo(() => {
    const set = new Set(items.map((item) => item.kind));
    return [...set].sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return items.filter((item) => {
      const readMatch =
        readFilter === "all" ||
        (readFilter === "unread" && !item.readAt) ||
        (readFilter === "read" && Boolean(item.readAt));
      const kindMatch = kindFilter === "all" || item.kind === kindFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${item.title} ${item.body} ${notificationKindLabel(item.kind)}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return readMatch && kindMatch && queryMatch;
    });
  }, [items, readFilter, kindFilter, query]);

  const filterKey = `${readFilter}|${kindFilter}|${query}|${items.length}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filteredItems, filterKey, PAGE_SIZE);

  async function markRead(notificationId: string) {
    try {
      if (mode === "guardian") {
        await api.guardianNotificationMarkRead(notificationId);
      } else {
        await api.notificationMarkRead(notificationId);
      }
      await load();
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    const unread = items.filter((item) => !item.readAt);
    for (const item of unread) {
      try {
        if (mode === "guardian") {
          await api.guardianNotificationMarkRead(item.id);
        } else {
          await api.notificationMarkRead(item.id);
        }
      } catch {
        /* ignore single failure */
      }
    }
    await load();
  }

  async function deleteNotification(notificationId: string) {
    const item = items.find((entry) => entry.id === notificationId);
    if (!item) return;
    if (!window.confirm(`"${item.title}" bildirimini silmek istediğinize emin misiniz?`)) {
      return;
    }
    setDeletingId(notificationId);
    try {
      if (mode === "guardian") {
        await api.guardianNotificationDelete(notificationId);
      } else {
        await api.notificationDelete(notificationId);
      }
      await load();
    } catch {
      /* ignore */
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="guidance-page-stack guidance-data-page role-notifications-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<Bell size={20} />} label="Toplam" value={stats.total} detail="Bildirim kaydı" tone="sky" />
        <GuidanceKpiCard icon={<Eye size={20} />} label="Okunmamış" value={stats.unread} detail="Aksiyon bekleyen" tone="amber" />
        <GuidanceKpiCard icon={<Bell size={20} />} label="Son 7 gün" value={stats.recent} detail="Yeni bildirim" tone="violet" />
        <GuidanceKpiCard icon={<Bell size={20} />} label="Devamsızlık" value={stats.attendance} detail="İlgili bildirim" tone="emerald" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Bildirimler</h2>
          <div className="guidance-data-card-head-actions">
            <span>{loading ? "Yükleniyor…" : `${filteredItems.length} bildirim`}</span>
            <button className="ghost-action small-action" type="button" onClick={() => void markAllRead()} disabled={stats.unread === 0 || loading}>
              <CheckCheck size={16} />
              Tümünü okundu işaretle
            </button>
          </div>
        </header>

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={readFilter} onChange={(event) => setReadFilter(event.target.value)} aria-label="Okunma filtresi">
            <option value="all">Tümü</option>
            <option value="unread">Okunmamış</option>
            <option value="read">Okunmuş</option>
          </select>
          <select className="guidance-data-select" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} aria-label="Tür filtresi">
            <option value="all">Tüm türler</option>
            {kindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {notificationKindLabel(kind)}
              </option>
            ))}
          </select>
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Başlık, mesaj…" type="search" />
          </label>
        </div>

        {loading ? (
          <p className="guidance-data-empty">Bildirimler yükleniyor…</p>
        ) : filteredItems.length === 0 ? (
          <p className="guidance-data-empty">{items.length === 0 ? "Bildirim bulunmuyor." : "Filtrelere uyan bildirim bulunamadı."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table role-notifications-table">
                <thead>
                  <tr>
                    <th>Başlık</th>
                    <th>Tür</th>
                    <th>Mesaj</th>
                    <th>Tarih</th>
                    <th>Durum</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((item) => (
                    <tr key={item.id} className={!item.readAt ? "is-unread" : undefined}>
                      <td>
                        <span className="guidance-data-primary">{item.title}</span>
                      </td>
                      <td>
                        <span className="guidance-data-badge">{notificationKindLabel(item.kind)}</span>
                      </td>
                      <td>
                        <p className="guidance-data-text">{item.body}</p>
                      </td>
                      <td className="guidance-data-date-cell">{formatGuidanceDate(item.createdAt)}</td>
                      <td>
                        <span className={item.readAt ? "guidance-data-badge guidance-data-badge--slate" : "guidance-data-badge guidance-data-badge--amber"}>
                          {item.readAt ? "Okundu" : "Yeni"}
                        </span>
                      </td>
                      <td>
                        <div className="guidance-data-actions">
                          {!item.readAt ? (
                            <button className="ghost-action" type="button" onClick={() => void markRead(item.id)} title="Okundu işaretle">
                              <CheckCheck size={15} />
                              Okundu
                            </button>
                          ) : null}
                          <button
                            className="ghost-action danger"
                            type="button"
                            onClick={() => void deleteNotification(item.id)}
                            disabled={deletingId === item.id}
                            title="Bildirimi sil"
                          >
                            <Trash2 size={15} />
                            {deletingId === item.id ? "Siliniyor…" : "Sil"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} />
          </>
        )}
      </article>
    </section>
  );
}

function mapUserRow(item: UserNotification): NotificationRow {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    kind: item.kind,
    readAt: item.readAt,
    createdAt: item.createdAt
  };
}

function mapGuardianRow(item: GuardianNotification): NotificationRow {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    kind: item.kind,
    readAt: item.readAt,
    createdAt: item.createdAt
  };
}
