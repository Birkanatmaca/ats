import { LogOut, ShieldCheck } from "lucide-react";
import type { AuthSession } from "../lib/api";
import { PanelHeader } from "../admin/components/PanelHeader";
import { SupportContactForm } from "./SupportContactForm";
import "./RoleFallbackPage.css";

export function RoleFallbackPage({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  return (
    <main className="fallback-shell">
      <div className="fallback-grid">
        <section className="sa-card">
          <PanelHeader kicker="Oturum" title="Bu kullanıcı süper admin değil" icon={<ShieldCheck size={22} />} />
          <div className="sa-card-body">
            <p>
              {session.principal.name} hesabı `{session.principal.role}` rolüyle giriş yaptı.
            </p>
            <button className="ghost-action" type="button" onClick={onLogout}>
              <LogOut size={18} />
              Çıkış
            </button>
          </div>
        </section>
        <SupportContactForm session={session} />
      </div>
    </main>
  );
}
