import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type PushHealth } from "../../lib/api";

export function PushHealthPanel({ compact = false }: { compact?: boolean; embedded?: boolean }) {
  const [health, setHealth] = useState<PushHealth | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      setHealth(await api.superAdminPushHealth());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Push verileri alınamadı.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (compact) {
    return (
      <div className="log-push-compact">
        <span>Push</span>
        {error ? <small>{error}</small> : null}
        {health ? (
          <small>
            {health.activeTokens} token · {health.sentLast24h} gönderim · {health.failedLast24h} hata · %{Math.round(health.failureRate24h * 100)}
          </small>
        ) : (
          <small>{refreshing ? "Yükleniyor…" : "—"}</small>
        )}
        <button className="log-btn log-btn--ghost log-btn--tiny" disabled={refreshing} onClick={() => void load()} type="button">
          {refreshing ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
        </button>
      </div>
    );
  }

  return null;
}
