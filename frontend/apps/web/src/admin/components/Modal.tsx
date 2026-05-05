import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  kicker,
  icon,
  children,
  size = "md"
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="sa-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`sa-modal sa-modal--${size}`}>
        <div className="sa-modal-header">
          <div className="sa-modal-heading">
            {kicker && <span className="sa-kicker">{kicker}</span>}
            <h2>
              {icon && <span className="sa-modal-title-icon">{icon}</span>}
              {title}
            </h2>
          </div>
          <button className="sa-modal-close" type="button" aria-label="Kapat" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="sa-modal-body">{children}</div>
      </div>
    </div>
  );
}
