import { Check, Copy, KeyRound, X } from "lucide-react";
import { useState } from "react";

export function CredentialRevealDialog({
  open,
  title,
  username,
  password,
  hint,
  onClose
}: {
  open: boolean;
  title: string;
  username: string;
  password: string;
  hint?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"user" | "pass" | null>(null);

  if (!open) {
    return null;
  }

  async function copyField(kind: "user" | "pass", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="principal-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="principal-modal principal-credential-dialog" role="dialog" aria-modal="true" aria-labelledby="credential-dialog-title">
        <header className="principal-modal-head">
          <div className="principal-modal-title">
            <KeyRound size={22} aria-hidden />
            <h2 id="credential-dialog-title">{title}</h2>
          </div>
          <button className="principal-modal-close" type="button" onClick={onClose} aria-label="Kapat">
            <X size={20} />
          </button>
        </header>
        <div className="principal-modal-body">
          {hint ? <p className="principal-credential-hint">{hint}</p> : null}
          <label className="principal-credential-field">
            <span>Kullanıcı adı</span>
            <div className="principal-credential-row">
              <code>{username}</code>
              <button type="button" className="ghost-action principal-credential-copy" onClick={() => void copyField("user", username)}>
                {copied === "user" ? <Check size={16} /> : <Copy size={16} />}
                Kopyala
              </button>
            </div>
          </label>
          <label className="principal-credential-field">
            <span>Tek kullanımlık şifre</span>
            <div className="principal-credential-row">
              <code>{password}</code>
              <button type="button" className="ghost-action principal-credential-copy" onClick={() => void copyField("pass", password)}>
                {copied === "pass" ? <Check size={16} /> : <Copy size={16} />}
                Kopyala
              </button>
            </div>
          </label>
        </div>
        <footer className="principal-modal-foot">
          <button className="primary-action" type="button" onClick={onClose}>
            Tamam
          </button>
        </footer>
      </div>
    </div>
  );
}
