import { Database, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, type AuditEntry, type AuditPurgeResult, type SuperAdminAuditLogQuery } from "../../lib/api";
import { Modal } from "../components/Modal";
import { PushHealthPanel } from "../components/PushHealthPanel";
import { roleLabel } from "../utils/labels";
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
    return "—";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

function fieldLabel(key: string) {
  const labels: Record<string, string> = {
    method: "Metot",
    path: "Yol",
    requestId: "İstek ID",
    ip: "IP",
    userAgent: "Tarayıcı",
    status: "HTTP durum"
  };
  return labels[key] ?? key;
}

function businessMetadataEntries(metadata: AuditMetadata) {
  return Object.entries(metadata).filter(([key]) => key !== "request");
}

function sensitivityLabel(value: string) {
  if (value === "sensitive_student") return "Öğrenci hassas";
  if (value === "operational") return "Operasyon";
  return value;
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
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

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

  function nextQueryFromDraft(patch: Partial<SuperAdminAuditLogQuery> = {}) {
    const merged = { ...draftQuery, ...patch };
    return {
      tenantId: merged.tenantId?.trim() || undefined,
      action: merged.action?.trim() || undefined,
      actorId: merged.actorId?.trim() || undefined,
      actorRole: merged.actorRole?.trim() || undefined,
      resourceType: merged.resourceType?.trim() || undefined,
      sensitivity: merged.sensitivity?.trim() || undefined,
      search: merged.search?.trim() || undefined,
      limit: Math.min(Math.max(Number(merged.limit ?? 100) || 100, 1), 250)
    };
  }

  async function applyFilters(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    await load(nextQueryFromDraft());
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

  return (
    <section className="log">
      <header className="log-hero">
        <div>
          <p className="log-kicker">Denetim</p>
          <h1>Loglar</h1>
        </div>
        <p className="log-hero-meta">{loading ? "Yükleniyor" : `${auditLogs.length} kayıt`}</p>
      </header>

      {error ? <div className="form-error sa-alert">{error}</div> : null}
      {notice ? <div className="form-success sa-alert">{notice}</div> : null}

      <article className="log-card log-card--table">
        <form className="log-toolbar" onSubmit={(event) => void applyFilters(event)}>
          <label className="log-search">
            <Search size={16} />
            <input
              onChange={(event) => setDraftQuery((current) => ({ ...current, search: event.target.value }))}
              placeholder="İşlem, aktör veya kurum ara"
              type="search"
              value={toInputValue(draftQuery.search)}
            />
          </label>
          <select
            onChange={(event) => {
              const actorRole = event.target.value || undefined;
              setDraftQuery((current) => ({ ...current, actorRole }));
              void load(nextQueryFromDraft({ actorRole }));
            }}
            value={toInputValue(draftQuery.actorRole)}
          >
            <option value="">Tüm roller</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <select
            onChange={(event) => {
              const sensitivity = event.target.value || undefined;
              setDraftQuery((current) => ({ ...current, sensitivity }));
              void load(nextQueryFromDraft({ sensitivity }));
            }}
            value={toInputValue(draftQuery.sensitivity)}
          >
            <option value="">Tüm hassasiyet</option>
            <option value="operational">Operasyon</option>
            <option value="sensitive_student">Öğrenci hassas</option>
          </select>
          <button className="log-btn log-btn--ghost" disabled={refreshing || loading} type="submit">
            Ara
          </button>
          <button
            className="log-btn log-btn--ghost"
            disabled={refreshing || loading}
            onClick={() => {
              setDraftQuery(defaultQuery);
              void load(defaultQuery);
            }}
            type="button"
          >
            Sıfırla
          </button>
          <button className="log-btn log-btn--primary" disabled={refreshing || loading} onClick={() => void load(query)} type="button">
            {refreshing ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
            Yenile
          </button>
        </form>

        {loading ? (
          <p className="log-empty">Loglar yükleniyor...</p>
        ) : auditLogs.length === 0 ? (
          <p className="log-empty">Bu filtrede log kaydı bulunamadı.</p>
        ) : (
          <div className="log-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>İşlem</th>
                  <th>Kurum</th>
                  <th>Aktör</th>
                  <th>Hassasiyet</th>
                  <th>Tarih</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.action}</strong>
                      <small>
                        {entry.resourceType}
                        {entry.resourceId ? ` · ${entry.resourceId}` : ""}
                      </small>
                    </td>
                    <td>{entry.tenant}</td>
                    <td>
                      <strong>{entry.actor}</strong>
                      <small>{entry.actorRole ? roleLabel(entry.actorRole) : entry.actorEmail || "—"}</small>
                    </td>
                    <td>
                      <span className={`log-badge ${entry.sensitivity === "sensitive_student" ? "log-badge--warn" : "log-badge--ok"}`}>
                        {sensitivityLabel(entry.sensitivity)}
                      </span>
                    </td>
                    <td className="log-date">{new Date(entry.createdAt).toLocaleString("tr-TR")}</td>
                    <td>
                      <button className="log-btn log-btn--ghost" onClick={() => setSelectedEntry(entry)} type="button">
                        Detay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <div className="log-utils">
        <PushHealthPanel compact />
        <form className="log-purge" onSubmit={handlePurge}>
          <span>Temizlik</span>
          <input max={3650} min={1} onChange={(event) => setPurgeDays(event.target.value)} type="number" value={purgeDays} />
          <small>günden eski</small>
          <button className="log-btn log-btn--danger" disabled={purging || loading} type="submit">
            {purging ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
            Temizle
          </button>
        </form>
      </div>

      <LogDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </section>
  );
}

function LogDetailModal({ entry, onClose }: { entry: AuditEntry | null; onClose: () => void }) {
  const metadata = parseMetadata(entry?.metadata);
  const request = metadata.request;
  const metadataEntries = businessMetadataEntries(metadata);

  return (
    <Modal
      icon={<Database size={20} />}
      kicker={entry ? new Date(entry.createdAt).toLocaleString("tr-TR") : ""}
      onClose={onClose}
      open={entry !== null}
      size="lg"
      title={entry?.action ?? "Log detayı"}
    >
      {entry ? (
        <div className="log-view">
          <div className="log-view-block log-view-meta">
            <div>
              <span>İşlem</span>
              <strong>{entry.action}</strong>
            </div>
            <div>
              <span>Hassasiyet</span>
              <strong>
                <span className={`log-badge ${entry.sensitivity === "sensitive_student" ? "log-badge--warn" : "log-badge--ok"}`}>
                  {sensitivityLabel(entry.sensitivity)}
                </span>
              </strong>
            </div>
            <div>
              <span>Tarih</span>
              <strong>{new Date(entry.createdAt).toLocaleString("tr-TR")}</strong>
            </div>
            <div>
              <span>Kurum</span>
              <strong>{entry.tenant || "—"}</strong>
            </div>
            <div>
              <span>Kurum ID</span>
              <strong>{entry.tenantId || "—"}</strong>
            </div>
            <div>
              <span>Kayıt ID</span>
              <strong>{entry.id}</strong>
            </div>
          </div>

          <section className="log-view-block">
            <h3>Aktör</h3>
            <div className="log-view-meta">
              <div>
                <span>Ad</span>
                <strong>{entry.actor || "—"}</strong>
              </div>
              <div>
                <span>E-posta</span>
                <strong>{entry.actorEmail || "—"}</strong>
              </div>
              <div>
                <span>Rol</span>
                <strong>{entry.actorRole ? roleLabel(entry.actorRole) : "—"}</strong>
              </div>
              <div>
                <span>Aktör ID</span>
                <strong>{entry.actorId || "—"}</strong>
              </div>
            </div>
          </section>

          <section className="log-view-block">
            <h3>Kaynak</h3>
            <div className="log-view-meta">
              <div>
                <span>Tür</span>
                <strong>{entry.resourceType || "—"}</strong>
              </div>
              <div>
                <span>Kaynak ID</span>
                <strong>{entry.resourceId || "—"}</strong>
              </div>
            </div>
          </section>

          {request ? (
            <section className="log-view-block">
              <h3>İstek</h3>
              <div className="log-view-meta">
                {Object.entries(request).map(([key, value]) =>
                  value === undefined || value === "" ? null : (
                    <div key={key}>
                      <span>{fieldLabel(key)}</span>
                      <strong>{String(value)}</strong>
                    </div>
                  )
                )}
              </div>
            </section>
          ) : null}

          {metadataEntries.length > 0 ? (
            <section className="log-view-block">
              <h3>Ek bilgiler</h3>
              <dl className="log-view-dl">
                {metadataEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>
                      {typeof value === "object" ? <pre>{formatMetadataValue(value)}</pre> : formatMetadataValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {entry.metadata ? (
            <section className="log-view-block">
              <h3>Ham metadata</h3>
              <pre>{formatMetadataValue(metadata)}</pre>
            </section>
          ) : null}

          <div className="sa-modal-actions">
            <button className="ghost-action" onClick={onClose} type="button">
              Kapat
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
