import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import type { GuardianNotification, UserNotification } from "../../lib/api";
import { api } from "../../lib/api";
import { NoticeList, type NoticeItem } from "./NoticeList";
import "./NotificationBell.css";

type NotificationRecord = UserNotification | GuardianNotification;

function mapNotifications(items: NotificationRecord[]): NoticeItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    tone: item.kind.includes("absence") || item.kind.includes("attendance") ? "warning" : "info",
    read: Boolean(item.readAt)
  }));
}

export function NotificationBell({
  mode = "user",
  managePath = "/dashboard/notifications",
  onUnreadChange
}: {
  mode?: "user" | "guardian";
  managePath?: string;
  onUnreadChange?: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const items = mode === "guardian" ? await api.guardianNotifications() : await api.notifications();
      const list = items ?? [];
      setNotifications(list);
      onUnreadChange?.(list.filter((item) => !item.readAt).length);
    } catch {
      setNotifications([]);
      onUnreadChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [mode, onUnreadChange]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markRead(notificationId: string) {
    try {
      if (mode === "guardian") {
        const updated = await api.guardianNotificationMarkRead(notificationId);
        setNotifications((current) => current.map((item) => (item.id === notificationId ? updated : item)));
      } else {
        const updated = await api.notificationMarkRead(notificationId);
        setNotifications((current) => current.map((item) => (item.id === notificationId ? updated : item)));
      }
      const nextUnread = notifications.filter((item) => item.id !== notificationId && !item.readAt).length;
      onUnreadChange?.(notifications.find((item) => item.id === notificationId && !item.readAt) ? nextUnread : unreadCount);
      void loadNotifications();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        aria-expanded={open}
        aria-label={`Bildirimler${unreadCount > 0 ? `, ${unreadCount} okunmamış` : ""}`}
        className="notification-bell-trigger"
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) {
            void loadNotifications();
          }
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 ? <span className="notification-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notification-bell-panel">
          <header>
            <strong>Bildirimler</strong>
            {loading ? <small>Yükleniyor…</small> : <small>{unreadCount} okunmamış</small>}
          </header>
          <NoticeList notices={mapNotifications(notifications.slice(0, 6))} onNoticeClick={(id) => void markRead(id)} emptyText="Bildirim bulunmuyor." />
          <footer className="notification-bell-footer">
            <NavLink className="notification-bell-manage-link" to={managePath} onClick={() => setOpen(false)}>
              Tüm bildirimleri yönet
            </NavLink>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
