import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { UserNotification } from "../../lib/api";
import { api } from "../../lib/api";
import { NoticeList, type NoticeItem } from "./NoticeList";
import "./NotificationBell.css";

function mapNotifications(items: UserNotification[]): NoticeItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    tone: item.kind.includes("absence") || item.kind.includes("attendance") ? "warning" : "info",
    read: Boolean(item.readAt)
  }));
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  async function loadNotifications() {
    setLoading(true);
    try {
      const items = await api.notifications();
      setNotifications(items ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

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
      const updated = await api.notificationMarkRead(notificationId);
      setNotifications((current) => current.map((item) => (item.id === notificationId ? updated : item)));
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
          <NoticeList notices={mapNotifications(notifications)} onNoticeClick={(id) => void markRead(id)} />
        </div>
      ) : null}
    </div>
  );
}
