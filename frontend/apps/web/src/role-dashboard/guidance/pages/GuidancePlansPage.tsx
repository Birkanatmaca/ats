import { CalendarClock, CheckCircle2, HeartHandshake, ListTodo, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { GuidanceStudent, GuidanceSupportPlan } from "../../../lib/api";
import { api } from "../../../lib/api";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { GuidanceKpiCard } from "../components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../components/GuidanceMetricGrid";
import { formatGuidanceDate, supportStatusLabel } from "../utils";
import "../GuidanceDataPage.css";

const PAGE_SIZE = 12;

const statusFilters = [
  { value: "all", label: "Tüm durumlar" },
  { value: "open", label: "Açık" },
  { value: "monitoring", label: "İzleniyor" },
  { value: "closed", label: "Kapalı" }
] as const;

const emptyForm = {
  studentId: "",
  title: "",
  description: "",
  status: "open" as GuidanceSupportPlan["status"],
  dueDate: ""
};

function formatDueDate(value?: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function GuidancePlansPage({
  students,
  plans,
  onReload
}: {
  students: GuidanceStudent[];
  plans: GuidanceSupportPlan[];
  onReload: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const open = plans.filter((plan) => plan.status === "open").length;
    const monitoring = plans.filter((plan) => plan.status === "monitoring").length;
    const closed = plans.filter((plan) => plan.status === "closed").length;
    const overdue = plans.filter((plan) => {
      if (!plan.dueDate || plan.status === "closed") {
        return false;
      }
      return new Date(plan.dueDate).getTime() < Date.now();
    }).length;
    return { total: plans.length, open, monitoring, closed, overdue };
  }, [plans]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    for (const plan of plans) {
      if (plan.className.trim()) {
        set.add(plan.className);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
    return plans.filter((plan) => {
      const statusMatch = statusFilter === "all" || plan.status === statusFilter;
      const classMatch = !classFilter || plan.className === classFilter;
      const studentMatch = !studentFilter || plan.studentId === studentFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${plan.title} ${plan.description} ${plan.studentName} ${plan.className} ${plan.ownerName} ${supportStatusLabel(plan.status)}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);
      return statusMatch && classMatch && studentMatch && queryMatch;
    });
  }, [plans, statusFilter, classFilter, studentFilter, query]);

  const filterKey = `${statusFilter}|${classFilter}|${studentFilter}|${query}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filteredPlans, filterKey, PAGE_SIZE);

  function openModal() {
    setError(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setError(null);
    setLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createSupportPlan(form);
      closeModal();
      onReload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Plan oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(plan: GuidanceSupportPlan, status: GuidanceSupportPlan["status"]) {
    try {
      await api.updateSupportPlan(plan.id, { status });
      onReload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Güncelleme başarısız.");
    }
  }

  async function handleDelete(plan: GuidanceSupportPlan) {
    if (!window.confirm(`"${plan.title}" planını silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      await api.deleteSupportPlan(plan.id);
      onReload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Silme başarısız.");
    }
  }

  return (
    <section className="guidance-page-stack guidance-data-page guidance-plans-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<ListTodo size={20} />} label="Toplam plan" value={stats.total} detail="Destek takibi" tone="sky" />
        <GuidanceKpiCard icon={<HeartHandshake size={20} />} label="Açık" value={stats.open} detail="Aksiyon bekliyor" tone="amber" />
        <GuidanceKpiCard icon={<CalendarClock size={20} />} label="İzleniyor" value={stats.monitoring} detail={`${stats.overdue} gecikmiş`} tone="violet" />
        <GuidanceKpiCard icon={<CheckCircle2 size={20} />} label="Tamamlanan" value={stats.closed} detail="Kapanan plan" tone="emerald" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Destek planları</h2>
          <div className="guidance-data-card-head-actions">
            <span>{filteredPlans.length} plan</span>
            <button className="primary-action small-action" type="button" onClick={openModal} disabled={students.length === 0}>
              <Plus size={16} />
              Yeni plan
            </button>
          </div>
        </header>

        {error && !modalOpen ? <div className="guidance-data-inline-error">{error}</div> : null}

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Durum filtresi">
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <select className="guidance-data-select" value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Sınıf filtresi">
            <option value="">Tüm sınıflar</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          <select className="guidance-data-select" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)} aria-label="Öğrenci filtresi">
            <option value="">Tüm öğrenciler</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))}
          </select>
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Plan, öğrenci, sorumlu…" type="search" />
          </label>
        </div>

        {filteredPlans.length === 0 ? (
          <p className="guidance-data-empty">{plans.length === 0 ? "Takip planı yok. Yeni plan oluşturun." : "Filtrelere uyan plan bulunamadı."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table guidance-plans-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Öğrenci</th>
                    <th>Sorumlu</th>
                    <th>Durum</th>
                    <th>Hedef tarih</th>
                    <th>Oluşturulma</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <span className="guidance-data-primary">{plan.title}</span>
                        {plan.description ? <p className="guidance-data-text">{plan.description}</p> : null}
                      </td>
                      <td>
                        <span className="guidance-data-primary">{plan.studentName}</span>
                        <span className="guidance-data-secondary">{plan.className || "—"}</span>
                      </td>
                      <td>{plan.ownerName}</td>
                      <td>
                        <select
                          className="guidance-data-status-select"
                          value={plan.status}
                          onChange={(event) => void updateStatus(plan, event.target.value as GuidanceSupportPlan["status"])}
                          aria-label={`${plan.title} durumu`}
                        >
                          <option value="open">Açık</option>
                          <option value="monitoring">İzleniyor</option>
                          <option value="closed">Kapalı</option>
                        </select>
                      </td>
                      <td className="guidance-data-date-cell">{formatDueDate(plan.dueDate)}</td>
                      <td className="guidance-data-date-cell">{formatGuidanceDate(plan.createdAt)}</td>
                      <td>
                        <div className="guidance-data-actions">
                          <button className="ghost-action danger" type="button" onClick={() => void handleDelete(plan)} title="Sil">
                            <Trash2 size={15} />
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} />
          </>
        )}
      </article>

      {modalOpen ? (
        <div className="guidance-modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="guidance-modal guidance-plan-modal" role="dialog" aria-modal aria-labelledby="guidance-plan-modal-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="guidance-plan-modal-title">Yeni destek planı</h3>
            {error ? <div className="form-error">{error}</div> : null}
            <form className="guidance-plan-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Öğrenci</span>
                <select value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} required>
                  <option value="">Seçin</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} · {student.className}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Plan başlığı</span>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={200} />
              </label>
              <label className="field">
                <span>Açıklama</span>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} maxLength={2000} />
              </label>
              <div className="guidance-plan-form-row">
                <label className="field">
                  <span>Durum</span>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as GuidanceSupportPlan["status"] })}>
                    <option value="open">Açık</option>
                    <option value="monitoring">İzleniyor</option>
                    <option value="closed">Kapalı</option>
                  </select>
                </label>
                <label className="field">
                  <span>Hedef tarih</span>
                  <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
                </label>
              </div>
              <div className="guidance-modal-actions">
                <button className="ghost-action" type="button" onClick={closeModal} disabled={loading}>
                  İptal
                </button>
                <button className="primary-action" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="spin" size={17} /> : null}
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
