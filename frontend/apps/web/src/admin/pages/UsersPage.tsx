import { Building2, CheckCircle2, Clipboard, KeyRound, Loader2, Mail, Pencil, Plus, Search, ShieldCheck, Trash2, UserCog, UsersRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { Institution, UserAccount } from "../../lib/api";
import { api, type CreatedUserCredential } from "../../lib/api";
import { Modal } from "../components/Modal";
import { PanelHeader } from "../components/PanelHeader";
import { StatusBadge } from "../components/StatusBadge";
import { roleLabel } from "../utils/labels";
import "./UsersPage.css";

export function UsersPage({ users, institutions, onRefresh }: { users: UserAccount[]; institutions: Institution[]; onRefresh: () => Promise<void> }) {
  const roles = Array.from(new Set(users.map((user) => user.role)));
  const [query, setQuery] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ tenantId: institutions[0]?.id ?? "", email: "", fullName: "", role: "principal" });
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(users[0] ?? null);
  const [editForm, setEditForm] = useState({ tenantId: "", email: "", fullName: "", role: "principal", status: "active" });
  const [credential, setCredential] = useState<CreatedUserCredential | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const activeUsers = users.filter((user) => user.status === "active").length;
  const firstLoginUsers = users.filter((user) => user.mustChangePassword).length;
  const filteredUsers = users.filter((user) => {
    const value = `${user.fullName} ${user.email} ${user.tenant} ${user.role} ${user.status}`.toLowerCase();
    return value.includes(query.toLowerCase().trim());
  });
  const protectedSelection = selectedUser?.role === "super_admin";

  async function createGlobalUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCreate(true);
    setUserError(null);
    setCredential(null);
    try {
      const created = await api.createSuperAdminUser(createForm);
      setCredential(created);
      setSelectedUser(created.user);
      setShowCreateUser(false);
      setCreateForm((form) => ({ ...form, email: "", fullName: "", role: "principal" }));
      await onRefresh();
    } catch (createError) {
      setUserError(createError instanceof Error ? createError.message : "Kullanıcı oluşturulamadı.");
    } finally {
      setSavingCreate(false);
    }
  }

  async function updateGlobalUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || protectedSelection) {
      return;
    }
    setSavingEdit(true);
    setUserError(null);
    try {
      const updated = await api.updateSuperAdminUser(selectedUser.id, editForm);
      setSelectedUser(updated);
      await onRefresh();
    } catch (updateError) {
      setUserError(updateError instanceof Error ? updateError.message : "Kullanıcı güncellenemedi.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteGlobalUser(user: UserAccount) {
    if (user.role === "super_admin") {
      setUserError("Süper admin hesabı silinemez.");
      return;
    }
    const confirmed = window.confirm(`${user.fullName} hesabı pasifleştirilsin mi?`);
    if (!confirmed) {
      return;
    }
    setSavingEdit(true);
    setUserError(null);
    try {
      const updated = await api.deleteSuperAdminUser(user.id, user.tenantId);
      setSelectedUser(updated);
      await onRefresh();
    } catch (deleteError) {
      setUserError(deleteError instanceof Error ? deleteError.message : "Kullanıcı silinemedi.");
    } finally {
      setSavingEdit(false);
    }
  }

  useEffect(() => {
    if (!createForm.tenantId && institutions[0]) {
      setCreateForm((form) => ({ ...form, tenantId: institutions[0].id }));
    }
  }, [createForm.tenantId, institutions]);

  useEffect(() => {
    if (!selectedUser && users[0]) {
      setSelectedUser(users[0]);
      return;
    }
    if (selectedUser) {
      const fresh = users.find((user) => user.id === selectedUser.id && user.tenantId === selectedUser.tenantId);
      if (fresh && fresh !== selectedUser) {
        setSelectedUser(fresh);
      }
    }
  }, [users, selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }
    setEditForm({
      tenantId: selectedUser.tenantId,
      email: selectedUser.email,
      fullName: selectedUser.fullName,
      role: selectedUser.role === "super_admin" ? "principal" : selectedUser.role,
      status: selectedUser.status === "passive" ? "passive" : "active"
    });
  }, [selectedUser]);

  return (
    <section className="sa-page-stack">
      <div className="sa-kpi-row" style={{ marginBottom: "4px" }}>
        <article className="sa-kpi sa-kpi--blue">
          <div className="sa-kpi-icon">
            <UsersRound size={20} />
          </div>
          <label>Toplam kullanıcı</label>
          <span className="sa-kpi-value">{users.length}</span>
        </article>
        <article className="sa-kpi sa-kpi--green">
          <div className="sa-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <label>Aktif hesap</label>
          <span className="sa-kpi-value">{activeUsers}</span>
        </article>
        <article className="sa-kpi sa-kpi--purple">
          <div className="sa-kpi-icon">
            <KeyRound size={20} />
          </div>
          <label>İlk giriş bekleyen</label>
          <span className="sa-kpi-value">{firstLoginUsers}</span>
        </article>
        <article className="sa-kpi sa-kpi--rose">
          <div className="sa-kpi-icon">
            <Building2 size={20} />
          </div>
          <label>Kurum kapsamı</label>
          <span className="sa-kpi-value">{institutions.length}</span>
        </article>
      </div>

      <div className="sa-kpi-row" style={{ marginBottom: "14px" }}>
        {roles.slice(0, 4).map((role, index) => {
          const colors = ["sa-kpi--slate", "sa-kpi--slate", "sa-kpi--slate", "sa-kpi--slate"];
          return (
            <article className={`sa-kpi ${colors[index]}`} key={role}>
              <div className="sa-kpi-icon">
                <UserCog size={20} />
              </div>
              <label>{roleLabel(role)}</label>
              <span className="sa-kpi-value">{users.filter((user) => user.role === role).length}</span>
              <span className="sa-kpi-hint">hesap</span>
            </article>
          );
        })}
      </div>

      <section className="sa-card">
        <PanelHeader
          kicker="Global CRUD"
          title="Tüm kullanıcılar"
          icon={<ShieldCheck size={22} />}
          trailing={
            <button className="primary-action small-action" type="button" onClick={() => setShowCreateUser(true)}>
              <Plus size={17} />
              Kullanıcı oluştur
            </button>
          }
        />
        <div className="sa-card-body">
          <div className="user-toolbar">
            <label className="field search-field">
              <span>Arama</span>
              <div className="field-control">
                <Search size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad, mail, kurum veya rol ara" />
              </div>
            </label>
          </div>

          {credential && (
            <div className="sa-credential-banner" style={{ marginTop: 14 }}>
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

          <div className="sa-data-grid" style={{ marginTop: 16 }}>
            <div className="sa-row-head sa-users-global-head">
              <span>Kullanıcı</span>
              <span>Kurum</span>
              <span>Rol</span>
              <span>Durum</span>
              <span>İşlem</span>
            </div>
            {filteredUsers.map((user) => (
              <div
                className={`sa-row-body sa-users-global-row ${selectedUser?.id === user.id && selectedUser?.tenantId === user.tenantId ? "sa-row-selected" : ""}`}
                key={`${user.tenantId}-${user.id}`}
              >
                <div className="sa-row-body-cell">
                  <strong>{user.fullName}</strong>
                  <small>{user.email}</small>
                </div>
                <span>{user.tenant}</span>
                <span>{roleLabel(user.role)}</span>
                <StatusBadge value={user.status} />
                <div className="sa-row-actions">
                  <button className="sa-icon-btn" type="button" onClick={() => setSelectedUser(user)} aria-label={`${user.fullName} düzenle`}>
                    <Pencil size={16} />
                  </button>
                  <button className="sa-icon-btn danger" type="button" onClick={() => void deleteGlobalUser(user)} aria-label={`${user.fullName} sil`} disabled={user.role === "super_admin"}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && <p className="empty-text">Aramaya uygun kullanıcı bulunamadı.</p>}
          </div>
        </div>
      </section>

      <Modal open={showCreateUser} onClose={() => setShowCreateUser(false)} title="Yeni kullanıcı" kicker="Global CRUD" icon={<UserCog size={20} />}>
        {userError && <div className="form-error">{userError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void createGlobalUser(event)}>
          <label className="field">
            <span>Kurum</span>
            <div className="field-control">
              <Building2 size={17} />
              <select value={createForm.tenantId} onChange={(event) => setCreateForm((form) => ({ ...form, tenantId: event.target.value }))} required>
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
              <input value={createForm.email} onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))} type="email" required />
            </div>
          </label>
          <label className="field">
            <span>Ad soyad</span>
            <div className="field-control">
              <UserCog size={17} />
              <input value={createForm.fullName} onChange={(event) => setCreateForm((form) => ({ ...form, fullName: event.target.value }))} />
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
            <button className="primary-action" type="submit" disabled={savingCreate || institutions.length === 0}>
              {savingCreate ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Oluştur
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title="Kullanıcı düzenle" kicker={selectedUser?.fullName ?? ""} icon={<Pencil size={20} />}>
        {userError && <div className="form-error">{userError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void updateGlobalUser(event)}>
          <label className="field">
            <span>Kurum</span>
            <div className="field-control">
              <Building2 size={17} />
              <select value={editForm.tenantId} onChange={(event) => setEditForm((form) => ({ ...form, tenantId: event.target.value }))} disabled={protectedSelection}>
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
              <input value={editForm.email} onChange={(event) => setEditForm((form) => ({ ...form, email: event.target.value }))} type="email" disabled={protectedSelection} />
            </div>
          </label>
          <label className="field">
            <span>Ad soyad</span>
            <div className="field-control">
              <UserCog size={17} />
              <input value={editForm.fullName} onChange={(event) => setEditForm((form) => ({ ...form, fullName: event.target.value }))} disabled={protectedSelection} />
            </div>
          </label>
          <label className="field">
            <span>Rol</span>
            <div className="field-control">
              <ShieldCheck size={17} />
              <select value={editForm.role} onChange={(event) => setEditForm((form) => ({ ...form, role: event.target.value }))} disabled={protectedSelection}>
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
              <select value={editForm.status} onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))} disabled={protectedSelection}>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </div>
          </label>
          {protectedSelection && <p className="empty-text">Süper admin hesabı sistem hesabıdır; bu ekranda değiştirilemez.</p>}
          <div className="sa-modal-actions">
            <button type="button" className="ghost-action" onClick={() => setSelectedUser(null)}>
              Vazgeç
            </button>
            <button className="primary-action" type="submit" disabled={savingEdit || protectedSelection}>
              {savingEdit ? <Loader2 className="spin" size={18} /> : <Pencil size={18} />}
              Güncelle
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
