import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { ContactRequestForm } from "./ContactRequestForm";

type ContactRequestModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ContactRequestModal({ open, onClose }: ContactRequestModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="contact-modal" onClick={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="contact-modal__panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="contact-modal__header">
          <div>
            <p className="eyebrow">İletişim formu</p>
            <h2 id={titleId}>Demo, teklif veya mesaj gönderin</h2>
          </div>
          <button aria-label="Formu kapat" className="contact-modal__close" onClick={onClose} type="button">
            <X aria-hidden="true" size={20} strokeWidth={2.2} />
          </button>
        </header>

        <ContactRequestForm embedded onSubmitted={onClose} />
      </div>
    </div>
  );
}
