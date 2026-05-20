import { AlertCircle, Bell, CheckCircle2 } from "lucide-react";

export type NoticeItem = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warning";
  read?: boolean;
};

const icons = {
  info: <Bell size={16} />,
  success: <CheckCircle2 size={16} />,
  warning: <AlertCircle size={16} />
};

export function NoticeList({
  notices,
  onNoticeClick,
  emptyText = "Bildirim bulunmuyor."
}: {
  notices: NoticeItem[];
  onNoticeClick?: (noticeId: string) => void;
  emptyText?: string;
}) {
  if (notices.length === 0) {
    return <p className="empty-text">{emptyText}</p>;
  }

  return (
    <div className="notice-list">
      {notices.map((notice) => (
        <article
          className={`notice-row notice-row--${notice.tone}${notice.read ? " is-read" : ""}${onNoticeClick ? " is-clickable" : ""}`}
          key={notice.id}
          onClick={onNoticeClick ? () => onNoticeClick(notice.id) : undefined}
          onKeyDown={
            onNoticeClick
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onNoticeClick(notice.id);
                  }
                }
              : undefined
          }
          role={onNoticeClick ? "button" : undefined}
          tabIndex={onNoticeClick ? 0 : undefined}
        >
          <span>{icons[notice.tone]}</span>
          <div>
            <strong>{notice.title}</strong>
            <p>{notice.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
