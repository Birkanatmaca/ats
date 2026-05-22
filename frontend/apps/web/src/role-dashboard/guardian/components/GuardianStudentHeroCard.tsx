import { CheckCircle2, ChevronDown, GraduationCap, School } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GuardianChild } from "../types";

export function GuardianStudentHeroCard({
  child,
  students,
  selectedChildId,
  onSelect
}: {
  child: GuardianChild;
  students: GuardianChild[];
  selectedChildId: string;
  onSelect: (childId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canSwitch = students.length > 1;
  const initial = child.fullName.slice(0, 1).toLocaleUpperCase("tr-TR");

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <article className="guardian-student-hero">
      <div className={`guardian-student-hero-avatar guardian-student-hero-avatar--${child.avatarTone}`}>
        <span>{initial}</span>
      </div>

      <div className="guardian-student-hero-body">
        <div className="guardian-student-hero-title-row">
          <div>
            <h2>{child.fullName}</h2>
            <p>
              {child.className} · Okul no {child.schoolNumber}
            </p>
          </div>
          <span className="guardian-student-hero-status">
            <CheckCircle2 size={15} />
            Aktif kayıt
          </span>
        </div>

        <div className="guardian-student-hero-meta">
          <span>
            <School size={14} />
            {child.tenantName}
          </span>
          <span>
            <GraduationCap size={14} />
            {child.className}
          </span>
        </div>

        {canSwitch ? (
          <div className="guardian-student-hero-switch" ref={rootRef}>
            <button
              className="guardian-student-hero-switch-trigger"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
            >
              Öğrenci değiştir
              <ChevronDown size={16} className={open ? "is-open" : undefined} aria-hidden />
            </button>
            {open ? (
              <ul className="guardian-student-hero-menu" role="listbox" aria-label="Öğrenci seç">
                {students.map((student) => {
                  const isSelected = student.id === selectedChildId;
                  const studentInitial = student.fullName.slice(0, 1).toLocaleUpperCase("tr-TR");
                  return (
                    <li key={student.id} role="option" aria-selected={isSelected}>
                      <button
                        className={isSelected ? "guardian-student-hero-option is-selected" : "guardian-student-hero-option"}
                        type="button"
                        onClick={() => {
                          onSelect(student.id);
                          setOpen(false);
                        }}
                      >
                        <div className={`guardian-student-hero-option-avatar guardian-student-hero-avatar--${student.avatarTone}`}>
                          {studentInitial}
                        </div>
                        <div>
                          <strong>{student.fullName}</strong>
                          <span>
                            {student.className} · No {student.schoolNumber}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
