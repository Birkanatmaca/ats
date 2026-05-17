import { CheckCircle2, GraduationCap } from "lucide-react";
import type { GuardianChild } from "../types";

export function GuardianChildCard({ child, compact = false }: { child: GuardianChild; compact?: boolean }) {
  return (
    <article className={compact ? "guardian-child-card guardian-child-card--compact" : "guardian-child-card"}>
      <div className={`guardian-child-avatar guardian-child-avatar--${child.avatarTone}`}>
        <GraduationCap size={compact ? 20 : 25} />
      </div>
      <div className="guardian-child-info">
        <span>Öğrenci</span>
        <strong>{child.fullName}</strong>
        <small>
          {child.className} · No {child.schoolNumber}
        </small>
      </div>
      <div className="guardian-child-status">
        <CheckCircle2 size={17} />
        <span>Aktif</span>
      </div>
    </article>
  );
}
