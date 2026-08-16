import {
  Building2,
  CheckCircle2,
  Clipboard,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UsersRound
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Institution, UserAccount } from "../../lib/api";
import { api, type CreatedUserCredential } from "../../lib/api";
import { TablePagination } from "../../role-dashboard/components/TablePagination";
import { usePaginatedRows } from "../../role-dashboard/hooks/usePaginatedRows";
import { Modal } from "../components/Modal";
import { initials } from "../utils/institutionHelpers";
import { roleLabel } from "../utils/labels";
import "./UsersPage.css";

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "super_admin", label: "Süper admin" },
  { value: "principal", label: "Müdür" },
  { value: "guidance", label: "Rehberlik" },
  { value: "teacher", label: "Öğretmen" },
  { value: "guardian", label: "Veli" }
];

export function UsersPage({ users, institutions, onRefresh }: { users: UserAccount[]; institutions: Institution[]; onRefresh: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterTenantId, setFilterTenantId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ tenantId: institutions[0]?.id ?? "", email: "", fullName: "", role: "principal" });
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editForm, setEditForm] = useState({ tenantId: "", email: "", fullName: "", role: "principal", status: "active" });
  const [credential, setCredential] = useState<CreatedUserCredential | null>(null);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const userStats = useMemo(() => {
    const activeUsers = users.filter((user) => user.status === "active").length;
    const firstLoginUsers = users.filter((user) => user.mustChangePassword).length;
    return {
      total: users.length,
      activeUsers,
      firstLoginUsers,
      institutions: institutions.length
    };
  }, [institutions.length, users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return users
      .filter((user) => {
        if (filterRole && user.role !== filterRole) {
          return false;
        }
        if (filterTenantId && user.tenantId !== filterTenantId) {
          return false;
        }
        if (filterStatus && user.status !== filterStatus) {
          return false;
        }
        if (!q) {
          return true;
        }
        const blob = `${user.fullName} ${user.email} ${user.tenant} ${user.role} ${user.status}`.toLocaleLowerCase("tr-TR");
        return blob.includes(q);
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
  }, [filterRole, filterStatus, filterTenantId, query, users]);

  const filterKey = `${query}|${filterRole}|${filterTenantId}|${filterStatus}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filteredUsers, filterKey);
  const protectedSelection = editingUser?.role === "super_admin";

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
    if (!editingUser || protectedSelection) {
      return;
    }
    setSavingEdit(true);
    setUserError(null);
    try {
      const updated = await api.updateSuperAdminUser(editingUser.id, editForm);
      setSelectedUser(updated);
      setEditingUser(null);
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
    if (selectedUser) {
      const fresh = users.find((user) => user.id === selectedUser.id && user.tenantId === selectedUser.tenantId);
      if (!fresh) {
        setSelectedUser(null);
      } else if (fresh !== selectedUser) {
        setSelectedUser(fresh);
      }
    }
  }, [users, selectedUser]);

  useEffect(() => {
    if (!editingUser) {
      return;
    }
    const fresh = users.find((user) => user.id === editingUser.id && user.tenantId === editingUser.tenantId);
    if (!fresh) {
      setEditingUser(null);
      return;
    }
    if (fresh !== editingUser) {
      setEditingUser(fresh);
    }
  }, [users, editingUser]);

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
  }, [editingUser]);

  return (
    <section className="usr">
      <header className="usr-hero">
        <div>
          <p className="usr-kicker">Yönetim</p>
          <h1>Kullanıcılar</h1>
        </div>
        <button className="usr-btn usr-btn--primary" type="button" onClick={() => setShowCreateUser(true)}>
          <Plus size={16} />
          Yeni kullanıcı
        </button>
      </header>

      <div className="usr-kpi-grid">
        <article className="usr-kpi">
          <div className="usr-kpi-icon">
            <UsersRound size={18} />
          </div>
          <span>Toplam</span>
          <strong>{userStats.total}</strong>
        </article>
        <article className="usr-kpi">
          <div className="usr-kpi-icon usr-kpi-icon--green">
            <CheckCircle2 size={18} />
          </div>
          <span>Aktif</span>
          <strong>{userStats.activeUsers}</strong>
        </article>
        <article className="usr-kpi">
          <div className="usr-kpi-icon usr-kpi-icon--amber">
            <KeyRound size={18} />
          </div>
          <span>İlk giriş</span>
          <strong>{userStats.firstLoginUsers}</strong>
        </article>
        <article className="usr-kpi">
          <div className="usr-kpi-icon usr-kpi-icon--violet">
            <Building2 size={18} />
          </div>
          <span>Kurum</span>
          <strong>{userStats.institutions}</strong>
        </article>
      </div>

      <div className="usr-toolbar">
        <label className="usr-search">
          <Search size={16} />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Ad, e-posta veya kurum ara" type="search" value={query} />
        </label>
        <select onChange={(event) => setFilterTenantId(event.target.value)} value={filterTenantId}>
          <option value="">Tüm kurumlar</option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name}
            </option>
          ))}
        </select>
        <select onChange={(event) => setFilterStatus(event.target.value)} value={filterStatus}>
          <option value="">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="passive">Pasif</option>
        </select>
      </div>

      <div className="usr-filters">
        {ROLE_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value || "all"}
            className={filterRole === option.value ? "is-active" : undefined}
            onClick={() => setFilterRole(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {credential ? (
        <div className="usr-credential">
          <div>
            <span>Geçici giriş</span>
            <strong>{credential.user.email}</strong>
            <code>{credential.temporaryPassword}</code>
          </div>
          <button
            className="usr-btn usr-btn--ghost"
            onClick={() => void navigator.clipboard?.writeText(`${credential.user.email} / ${credential.temporaryPassword}`)}
            type="button"
          >
            <Clipboard size={16} />
            Kopyala
          </button>
        </div>
      ) : null}

      {userError && !showCreateUser && !editingUser ? <div className="form-error sa-alert">{userError}</div> : null}

      <article className="usr-card">
        {filteredUsers.length === 0 ? (
          <p className="usr-empty">{users.length === 0 ? "Henüz kullanıcı yok." : "Bu filtreye uyan kullanıcı bulunamadı."}</p>
        ) : (
          <>
            <div className="usr-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Kullanıcı</th>
                    <th>Kurum</th>
                    <th>Rol</th>
                    <th>Durum</th>
                    <th>İlk giriş</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((user) => (
                    <tr
                      className={selectedUser?.id === user.id && selectedUser?.tenantId === user.tenantId ? "is-selected" : undefined}
                      key={`${user.tenantId}-${user.id}`}
                    >
                      <td>
                        <div className="usr-person">
                          <span className="usr-avatar">{initials(user.fullName)}</span>
                          <div>
                            <strong>{user.fullName}</strong>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{user.tenant}</td>
                      <td>
                        <span className={`usr-badge usr-badge--${user.role}`}>{roleLabel(user.role)}</span>
                      </td>
                      <td>
                        <span className={`usr-badge ${user.status === "active" ? "usr-badge--ok" : "usr-badge--off"}`}>
                          {user.status === "active" ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td>
                        <span className={`usr-badge ${user.mustChangePassword ? "usr-badge--wait" : "usr-badge--ok"}`}>
                          {user.mustChangePassword ? "Bekleniyor" : "Tamam"}
                        </span>
                      </td>
                      <td>
                        <div className="usr-row-actions">
                          <button
                            aria-label={`${user.fullName} düzenle`}
                            className="usr-btn usr-btn--icon"
                            onClick={() => {
                              setUserError(null);
                              setSelectedUser(user);
                              setEditingUser(user);
                            }}
                            type="button"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            aria-label={`${user.fullName} pasifleştir`}
                            className="usr-btn usr-btn--icon usr-btn--danger"
                            disabled={user.role === "super_admin"}
                            onClick={() => void deleteGlobalUser(user)}
                            type="button"
                          >
                            <Trash2 size={15} />
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

      <Modal open={showCreateUser} onClose={() => setShowCreateUser(false)} title="Yeni kullanıcı" kicker="Hesap" icon={<UserCog size={20} />}>
        {userError && <div className="form-error">{userError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void createGlobalUser(event)}>
          <label className="field">
            <span>Kurum</span>
            <div className="field-control">
              <Building2 size={17} />
              <select onChange={(event) => setCreateForm((form) => ({ ...form, tenantId: event.target.value }))} required value={createForm.tenantId}>
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
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
              <input onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))} required type="email" value={createForm.email} />
            </div>
          </label>
          <label className="field">
            <span>Ad soyad</span>
            <div className="field-control">
              <UserCog size={17} />
              <input onChange={(event) => setCreateForm((form) => ({ ...form, fullName: event.target.value }))} value={createForm.fullName} />
            </div>
          </label>
          <label className="field">
            <span>Rol</span>
            <div className="field-control">
              <ShieldCheck size={17} />
              <select onChange={(event) => setCreateForm((form) => ({ ...form, role: event.target.value }))} value={createForm.role}>
                <option value="principal">Müdür</option>
                <option value="guidance">Rehberlik</option>
                <option value="teacher">Öğretmen</option>
                <option value="guardian">Veli</option>
              </select>
            </div>
          </label>
          <div className="sa-modal-actions">
            <button className="ghost-action" onClick={() => setShowCreateUser(false)} type="button">
              Vazgeç
            </button>
            <button className="primary-action" disabled={savingCreate || institutions.length === 0} type="submit">
              {savingCreate ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Oluştur
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        icon={<Pencil size={20} />}
        kicker={editingUser?.fullName ?? ""}
        onClose={() => {
          setEditingUser(null);
          setUserError(null);
        }}
        open={editingUser !== null}
        title="Kullanıcı düzenle"
      >
        {userError && <div className="form-error">{userError}</div>}
        <form className="sa-modal-form" onSubmit={(event) => void updateGlobalUser(event)}>
          <label className="field">
            <span>Kurum</span>
            <div className="field-control">
              <Building2 size={17} />
              <select
                disabled={protectedSelection}
                onChange={(event) => setEditForm((form) => ({ ...form, tenantId: event.target.value }))}
                value={editForm.tenantId}
              >
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
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
              <input
                disabled={protectedSelection}
                onChange={(event) => setEditForm((form) => ({ ...form, email: event.target.value }))}
                type="email"
                value={editForm.email}
              />
            </div>
          </label>
          <label className="field">
            <span>Ad soyad</span>
            <div className="field-control">
              <UserCog size={17} />
              <input
                disabled={protectedSelection}
                onChange={(event) => setEditForm((form) => ({ ...form, fullName: event.target.value }))}
                value={editForm.fullName}
              />
            </div>
          </label>
          <label className="field">
            <span>Rol</span>
            <div className="field-control">
              <ShieldCheck size={17} />
              <select
                disabled={protectedSelection}
                onChange={(event) => setEditForm((form) => ({ ...form, role: event.target.value }))}
                value={editForm.role}
              >
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
              <select
                disabled={protectedSelection}
                onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))}
                value={editForm.status}
              >
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </div>
          </label>
          {protectedSelection ? <p className="usr-protected">Süper admin hesabı bu ekrandan değiştirilemez.</p> : null}
          <div className="sa-modal-actions">
            <button
              className="ghost-action"
              onClick={() => {
                setEditingUser(null);
                setUserError(null);
              }}
              type="button"
            >
              Vazgeç
            </button>
            <button className="primary-action" disabled={protectedSelection || savingEdit} type="submit">
              {savingEdit ? <Loader2 className="spin" size={18} /> : <Pencil size={18} />}
              Güncelle
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
