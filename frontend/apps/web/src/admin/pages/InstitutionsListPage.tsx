import { ArrowUpRight, Building2, CheckCircle2, Database, Globe2, GraduationCap, Loader2, Plus, UsersRound } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Institution } from "../../lib/api";
import { api } from "../../lib/api";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { planVariant } from "../utils/institutionHelpers";
import "./InstitutionsListPage.css";

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
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", plan: "MVP", timezone: "Europe/Istanbul" });
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
    <section className="sa-page-stack institutions-list-page">
      <div className="sa-kpi-row sa-inst-summary" style={{ marginBottom: "4px" }}>
        <article className="sa-kpi sa-kpi--blue">
          <div className="sa-kpi-icon">
            <GraduationCap size={20} />
          </div>
          <label>Toplam öğrenci</label>
          <span className="sa-kpi-value">{totalStudents}</span>
        </article>
        <article className="sa-kpi sa-kpi--purple">
          <div className="sa-kpi-icon">
            <UsersRound size={20} />
          </div>
          <label>Toplam kullanıcı</label>
          <span className="sa-kpi-value">{totalUsers}</span>
        </article>
        <article className="sa-kpi sa-kpi--green">
          <div className="sa-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <label>Aktif kurum</label>
          <span className="sa-kpi-value">{institutions.filter((item) => item.status === "active").length}</span>
        </article>
        <article className="sa-kpi sa-kpi--rose">
          <div className="sa-kpi-icon">
            <Building2 size={20} />
          </div>
          <label>Kayıtlı tenant</label>
          <span className="sa-kpi-value">{institutions.length}</span>
        </article>
      </div>

      <div className="sa-inst-grid">
        <button type="button" className="sa-inst-card sa-inst-card--add" onClick={() => setShowCreate(true)} aria-label="Yeni kurum ekle">
          <div className="sa-inst-card-add-icon">
            <Plus size={28} />
          </div>
          <strong>Yeni kurum ekle</strong>
          <span>Kart şeklinde yeni bir tenant oluştur</span>
        </button>

        {institutions.map((institution) => {
          const variant = planVariant(institution.plan);
          return (
            <Link key={institution.id} to={`/admin/institutions/${institution.id}`} className={`sa-inst-card sa-inst-card--plan-${variant}`}>
              <div className="sa-inst-card-band" />
              <div className="sa-inst-card-head">
                <div className="sa-inst-card-icon">
                  <Building2 size={22} />
                </div>
                <div className="sa-inst-card-badges">
                  <span className={`sa-plan-badge sa-plan-badge--${variant}`}>{institution.plan}</span>
                  <StatusBadge value={institution.status} />
                </div>
              </div>
              <div className="sa-inst-card-body">
                <h3>{institution.name}</h3>
                <p className="sa-inst-card-meta">
                  <Globe2 size={13} />
                  <span>{institution.timezone}</span>
                </p>
              </div>
              <div className="sa-inst-card-stats">
                <div>
                  <GraduationCap size={15} />
                  <div>
                    <span>Öğrenci</span>
                    <strong>{institution.students}</strong>
                  </div>
                </div>
                <div>
                  <UsersRound size={15} />
                  <div>
                    <span>Kullanıcı</span>
                    <strong>{institution.users}</strong>
                  </div>
                </div>
              </div>
              <div className="sa-inst-card-foot">
                <span>
                  son aktivite{" "}
                  {new Date(institution.lastActivityAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
                <span className="sa-inst-card-cta">
                  Detay
                  <ArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

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
              Kuruma oluştur
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
