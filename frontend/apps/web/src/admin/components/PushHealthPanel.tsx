import { Bell, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type PushDeliveryLog, type PushHealth } from "../../lib/api";
import { PanelHeader } from "./PanelHeader";

function statusLabel(status: string) {
  if (status === "sent") return "Gönderildi";
  if (status === "failed") return "Hata";
  if (status === "dropped") return "Düşürüldü";
  return status;
}

export function PushHealthPanel() {
  const [health, setHealth] = useState<PushHealth | null>(null);
  const [logs, setLogs] = useState<PushDeliveryLog[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const [nextHealth, nextLogs] = await Promise.all([
        api.superAdminPushHealth(tenantId.trim() || undefined),
        api.superAdminPushLogs({ tenantId: tenantId.trim() || undefined, limit: 30 })
      ]);
      setHealth(nextHealth);
      setLogs(nextLogs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Push verileri alınamadı.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="sa-card sa-push-health-card">
      <PanelHeader
        kicker="Mobil bildirim"
        title="Push sağlığı"
        icon={<Bell size={18} />}
        trailing={
          <button className="sa-secondary-btn" type="button" onClick={() => void load()} disabled={refreshing}>
            {refreshing ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
            Yenile
          </button>
        }
      />

      <div className="sa-card-body sa-push-health-body">
        <label className="sa-push-tenant-filter">
          <span>Kurum filtresi (tenantId)</span>
          <input
            placeholder="Tüm kurumlar"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            onBlur={() => void load()}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}
        {loading ? <p className="empty-text">Push metrikleri yükleniyor…</p> : null}

        {health ? (
          <div className="sa-push-health-grid">
            <div>
              <span className="sa-kicker">Aktif token</span>
              <strong>{health.activeTokens}</strong>
            </div>
            <div>
              <span className="sa-kicker">İptal token</span>
              <strong>{health.revokedTokens}</strong>
            </div>
            <div>
              <span className="sa-kicker">24s gönderim</span>
              <strong>{health.sentLast24h}</strong>
            </div>
            <div>
              <span className="sa-kicker">24s hata</span>
              <strong>{health.failedLast24h}</strong>
            </div>
            <div>
              <span className="sa-kicker">Hata oranı</span>
              <strong>%{Math.round(health.failureRate24h * 100)}</strong>
            </div>
          </div>
        ) : null}

        {logs.length > 0 ? (
          <div className="sa-push-log-table-wrap">
            <table className="sa-push-log-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Kategori</th>
                  <th>Başlık</th>
                  <th>Durum</th>
                  <th>Hata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("tr-TR")}</td>
                    <td>{log.category}</td>
                    <td>{log.title}</td>
                    <td>{statusLabel(log.status)}</td>
                    <td>{log.errorMessage || log.errorCode || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading ? (
          <p className="empty-text">Son push kaydı bulunamadı.</p>
        ) : null}
      </div>
    </section>
  );
}
