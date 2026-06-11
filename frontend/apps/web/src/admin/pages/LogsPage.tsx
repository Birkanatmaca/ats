import { Database, Loader2, Network, RefreshCw, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type AuditEntry, type AuditPurgeResult, type SuperAdminAuditLogQuery } from "../../lib/api";
import { PushHealthPanel } from "../components/PushHealthPanel";
import { PanelHeader } from "../components/PanelHeader";
import { SensitivityBadge } from "../components/SensitivityBadge";
import "./LogsPage.css";

const defaultQuery: SuperAdminAuditLogQuery = {
  limit: 100
};

function toInputValue(value?: string) {
  return value ?? "";
}

type AuditMetadata = Record<string, unknown> & {
  request?: {
    method?: string;
    path?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    status?: number;
  };
};

const roleOptions = ["super_admin", "system_admin", "principal", "guidance", "teacher", "guardian", "driver"];

function parseMetadata(metadata?: string): AuditMetadata {
  if (!metadata) {
    return {};
  }
  try {
    const parsed = JSON.parse(metadata) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as AuditMetadata) : { raw: metadata };
  } catch {
    return { raw: metadata };
  }
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function businessMetadataEntries(metadata: AuditMetadata) {
  return Object.entries(metadata).filter(([key]) => key !== "request");
}

export function LogsPage() {
  const [query, setQuery] = useState<SuperAdminAuditLogQuery>(defaultQuery);
  const [draftQuery, setDraftQuery] = useState<SuperAdminAuditLogQuery>(defaultQuery);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeDays, setPurgeDays] = useState("90");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(nextQuery: SuperAdminAuditLogQuery = query) {
    setRefreshing(true);
    setError(null);
    try {
      const next = await api.superAdminAuditLogs(nextQuery);
      setAuditLogs(next);
      setQuery(nextQuery);
      setDraftQuery(nextQuery);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Loglar yüklenemedi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load(defaultQuery);
  }, []);

  const sensitivityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of auditLogs) {
      counts.set(entry.sensitivity, (counts.get(entry.sensitivity) ?? 0) + 1);
    }
    return counts;
  }, [auditLogs]);

  const tenantCount = useMemo(() => {
    return new Set(auditLogs.map((entry) => entry.tenantId ?? entry.tenant)).size;
  }, [auditLogs]);

  const actorCount = useMemo(() => {
    return new Set(auditLogs.map((entry) => entry.actorId || entry.actorEmail || entry.actor).filter(Boolean)).size;
  }, [auditLogs]);

  async function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await load({
      tenantId: draftQuery.tenantId?.trim() || undefined,
      action: draftQuery.action?.trim() || undefined,
      actorId: draftQuery.actorId?.trim() || undefined,
      actorRole: draftQuery.actorRole?.trim() || undefined,
      resourceType: draftQuery.resourceType?.trim() || undefined,
      sensitivity: draftQuery.sensitivity?.trim() || undefined,
      search: draftQuery.search?.trim() || undefined,
      limit: Math.min(Math.max(Number(draftQuery.limit ?? 100) || 100, 1), 250)
    });
  }

  async function handlePurge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const olderThanDays = Number(purgeDays);
    if (!Number.isFinite(olderThanDays) || olderThanDays < 1) {
      setError("Silme süresi en az 1 gün olmalıdır.");
      return;
    }
    setPurging(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.purgeSuperAdminAuditLogs({
        olderThanDays: Math.min(Math.max(Math.floor(olderThanDays), 1), 3650),
        tenantId: draftQuery.tenantId?.trim() || undefined
      });
      setNotice(renderPurgeMessage(result));
      await load(query);
    } catch (purgeError) {
      setError(purgeError instanceof Error ? purgeError.message : "Loglar silinemedi.");
    } finally {
      setPurging(false);
    }
  }

  function renderPurgeMessage(result: AuditPurgeResult) {
    const tenantText = result.tenantId ? `, kurum: ${result.tenantId}` : "";
    return `${result.deletedCount} kayıt temizlendi. Kesim tarihi: ${new Date(result.before).toLocaleString("tr-TR")}${tenantText}`;
  }

  const rowCount = auditLogs.length;

  return (
    <section className="sa-page-stack sa-logs-page">
      <PanelHeader
        kicker="Denetim ve Loglar"
        title="Sistem Logları"
        icon={<Database size={18} />}
        trailing={
          <button className="sa-secondary-btn" type="button" onClick={() => void load(query)} disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
            Yenile
          </button>
        }
      />

      <PushHealthPanel />

      <section className="sa-card sa-log-summary-card">
        <div className="sa-card-body sa-log-summary-grid">
          <div>
            <span className="sa-kicker">Kayıt</span>
            <strong>{rowCount}</strong>
          </div>
          <div>
            <span className="sa-kicker">Kurum</span>
            <strong>{tenantCount}</strong>
          </div>
          <div>
            <span className="sa-kicker">Aktör</span>
            <strong>{actorCount}</strong>
          </div>
          <div>
            <span className="sa-kicker">Operasyon</span>
            <strong>{sensitivityCounts.get("operational") ?? 0}</strong>
          </div>
          <div>
            <span className="sa-kicker">Öğrenci hassas</span>
            <strong>{sensitivityCounts.get("sensitive_student") ?? 0}</strong>
          </div>
        </div>
      </section>

      <form className="sa-card sa-log-toolbar" onSubmit={handleFilterSubmit}>
        <div className="sa-card-body sa-log-toolbar-grid">
          <label>
            <span>Kurum ID</span>
            <input value={toInputValue(draftQuery.tenantId)} onChange={(event) => setDraftQuery((current) => ({ ...current, tenantId: event.target.value }))} placeholder="tenant-uuid" />
          </label>
          <label>
            <span>İşlem</span>
            <input value={toInputValue(draftQuery.action)} onChange={(event) => setDraftQuery((current) => ({ ...current, action: event.target.value }))} placeholder="audit_logs.purge" />
          </label>
          <label>
            <span>Aktör ID</span>
            <input value={toInputValue(draftQuery.actorId)} onChange={(event) => setDraftQuery((current) => ({ ...current, actorId: event.target.value }))} placeholder="user-uuid" />
          </label>
          <label>
            <span>Aktör rolü</span>
            <select value={toInputValue(draftQuery.actorRole)} onChange={(event) => setDraftQuery((current) => ({ ...current, actorRole: event.target.value }))}>
              <option value="">Tümü</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Kaynak</span>
            <input value={toInputValue(draftQuery.resourceType)} onChange={(event) => setDraftQuery((current) => ({ ...current, resourceType: event.target.value }))} placeholder="guidance_case" />
          </label>
          <label>
            <span>Arama</span>
            <input value={toInputValue(draftQuery.search)} onChange={(event) => setDraftQuery((current) => ({ ...current, search: event.target.value }))} placeholder="öğretmen, öğrenci, kurum..." />
          </label>
          <label>
            <span>Hassasiyet</span>
            <select value={toInputValue(draftQuery.sensitivity)} onChange={(event) => setDraftQuery((current) => ({ ...current, sensitivity: event.target.value }))}>
              <option value="">Tümü</option>
              <option value="operational">Operasyon</option>
              <option value="sensitive_student">Öğrenci hassas</option>
            </select>
          </label>
          <label>
            <span>Limit</span>
            <input type="number" min={1} max={250} value={String(draftQuery.limit ?? 100)} onChange={(event) => setDraftQuery((current) => ({ ...current, limit: Number(event.target.value) }))} />
          </label>
          <div className="sa-log-toolbar-actions">
            <button className="sa-primary-btn" type="submit" disabled={refreshing || loading}>
              {refreshing ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
              Filtrele
            </button>
            <button className="sa-secondary-btn" type="button" onClick={() => { setDraftQuery(defaultQuery); void load(defaultQuery); }} disabled={refreshing || loading}>
              Sıfırla
            </button>
          </div>
        </div>
      </form>

      <form className="sa-card sa-log-purge-card" onSubmit={handlePurge}>
        <div className="sa-card-body sa-log-purge-grid">
          <div>
            <span className="sa-kicker">Temizlik</span>
            <h3>Eski kayıtları kaldır</h3>
            <p>Belirtilen günden daha eski loglar silinir. Bu işlem geri alınamaz.</p>
          </div>
          <label>
            <span>Kaç günden eski?</span>
            <input type="number" min={1} max={3650} value={purgeDays} onChange={(event) => setPurgeDays(event.target.value)} />
          </label>
          <button className="sa-danger-btn" type="submit" disabled={purging || loading}>
            {purging ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
            Temizle
          </button>
        </div>
      </form>

      {error && <div className="form-error workspace-error sa-alert">{error}</div>}
      {notice && <div className="form-success sa-alert">{notice}</div>}
      {loading ? (
        <section className="sa-card">
          <div className="sa-card-body">Loglar yükleniyor...</div>
        </section>
      ) : (
        <section className="sa-card sa-log-table-card">
          <div className="sa-card-body">
            <div className="sa-data-grid sa-log-table">
              <div className="sa-row-head sa-log-table-head">
                <span>İşlem</span>
                <span>Kurum</span>
                <span>Aktör</span>
                <span>Kaynak</span>
                <span>Hassasiyet</span>
                <span>Tarih</span>
                <span>Detay</span>
              </div>

              {auditLogs.map((entry) => {
                const metadata = parseMetadata(entry.metadata);
                const request = metadata.request;
                const metadataEntries = businessMetadataEntries(metadata);
                return (
                  <div className="sa-row-body sa-log-table-row" key={entry.id}>
                    <div className="sa-log-action">
                      <div className="sa-audit-icon">
                        <Database size={16} />
                      </div>
                      <div>
                        <strong>{entry.action}</strong>
                        {entry.resourceId ? <small className="sa-log-meta">{entry.resourceType} / {entry.resourceId}</small> : <small className="sa-log-meta">{entry.resourceType}</small>}
                      </div>
                    </div>
                    <span title={entry.tenant}>{entry.tenant}</span>
                    <div className="sa-log-actor">
                      <strong>{entry.actor}</strong>
                      {entry.actorEmail ? <small>{entry.actorEmail}</small> : null}
                      <span>
                        {entry.actorRole ? (
                          <span className="sa-log-pill">
                            <UserRound size={12} />
                            {entry.actorRole}
                          </span>
                        ) : null}
                        {entry.actorId ? <code>{entry.actorId}</code> : null}
                      </span>
                    </div>
                    <div className="sa-log-resource">
                      <span>{entry.resourceType}</span>
                      {metadataEntries.length > 0 ? <small>{metadataEntries.slice(0, 2).map(([key, value]) => `${key}: ${formatMetadataValue(value)}`).join(" · ")}</small> : null}
                    </div>
                    <SensitivityBadge value={entry.sensitivity} />
                    <small>{new Date(entry.createdAt).toLocaleString("tr-TR")}</small>
                    <details className="sa-log-details">
                      <summary>
                        <ShieldCheck size={13} />
                        İncele
                      </summary>
                      <dl>
                        <div>
                          <dt>Aktör</dt>
                          <dd>{entry.actorEmail || entry.actor}</dd>
                        </div>
                        {request ? (
                          <>
                            <div>
                              <dt>İstek</dt>
                              <dd>{[request.method, request.path].filter(Boolean).join(" ")}</dd>
                            </div>
                            <div>
                              <dt>Ağ</dt>
                              <dd>
                                <Network size={12} />
                                {[request.ip, request.status ? `HTTP ${request.status}` : "", request.requestId].filter(Boolean).join(" · ")}
                              </dd>
                            </div>
                          </>
                        ) : null}
                        {metadataEntries.map(([key, value]) => (
                          <div key={key}>
                            <dt>{key}</dt>
                            <dd>{formatMetadataValue(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </div>
                );
              })}

              {auditLogs.length === 0 && <p className="empty-text sa-log-empty">Bu filtrede log kaydı bulunamadı.</p>}
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
