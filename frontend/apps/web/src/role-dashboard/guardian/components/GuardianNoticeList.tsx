import { AlertCircle, Bell, CheckCircle2 } from "lucide-react";
import type { GuardianNotice } from "../types";

const icons = {
  info: <Bell size={16} />,
  success: <CheckCircle2 size={16} />,
  warning: <AlertCircle size={16} />
};

export function GuardianNoticeList({ notices }: { notices: GuardianNotice[] }) {
  return (
    <div className="guardian-notice-list">
      {notices.map((notice) => (
        <article className={`guardian-notice-row guardian-notice-row--${notice.tone}`} key={notice.id}>
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
