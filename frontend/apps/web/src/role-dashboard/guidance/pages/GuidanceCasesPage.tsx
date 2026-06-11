import { AlertTriangle, FolderOpen, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { GuidanceCase, GuidanceCaseInboxStats, GuidanceStudent } from "../../../lib/api";
import { api } from "../../../lib/api";
import { GuidanceKpiCard } from "../components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../components/GuidanceMetricGrid";
import { casePriorityBadgeClass, casePriorityLabel, caseStatusLabel, formatGuidanceDate } from "../utils";
import "../GuidanceDataPage.css";

const STATUS_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "open", label: "Açık" },
  { value: "monitoring", label: "İzleniyor" },
  { value: "closed", label: "Kapalı" }
] as const;

const PRIORITIES = [
  { value: "low", label: "Düşük" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksek" },
  { value: "critical", label: "Kritik" }
] as const;

const emptyCreateForm = { studentId: "", title: "", summary: "", priority: "medium" as const };

export function GuidanceCasesPage({
  readOnly = false,
  detailBasePath = "/dashboard/cases"
}: {
  readOnly?: boolean;
  detailBasePath?: string;
}) {
  const [cases, setCases] = useState<GuidanceCase[]>([]);
  const [stats, setStats] = useState<GuidanceCaseInboxStats | null>(null);
  const [students, setStudents] = useState<GuidanceStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseItems, statsItem, studentItems] = await Promise.all([
        api.guidanceCases(statusFilter ? { status: statusFilter } : undefined),
        api.guidanceCaseStats(),
        readOnly ? Promise.resolve([]) : api.guidanceStudents()
      ]);
      setCases(caseItems);
      setStats(statsItem);
      setStudents(studentItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vaka listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, readOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return cases.filter((item) => {
      if (!q) return true;
      return `${item.title} ${item.studentName} ${item.className} ${item.summary}`.toLocaleLowerCase("tr-TR").includes(q);
    });
  }, [cases, search]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!createForm.studentId || !createForm.title.trim()) {
      setCreateError("Öğrenci ve başlık zorunludur.");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await api.createGuidanceCase({
        studentId: createForm.studentId,
        title: createForm.title.trim(),
        summary: createForm.summary.trim(),
        priority: createForm.priority
      });
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      window.location.assign(`${detailBasePath}/${created.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Vaka oluşturulamadı.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <section className="guidance-page-stack guidance-data-page guidance-cases-page">
      <div className="guidance-cases-hero">
        <div className="guidance-cases-hero-icon">
          <FolderOpen size={22} />
        </div>
        <div>
          <h1>{readOnly ? "Rehberlik vaka özeti" : "Vaka dosyaları"}</h1>
          <p>{readOnly ? "Hassas içerik maskeli özet görünüm" : "Öğrenci bazlı rehberlik vaka inbox"}</p>
        </div>
        {!readOnly ? (
          <button className="primary-action small-action" onClick={() => setCreateOpen(true)} type="button">
            <Plus size={16} />
            Yeni vaka
          </button>
        ) : null}
      </div>

      {stats ? (
        <GuidanceMetricGrid>
          <GuidanceKpiCard icon={<FolderOpen size={20} />} label="Açık vaka" value={stats.openCount} detail="Aktif dosya" tone="violet" />
          <GuidanceKpiCard icon={<AlertTriangle size={20} />} label="İzleniyor" value={stats.monitoringCount} detail="Takip altında" tone="sky" />
          <GuidanceKpiCard icon={<AlertTriangle size={20} />} label="Kritik" value={stats.criticalCount} detail="Öncelikli" tone="rose" />
          <GuidanceKpiCard icon={<FolderOpen size={20} />} label="Geciken plan" value={stats.overduePlanCount} detail="Vaka bağlantılı" tone="amber" />
        </GuidanceMetricGrid>
      ) : null}

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Vaka listesi</h2>
          <span>{filtered.length} kayıt</span>
        </header>

        <div className="guidance-data-toolbar">
          <label className="guidance-data-search">
            <Search size={16} />
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Öğrenci veya vaka ara…" value={search} />
          </label>
          <div className="guidance-data-filter-chips">
            {STATUS_FILTERS.map((item) => (
              <button
                className={statusFilter === item.value ? "active" : ""}
                key={item.value || "all"}
                onClick={() => setStatusFilter(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="form-error sa-alert">{error}</div> : null}
        {loading ? <p className="loading-line">Vakalar yükleniyor…</p> : null}

        {!loading && filtered.length === 0 ? (
          <p className="guidance-empty-copy">Henüz vaka dosyası yok.{!readOnly ? " Sağ üstten yeni vaka açabilirsiniz." : ""}</p>
        ) : null}

        <div className="guidance-cases-grid">
          {filtered.map((item) => (
            <Link className="guidance-case-card" key={item.id} to={`${detailBasePath}/${item.id}`}>
              <div className="guidance-case-card-top">
                <span className={casePriorityBadgeClass(item.priority)}>{casePriorityLabel(item.priority)}</span>
                <span className="guidance-case-status">{caseStatusLabel(item.status)}</span>
              </div>
              <strong>{item.title}</strong>
              <span className="guidance-data-secondary">
                {item.studentName} · {item.className}
              </span>
              <p>{item.masked ? "[Gizli özet]" : item.summary || "Özet girilmemiş."}</p>
              <small>
                Sorumlu: {item.ownerName} · {formatGuidanceDate(item.updatedAt)}
              </small>
            </Link>
          ))}
        </div>
      </article>

      {createOpen && !readOnly ? (
        <div className="modal-backdrop">
          <form className="modal-card guidance-case-create-modal" onSubmit={onCreate}>
            <header>
              <h2>Yeni vaka dosyası</h2>
              <button onClick={() => setCreateOpen(false)} type="button">
                Kapat
              </button>
            </header>
            <label>
              Öğrenci
              <select onChange={(event) => setCreateForm((prev) => ({ ...prev, studentId: event.target.value }))} required value={createForm.studentId}>
                <option value="">Seçin</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} · {student.className}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Başlık
              <input onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))} required value={createForm.title} />
            </label>
            <label>
              Özet
              <textarea onChange={(event) => setCreateForm((prev) => ({ ...prev, summary: event.target.value }))} rows={3} value={createForm.summary} />
            </label>
            <label>
              Öncelik
              <select onChange={(event) => setCreateForm((prev) => ({ ...prev, priority: event.target.value as typeof createForm.priority }))} value={createForm.priority}>
                {PRIORITIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {createError ? <div className="form-error">{createError}</div> : null}
            <footer>
              <button className="ghost-action" onClick={() => setCreateOpen(false)} type="button">
                İptal
              </button>
              <button className="primary-action" disabled={createLoading} type="submit">
                {createLoading ? "Oluşturuluyor…" : "Vaka aç"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </section>
  );
}
