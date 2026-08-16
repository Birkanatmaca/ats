import { Building2, CheckCircle2, Database, Globe2, GraduationCap, Loader2, Plus, Search, UsersRound } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Institution } from "../../lib/api";
import { api } from "../../lib/api";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { initials, planVariant } from "../utils/institutionHelpers";
import "./InstitutionsListPage.css";

const STATUS_FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "active", label: "Aktif" },
  { id: "trial", label: "Deneme" },
  { id: "review", label: "İncelemede" }
] as const;

function formatActivity(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function InstitutionsListPage({
  institutions,
  onRefresh
}: {
  institutions: Institution[];
  onRefresh: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const totalStudents = institutions.reduce((sum, institution) => sum + institution.students, 0);
  const totalUsers = institutions.reduce((sum, institution) => sum + institution.users, 0);
  const activeCount = institutions.filter((item) => item.status === "active").length;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", plan: "MVP", timezone: "Europe/Istanbul" });
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return institutions.filter((institution) => {
      const matchesStatus = statusFilter === "all" || institution.status === statusFilter;
      const matchesQuery =
        needle.length === 0 ||
        institution.name.toLocaleLowerCase("tr-TR").includes(needle) ||
        institution.plan.toLocaleLowerCase("tr-TR").includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [institutions, query, statusFilter]);

  async function createInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setCreateError(null);
    try {
      const created = await api.createSuperAdminInstitution(createForm);
      setCreateForm({ name: "", plan: "MVP", timezone: "Europe/Istanbul" });
      setShowCreate(false);
      await onRefresh();
      navigate(`/admin/institutions/${created.id}`);
    } catch (createErr) {
      setCreateError(createErr instanceof Error ? createErr.message : "Kurum oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="inst">
      <header className="inst-hero">
        <div>
          <p className="inst-kicker">Yönetim</p>
          <h1>Kurumlar</h1>
        </div>
        <button type="button" className="inst-add" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Yeni kurum
        </button>
      </header>

      <div className="inst-kpi-grid">
        <article className="inst-kpi">
          <div className="inst-kpi-icon">
            <Building2 size={18} />
          </div>
          <span>Kayıtlı kurum</span>
          <strong>{institutions.length}</strong>
        </article>
        <article className="inst-kpi">
          <div className="inst-kpi-icon inst-kpi-icon--green">
            <CheckCircle2 size={18} />
          </div>
          <span>Aktif</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="inst-kpi">
          <div className="inst-kpi-icon inst-kpi-icon--violet">
            <GraduationCap size={18} />
          </div>
          <span>Öğrenci</span>
          <strong>{totalStudents}</strong>
        </article>
        <article className="inst-kpi">
          <div className="inst-kpi-icon inst-kpi-icon--amber">
            <UsersRound size={18} />
          </div>
          <span>Kullanıcı</span>
          <strong>{totalUsers}</strong>
        </article>
      </div>

      <div className="inst-toolbar">
        <label className="inst-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kurum veya plan ara"
            type="search"
          />
        </label>
        <div className="inst-filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={statusFilter === filter.id ? "is-active" : undefined}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="inst-grid">
          {visible.map((institution) => {
            const variant = planVariant(institution.plan);
            return (
              <Link key={institution.id} className={`inst-card inst-card--${variant}`} to={`/admin/institutions/${institution.id}`}>
                <div className="inst-card-top">
                  <span className="inst-avatar">{initials(institution.name)}</span>
                  <div className="inst-card-badges">
                    <span className={`inst-plan inst-plan--${variant}`}>{institution.plan}</span>
                    <StatusBadge value={institution.status} />
                  </div>
                </div>
                <h3>{institution.name}</h3>
                <p>
                  <Globe2 size={13} />
                  {institution.timezone}
                </p>
                <div className="inst-card-stats">
                  <div>
                    <span>Öğrenci</span>
                    <strong>{institution.students}</strong>
                  </div>
                  <div>
                    <span>Kullanıcı</span>
                    <strong>{institution.users}</strong>
                  </div>
                </div>
                <div className="inst-card-foot">
                  <span>Son hareket {formatActivity(institution.lastActivityAt)}</span>
                  <em>Detay</em>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="inst-empty">{institutions.length === 0 ? "Henüz kurum yok." : "Bu filtreye uyan kurum bulunamadı."}</p>
      )}

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setCreateError(null);
        }}
        title="Kurum oluştur"
        kicker="Yeni tenant"
        icon={<Building2 size={20} />}
      >
        {createError && <div className="form-error">{createError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void createInstitution(event)}>
          <label className="field">
            <span>Kurum adı</span>
            <div className="field-control">
              <Building2 size={17} />
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))}
                placeholder="Örn. Özel Deniz Koleji"
                required
                autoFocus
              />
            </div>
          </label>
          <label className="field">
            <span>Plan</span>
            <div className="field-control">
              <Database size={17} />
              <select value={createForm.plan} onChange={(event) => setCreateForm((form) => ({ ...form, plan: event.target.value }))}>
                <option value="MVP">MVP</option>
                <option value="Starter">Starter</option>
                <option value="Growth">Growth</option>
                <option value="Premium">Premium</option>
                <option value="Trial">Trial</option>
              </select>
            </div>
          </label>
          <label className="field">
            <span>Zaman dilimi</span>
            <div className="field-control">
              <Globe2 size={17} />
              <input value={createForm.timezone} onChange={(event) => setCreateForm((form) => ({ ...form, timezone: event.target.value }))} />
            </div>
          </label>
          <div className="sa-modal-actions">
            <button
              type="button"
              className="ghost-action"
              onClick={() => {
                setShowCreate(false);
                setCreateError(null);
              }}
            >
              Vazgeç
            </button>
            <button className="primary-action" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Kurum oluştur
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
