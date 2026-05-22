import { ChevronDown, GraduationCap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GuardianChild } from "../types";

export function NavbarStudentSelector({
  students,
  selectedChildId,
  onSelect
}: {
  students: GuardianChild[];
  selectedChildId: string;
  onSelect: (childId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedChild = students.find((child) => child.id === selectedChildId) ?? students[0] ?? null;

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

  if (!selectedChild) {
    return null;
  }

  const canSwitch = students.length > 1;
  const initial = selectedChild.fullName.slice(0, 1).toLocaleUpperCase("tr-TR");

  return (
    <div className="navbar-student-selector" ref={rootRef}>
      <button
        className="navbar-student-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Seçili öğrenci: ${selectedChild.fullName}`}
        disabled={!canSwitch}
        onClick={() => canSwitch && setOpen((current) => !current)}
      >
        <div className={`navbar-student-avatar navbar-student-avatar--${selectedChild.avatarTone}`}>
          {initial}
        </div>
        <div className="navbar-student-text">
          <strong>{selectedChild.fullName}</strong>
          <span>{selectedChild.className}</span>
        </div>
        {canSwitch ? <ChevronDown size={16} className={open ? "is-open" : undefined} aria-hidden /> : null}
      </button>

      {open && canSwitch ? (
        <ul className="navbar-student-menu" role="listbox" aria-label="Öğrenci seç">
          {students.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <li key={child.id} role="option" aria-selected={isSelected}>
                <button
                  className={isSelected ? "navbar-student-option is-selected" : "navbar-student-option"}
                  type="button"
                  onClick={() => {
                    onSelect(child.id);
                    setOpen(false);
                  }}
                >
                  <div className={`navbar-student-avatar navbar-student-avatar--${child.avatarTone}`}>
                    <GraduationCap size={16} aria-hidden />
                  </div>
                  <div className="navbar-student-text">
                    <strong>{child.fullName}</strong>
                    <span>
                      {child.className} · No {child.schoolNumber}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
