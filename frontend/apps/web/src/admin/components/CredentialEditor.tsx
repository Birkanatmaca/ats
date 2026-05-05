import { KeyRound } from "lucide-react";
import type { IntegrationCredential } from "../../lib/api";
import { credentialIcon } from "./adminIcons";
import { StatusBadge } from "./StatusBadge";

export function CredentialEditor({
  credential,
  value,
  clear,
  onValueChange,
  onClearChange
}: {
  credential: IntegrationCredential;
  value: string;
  clear: boolean;
  onValueChange: (value: string) => void;
  onClearChange: (value: boolean) => void;
}) {
  return (
    <article className="sa-credential">
      <div className="sa-cred-icon">{credentialIcon(credential.key)}</div>
      <div className="sa-cred-rows">
        <div className="sa-credential-title">
          <div>
            <strong>{credential.label}</strong>
            <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--sa-muted)" }}>{credential.provider}</span>
          </div>
          <StatusBadge value={credential.configured ? "configured" : "missing"} />
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--sa-muted)", lineHeight: 1.45 }}>{credential.description}</p>
        <div className="credential-input-row">
          <div className="field-control">
            <KeyRound size={17} />
            <input
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={credential.configured ? credential.maskedValue : "Anahtar gir"}
              type="password"
              autoComplete="off"
              disabled={clear}
            />
          </div>
          <label className="clear-check">
            <input type="checkbox" checked={clear} onChange={(event) => onClearChange(event.target.checked)} />
            Temizle
          </label>
        </div>
        <small style={{ color: "var(--sa-muted)", fontWeight: 600 }}>
          {credential.updatedAt ? new Date(credential.updatedAt).toLocaleString("tr-TR") : "Henüz kaydedilmedi"}
        </small>
      </div>
    </article>
  );
}
