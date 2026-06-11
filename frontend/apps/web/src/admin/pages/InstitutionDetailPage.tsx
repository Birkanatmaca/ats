import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clipboard,
  DatabaseZap,
  Globe2,
  GraduationCap,
  Loader2,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
  UsersRound
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type CreatedUserCredential, type Institution, type InstitutionDetail, type UserAccount } from "../../lib/api";
import { Modal } from "../components/Modal";
import { MiniStat } from "../components/MiniStat";
import { StatusBadge } from "../components/StatusBadge";
import { initials, planVariant, roleVariant } from "../utils/institutionHelpers";
import { roleLabel, statusLabel } from "../utils/labels";
import "./InstitutionDetailPage.css";

export function InstitutionDetailPage({
  institutions,
  onRefresh
}: {
  institutions: Institution[];
  onRefresh: () => Promise<void>;
}) {
  const params = useParams<{ id: string }>();
  const institutionId = params.id ?? "";
  const navigate = useNavigate();

  const [detail, setDetail] = useState<InstitutionDetail | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [credential, setCredential] = useState<CreatedUserCredential | null>(null);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", fullName: "", role: "principal" });
  const [savingCreate, setSavingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editForm, setEditForm] = useState({
    tenantId: "",
    email: "",
    fullName: "",
    role: "principal",
    status: "active"
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [modulesSaving, setModulesSaving] = useState(false);

  const fallbackInstitution = institutions.find((item) => item.id === institutionId);
  const billingEnabled = (detail?.enabledModules ?? []).includes("billing");

  async function toggleBillingModule(enabled: boolean) {
    if (!detail) return;
    setModulesSaving(true);
    setDetailError(null);
    try {
      const base = detail.enabledModules ?? ["scheduling", "attendance", "guidance", "transport"];
      const next = enabled ? Array.from(new Set([...base, "billing"])) : base.filter((item) => item !== "billing");
      const updated = await api.updateSuperAdminInstitutionModules(detail.id, next);
      setDetail(updated);
      await onRefresh();
    } catch (toggleError) {
      setDetailError(toggleError instanceof Error ? toggleError.message : "Modül ayarı güncellenemedi.");
    } finally {
      setModulesSaving(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [institutionDetail, usersList] = await Promise.all([api.superAdminInstitution(id), api.superAdminInstitutionUsers(id)]);
      setDetail(institutionDetail);
      setUsers(usersList);
    } catch (loadError) {
      setDetail(null);
      setUsers([]);
      setDetailError(loadError instanceof Error ? loadError.message : "Kurum detayları alınamadı.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!institutionId) {
      return;
    }
    void loadDetail(institutionId);
  }, [institutionId]);

  useEffect(() => {
    if (!editingUser) {
      return;
    }
    setEditForm({
      tenantId: editingUser.tenantId,
      email: editingUser.email,
      fullName: editingUser.fullName,
      role: editingUser.role === "super_admin" ? "principal" : editingUser.role,
      status: editingUser.status === "passive" ? "passive" : "active"
    });
    setEditError(null);
  }, [editingUser]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!institutionId) {
      return;
    }
    setSavingCreate(true);
    setCreateError(null);
    try {
      const created = await api.createSuperAdminInstitutionUser(institutionId, createForm);
      setCredential(created);
      setCreateForm({ email: "", fullName: "", role: "principal" });
      setShowCreateUser(false);
      const usersList = await api.superAdminInstitutionUsers(institutionId);
      setUsers(usersList);
      await onRefresh();
    } catch (createErr) {
      setCreateError(createErr instanceof Error ? createErr.message : "Kullanıcı oluşturulamadı.");
    } finally {
      setSavingCreate(false);
    }
  }

  async function updateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) {
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await api.updateSuperAdminUser(editingUser.id, editForm);
      const usersList = await api.superAdminInstitutionUsers(institutionId);
      setUsers(usersList);
      setEditingUser(null);
      await onRefresh();
    } catch (updateErr) {
      setEditError(updateErr instanceof Error ? updateErr.message : "Kullanıcı güncellenemedi.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteUser(user: UserAccount) {
    if (user.role === "super_admin") {
      setDetailError("Süper admin hesabı silinemez.");
      return;
    }
    const confirmed = window.confirm(`${user.fullName} hesabı pasifleştirilsin mi?`);
    if (!confirmed) {
      return;
    }
    try {
      await api.deleteSuperAdminUser(user.id, user.tenantId);
      const usersList = await api.superAdminInstitutionUsers(institutionId);
      setUsers(usersList);
      await onRefresh();
    } catch (deleteErr) {
      setDetailError(deleteErr instanceof Error ? deleteErr.message : "Kullanıcı silinemedi.");
    }
  }

  const headInstitution = detail ?? fallbackInstitution;
  const variant = headInstitution ? planVariant(headInstitution.plan) : "default";

  return (
    <section className="sa-page-stack">
      <div className="sa-detail-back">
        <button type="button" className="sa-back-link" onClick={() => navigate("/admin/institutions")}>
          <ArrowLeft size={16} />
          Kurumlar
        </button>
      </div>

      <header className={`sa-detail-hero sa-detail-hero--${variant}`}>
        <div className="sa-detail-hero-icon">
          <Building2 size={26} />
        </div>
        <div className="sa-detail-hero-text">
          <span className="sa-kicker">Kurum detayı</span>
          <h1>{headInstitution?.name ?? (detailLoading ? "Yükleniyor..." : "Kurum bulunamadı")}</h1>
          {headInstitution && (
            <div className="sa-detail-hero-badges">
              <span className={`sa-plan-badge sa-plan-badge--${variant}`}>{headInstitution.plan}</span>
              <StatusBadge value={headInstitution.status} />
              <span className="sa-detail-hero-meta">
                <Globe2 size={13} />
                {headInstitution.timezone}
              </span>
            </div>
          )}
        </div>
        {detailLoading && (
          <div className="sa-detail-hero-loading">
            <Loader2 className="spin" size={20} />
          </div>
        )}
      </header>

      {detailError && <div className="form-error workspace-error sa-alert">{detailError}</div>}

      {detail && (
        <section className="sa-detail-info">
          <div className="sa-kpi-mini-row">
            <MiniStat label="Plan" value={detail.plan} icon={<DatabaseZap size={19} />} />
            <MiniStat label="Öğrenci" value={detail.students} icon={<GraduationCap size={19} />} />
            <MiniStat label="Kullanıcı" value={users.length} icon={<UsersRound size={19} />} />
            <MiniStat label="Durum" value={statusLabel(detail.status)} icon={<CheckCircle2 size={19} />} />
          </div>
          <div className="sa-detail-meta">
            <div>
              <span className="sa-kicker">ID</span>
              <strong>{detail.id}</strong>
            </div>
            <div>
              <span className="sa-kicker">Zaman dilimi</span>
              <strong>{detail.timezone}</strong>
            </div>
            <div>
              <span className="sa-kicker">Oluşturma</span>
              <strong>{new Date(detail.createdAt).toLocaleDateString("tr-TR")}</strong>
            </div>
            <div>
              <span className="sa-kicker">Son güncelleme</span>
              <strong>{new Date(detail.updatedAt).toLocaleDateString("tr-TR")}</strong>
            </div>
          </div>
          <div className="sa-detail-modules">
            <div>
              <span className="sa-kicker">Premium modüller</span>
              <strong>Tahsilat</strong>
              <p>Öğrenci ödeme planı, taksit ve tahsilat ekranları.</p>
            </div>
            <label className="sa-module-toggle">
              <input
                checked={billingEnabled}
                disabled={modulesSaving}
                type="checkbox"
                onChange={(event) => void toggleBillingModule(event.target.checked)}
              />
              <span>{billingEnabled ? "Aktif" : "Kapalı"}</span>
            </label>
          </div>
        </section>
      )}

      <section className="sa-detail-users">
        <div className="sa-detail-users-head">
          <div>
            <span className="sa-kicker">Kurum kullanıcıları</span>
            <h2>{users.length} hesap</h2>
          </div>
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreateUser(true);
            }}
          >
            <Plus size={17} />
            Yeni kullanıcı ekle
          </button>
        </div>

        {credential && (
          <div className="sa-credential-banner">
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sa-muted)", textTransform: "uppercase" }}>Geçici giriş bilgisi</span>
              <strong>{credential.user.email}</strong>
              <code>{credential.temporaryPassword}</code>
            </div>
            <button className="ghost-action" type="button" onClick={() => void navigator.clipboard?.writeText(`${credential.user.email} / ${credential.temporaryPassword}`)}>
              <Clipboard size={17} />
              Kopyala
            </button>
          </div>
        )}

        <div className="sa-user-card-grid">
          {users.map((user) => {
            const rVariant = roleVariant(user.role);
            return (
              <article className={`sa-user-card sa-user-card--${rVariant}`} key={user.id}>
                <div className={`sa-user-avatar sa-user-avatar--${rVariant}`}>{initials(user.fullName)}</div>
                <div className="sa-user-card-body">
                  <strong>{user.fullName}</strong>
                  <span className="sa-user-email">{user.email}</span>
                  <div className="sa-user-card-badges">
                    <span className={`sa-role-badge sa-role-badge--${rVariant}`}>{roleLabel(user.role)}</span>
                    <StatusBadge value={user.status} />
                  </div>
                </div>
                <div className="sa-user-card-actions">
                  <button className="sa-icon-btn" type="button" aria-label={`${user.fullName} düzenle`} onClick={() => setEditingUser(user)}>
                    <Pencil size={15} />
                  </button>
                  <button className="sa-icon-btn danger" type="button" aria-label={`${user.fullName} sil`} onClick={() => void deleteUser(user)} disabled={user.role === "super_admin"}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
          {users.length === 0 && !detailLoading && (
            <p className="empty-text" style={{ gridColumn: "1 / -1" }}>
              Bu kuruma bağlı kullanıcı yok. Sağ üstteki &quot;Yeni kullanıcı ekle&quot; ile başlayabilirsin.
            </p>
          )}
        </div>
      </section>

      <Modal open={showCreateUser} onClose={() => setShowCreateUser(false)} title="Yeni kullanıcı" kicker={headInstitution?.name ?? "Kurum"} icon={<UserCog size={20} />}>
        {createError && <div className="form-error">{createError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void createUser(event)}>
          <label className="field">
            <span>E-posta</span>
            <div className="field-control">
              <Mail size={17} />
              <input
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))}
                placeholder="kullanici@kurum.com"
                required
                autoFocus
              />
            </div>
          </label>
          <label className="field">
            <span>Ad soyad</span>
            <div className="field-control">
              <UserCog size={17} />
              <input value={createForm.fullName} onChange={(event) => setCreateForm((form) => ({ ...form, fullName: event.target.value }))} placeholder="Boş bırakılırsa mailden üretilir" />
            </div>
          </label>
          <label className="field">
            <span>Rol</span>
            <div className="field-control">
              <ShieldCheck size={17} />
              <select value={createForm.role} onChange={(event) => setCreateForm((form) => ({ ...form, role: event.target.value }))}>
                <option value="principal">Müdür</option>
                <option value="guidance">Rehberlik</option>
                <option value="teacher">Öğretmen</option>
                <option value="guardian">Veli</option>
              </select>
            </div>
          </label>
          <div className="sa-modal-actions">
            <button type="button" className="ghost-action" onClick={() => setShowCreateUser(false)}>
              Vazgeç
            </button>
            <button className="primary-action" type="submit" disabled={savingCreate}>
              {savingCreate ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Kullanıcı oluştur
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(editingUser)} onClose={() => setEditingUser(null)} title="Kullanıcı düzenle" kicker={editingUser?.fullName ?? ""} icon={<Pencil size={20} />}>
        {editError && <div className="form-error">{editError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void updateUser(event)}>
          <label className="field">
            <span>Kurum</span>
            <div className="field-control">
              <Building2 size={17} />
              <select value={editForm.tenantId} onChange={(event) => setEditForm((form) => ({ ...form, tenantId: event.target.value }))}>
                {institutions.map((institution) => (
                  <option value={institution.id} key={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="field">
            <span>E-posta</span>
            <div className="field-control">
              <Mail size={17} />
              <input type="email" value={editForm.email} onChange={(event) => setEditForm((form) => ({ ...form, email: event.target.value }))} />
            </div>
          </label>
          <label className="field">
            <span>Ad soyad</span>
            <div className="field-control">
              <UserCog size={17} />
              <input value={editForm.fullName} onChange={(event) => setEditForm((form) => ({ ...form, fullName: event.target.value }))} />
            </div>
          </label>
          <label className="field">
            <span>Rol</span>
            <div className="field-control">
              <ShieldCheck size={17} />
              <select value={editForm.role} onChange={(event) => setEditForm((form) => ({ ...form, role: event.target.value }))}>
                <option value="principal">Müdür</option>
                <option value="guidance">Rehberlik</option>
                <option value="teacher">Öğretmen</option>
                <option value="guardian">Veli</option>
              </select>
            </div>
          </label>
          <label className="field">
            <span>Durum</span>
            <div className="field-control">
              <CheckCircle2 size={17} />
              <select value={editForm.status} onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))}>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </div>
          </label>
          <div className="sa-modal-actions">
            <button type="button" className="ghost-action" onClick={() => setEditingUser(null)}>
              Vazgeç
            </button>
            <button className="primary-action" type="submit" disabled={savingEdit}>
              {savingEdit ? <Loader2 className="spin" size={18} /> : <Pencil size={18} />}
              Kaydet
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
