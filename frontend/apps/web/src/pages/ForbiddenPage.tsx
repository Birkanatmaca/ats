import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import type { AuthSession } from "../lib/api";
import { roleLabel } from "../admin/utils/labels";
import "./ForbiddenPage.css";

export function ForbiddenPage({ session }: { session: AuthSession }) {
  return (
    <div className="forbidden-page">
      <div className="forbidden-card">
        <ShieldAlert size={40} aria-hidden />
        <h1>Erişim reddedildi</h1>
        <p>
          <strong>{roleLabel(session.principal.role)}</strong> rolünüz bu sayfaya erişemez (403).
        </p>
        <Link className="forbidden-home" to="/dashboard">
          Panele dön
        </Link>
      </div>
    </div>
  );
}
