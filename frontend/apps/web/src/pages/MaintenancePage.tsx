import { KeyRound, LogOut, Power } from "lucide-react";
import type { SystemStatus } from "../lib/api";
import "./MaintenancePage.css";

export function MaintenancePage({
  status,
  onAdminLogin,
  onLogout
}: {
  status: SystemStatus;
  onAdminLogin?: () => void;
  onLogout?: () => void;
}) {
  return (
    <main className="maintenance-page">
      <section className="maintenance-panel">
        <div className="maintenance-icon">
          <Power size={34} />
        </div>
        <span className="section-kicker">Bakım modu</span>
        <h1>Bakımdayız</h1>
        <p>{status.maintenance.message}</p>
        <div className="maintenance-actions">
          {onAdminLogin && (
            <button className="ghost-action" type="button" onClick={onAdminLogin}>
              <KeyRound size={18} />
              Süper admin girişi
            </button>
          )}
          {onLogout && (
            <button className="ghost-action" type="button" onClick={onLogout}>
              <LogOut size={18} />
              Çıkış
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
