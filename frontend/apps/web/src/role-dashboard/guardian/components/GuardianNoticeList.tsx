import { AlertCircle, Bell, CheckCircle2 } from "lucide-react";
import type { GuardianNotice } from "../types";

const icons = {
  info: <Bell size={16} />,
  success: <CheckCircle2 size={16} />,
  warning: <AlertCircle size={16} />
};

export function GuardianNoticeList({
  notices,
  onNoticeClick
}: {
  notices: GuardianNotice[];
  onNoticeClick?: (noticeId: string) => void;
}) {
  return (
    <div className="guardian-notice-list">
      {notices.map((notice) => (
        <article
          className={`guardian-notice-row guardian-notice-row--${notice.tone}${onNoticeClick ? " is-clickable" : ""}`}
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
