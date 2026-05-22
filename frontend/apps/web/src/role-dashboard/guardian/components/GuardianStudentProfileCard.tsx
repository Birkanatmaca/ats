import { GraduationCap, Hash, School } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { GuardianChild } from "../types";

export function GuardianStudentProfileCard({ child }: { child: GuardianChild }) {
  const initial = child.fullName.slice(0, 1).toLocaleUpperCase("tr-TR");

  return (
    <article className="guardian-student-profile-card">
      <div className={`guardian-student-profile-photo guardian-student-profile-photo--${child.avatarTone}`}>
        <span aria-hidden>{initial}</span>
      </div>
      <div className="guardian-student-profile-copy">
        <h3>{child.fullName}</h3>
        <p>{child.className}</p>
      </div>
      <div className="guardian-student-profile-meta">
        <div>
          <Hash size={14} />
          <span>Okul no</span>
          <strong>{child.schoolNumber}</strong>
        </div>
        <div>
          <School size={14} />
          <span>Kurum</span>
          <strong>{child.tenantName}</strong>
        </div>
        <div>
          <GraduationCap size={14} />
          <span>Sınıf</span>
          <strong>{child.className}</strong>
        </div>
      </div>
      <NavLink className="ghost-action small-action guardian-student-profile-link" to="/dashboard/child">
        Öğrenci detayı
      </NavLink>
    </article>
  );
}
