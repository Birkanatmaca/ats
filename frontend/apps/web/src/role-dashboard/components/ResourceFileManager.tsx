import { Download, FileText, Loader2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { api } from "../../lib/api";
import type { FileUploadMeta, UploadCategory, UploadResourceType } from "../../lib/api";
import "./ResourceFileManager.css";

const DEFAULT_ACCEPT = ".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp";
const DEFAULT_MAX_FILE_SIZE = 8 * 1024 * 1024;

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toLocaleString("tr-TR", { maximumFractionDigits: index === 0 ? 0 : 1 })} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function safeDownloadName(item: FileUploadMeta) {
  return item.originalName || item.key.split("/").pop() || "dosya";
}

export function ResourceFileManager({
  title = "Belgeler",
  category,
  resourceType,
  resourceId,
  canUpload = true,
  compact = false,
  emptyText = "Henüz dosya yüklenmedi.",
  accept = DEFAULT_ACCEPT,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  limit = 50,
  refreshSignal = 0
}: {
  title?: string;
  category: UploadCategory;
  resourceType: UploadResourceType;
  resourceId: string;
  canUpload?: boolean;
  compact?: boolean;
  emptyText?: string;
  accept?: string;
  maxFileSize?: number;
  limit?: number;
  refreshSignal?: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<FileUploadMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!resourceId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const files = await api.files({ category, resourceType, resourceId, limit });
      setItems(files);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dosyalar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [category, limit, resourceId, resourceType]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0 || !resourceId) return;
    const tooLarge = selected.find((file) => file.size > maxFileSize);
    if (tooLarge) {
      setError(`${tooLarge.name} en fazla ${formatBytes(maxFileSize)} olabilir.`);
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    let uploadedCount = 0;
    try {
      for (const file of selected) {
        await api.uploadFile({ file, category, resourceType, resourceId });
        uploadedCount += 1;
      }
      setMessage(`${uploadedCount} dosya yüklendi.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Dosya yüklenemedi.");
    } finally {
      setUploading(false);
      await load();
    }
  }

  async function download(item: FileUploadMeta) {
    setDownloadingKey(item.key);
    setError(null);
    try {
      const blob = await api.downloadFile(item.key);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = safeDownloadName(item);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Dosya indirilemedi.");
    } finally {
      setDownloadingKey(null);
    }
  }

  return (
    <section className={`resource-file-manager${compact ? " resource-file-manager--compact" : ""}`}>
      <header className="resource-file-manager-head">
        <div>
          <h3>{title}</h3>
          <span>{loading ? "Yükleniyor" : `${items.length} dosya`}</span>
        </div>
        {canUpload ? (
          <>
            <input accept={accept} hidden multiple onChange={(event) => void handleUpload(event)} ref={inputRef} type="file" />
            <button className="ghost-action small-action resource-file-upload-btn" disabled={uploading || !resourceId} onClick={() => inputRef.current?.click()} type="button">
              {uploading ? <Loader2 className="spin" size={15} /> : <UploadCloud size={15} />}
              {uploading ? "Yükleniyor" : "Dosya yükle"}
            </button>
          </>
        ) : null}
      </header>

      {error ? <p className="resource-file-alert resource-file-alert--error">{error}</p> : null}
      {message ? <p className="resource-file-alert resource-file-alert--success">{message}</p> : null}

      {loading ? (
        <p className="resource-file-empty">
          <Loader2 className="spin" size={16} />
          Dosyalar yükleniyor...
        </p>
      ) : items.length === 0 ? (
        <p className="resource-file-empty">{emptyText}</p>
      ) : (
        <div className="resource-file-list">
          {items.map((item) => (
            <div className="resource-file-row" key={item.key}>
              <span className="resource-file-icon" aria-hidden>
                <FileText size={16} />
              </span>
              <div className="resource-file-meta">
                <strong>{safeDownloadName(item)}</strong>
                <small>
                  {formatBytes(item.sizeBytes)}
                  {item.uploadedAt ? ` · ${formatDate(item.uploadedAt)}` : ""}
                </small>
              </div>
              <button className="ghost-action resource-file-download-btn" onClick={() => void download(item)} type="button" aria-label={`${safeDownloadName(item)} indir`}>
                {downloadingKey === item.key ? <Loader2 className="spin" size={15} /> : <Download size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
