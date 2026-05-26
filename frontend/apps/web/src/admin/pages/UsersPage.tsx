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
import "../../role-dashboard/guidance/GuidanceDataPage.css";
import "../../role-dashboard/principal/PrincipalConsole.css";
import { Modal } from "../components/Modal";
import { roleLabel } from "../utils/labels";
import "./UsersPage.css";

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Tüm roller" },
  { value: "super_admin", label: "Süper admin" },
  { value: "principal", label: "Müdür" },
  { value: "guidance", label: "Rehberlik" },
  { value: "teacher", label: "Öğretmen" },
  { value: "guardian", label: "Veli" }
];

function roleBadgeClass(role: string) {
  switch (role) {
    case "super_admin":
      return "guidance-data-badge--rose";
    case "principal":
      return "guidance-data-badge--violet";
    case "guidance":
      return "guidance-data-badge--slate";
    case "teacher":
      return "guidance-data-badge--amber";
    case "guardian":
      return "guidance-data-badge--emerald";
    default:
      return "guidance-data-badge--slate";
  }
}

function statusBadgeClass(status: string) {
  return status === "active" ? "guidance-data-badge--emerald" : "guidance-data-badge--rose";
}

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
    const roleCount = new Set(users.map((user) => user.role)).size;
    return {
      total: users.length,
      activeUsers,
      firstLoginUsers,
      roleCount,
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
    <section className="principal-page-stack guidance-data-page sa-users-page">
      <div className="principal-stat-grid sa-users-stats" aria-label="Kullanıcı istatistikleri">
        <article className="principal-stat-card principal-stat-card--sky">
          <span aria-hidden className="principal-stat-icon">
            <UsersRound size={20} />
          </span>
          <small>Toplam kullanıcı</small>
          <strong>{userStats.total}</strong>
          <em>Tüm kurumlar ve roller</em>
        </article>
        <article className="principal-stat-card principal-stat-card--emerald">
          <span aria-hidden className="principal-stat-icon">
            <CheckCircle2 size={20} />
          </span>
          <small>Aktif hesap</small>
          <strong>{userStats.activeUsers}</strong>
          <em>{userStats.total - userStats.activeUsers} pasif hesap</em>
        </article>
        <article className="principal-stat-card principal-stat-card--amber">
          <span aria-hidden className="principal-stat-icon">
            <KeyRound size={20} />
          </span>
          <small>İlk giriş bekleyen</small>
          <strong>{userStats.firstLoginUsers}</strong>
          <em>Tek kullanımlık şifre tamamlanmadı</em>
        </article>
        <article className="principal-stat-card principal-stat-card--violet">
          <span aria-hidden className="principal-stat-icon">
            <Building2 size={20} />
          </span>
          <small>Kurum kapsamı</small>
          <strong>{userStats.institutions}</strong>
          <em>{userStats.roleCount} farklı rol tipi</em>
        </article>
      </div>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Tüm kullanıcılar</h2>
          <div className="guidance-data-card-head-actions">
            <span>{filteredUsers.length} kullanıcı</span>
            <button className="sa-users-btn sa-users-btn--primary" type="button" onClick={() => setShowCreateUser(true)}>
              <Plus size={16} />
              Kullanıcı oluştur
            </button>
          </div>
        </header>

        <div className="guidance-data-toolbar">
          <select
            aria-label="Rol filtresi"
            className="guidance-data-select"
            onChange={(event) => setFilterRole(event.target.value)}
            value={filterRole}
          >
            {ROLE_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Kurum filtresi"
            className="guidance-data-select"
            onChange={(event) => setFilterTenantId(event.target.value)}
            value={filterTenantId}
          >
            <option value="">Tüm kurumlar</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Durum filtresi"
            className="guidance-data-select"
            onChange={(event) => setFilterStatus(event.target.value)}
            value={filterStatus}
          >
            <option value="">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
          <label className="guidance-data-search">
            <Search aria-hidden size={16} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ad, e-posta, kurum veya rol ara…"
              type="search"
              value={query}
            />
          </label>
        </div>

        {credential ? (
          <div className="sa-users-credential-banner">
            <div>
              <span>Geçici giriş bilgisi</span>
              <strong>{credential.user.email}</strong>
              <code>{credential.temporaryPassword}</code>
            </div>
            <button
              className="sa-users-btn sa-users-btn--ghost"
              onClick={() => void navigator.clipboard?.writeText(`${credential.user.email} / ${credential.temporaryPassword}`)}
              type="button"
            >
              <Clipboard size={16} />
              Kopyala
            </button>
          </div>
        ) : null}

        {filteredUsers.length === 0 ? (
          <p className="guidance-data-empty">{users.length === 0 ? "Henüz kullanıcı kaydı yok." : "Filtrelere uyan kullanıcı bulunamadı."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table sa-users-table">
                <thead>
                  <tr>
                    <th>Kullanıcı</th>
                    <th>Kurum</th>
                    <th>Rol</th>
                    <th>Durum</th>
                    <th>İlk giriş</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((user) => (
                    <tr
                      className={selectedUser?.id === user.id && selectedUser?.tenantId === user.tenantId ? "sa-users-row-selected" : undefined}
                      key={`${user.tenantId}-${user.id}`}
                    >
                      <td>
                        <span className="guidance-data-primary">{user.fullName}</span>
                        <span className="guidance-data-secondary">{user.email}</span>
                      </td>
                      <td>
                        <span className="guidance-data-primary">{user.tenant}</span>
                      </td>
                      <td>
                        <span className={`guidance-data-badge ${roleBadgeClass(user.role)}`}>{roleLabel(user.role)}</span>
                      </td>
                      <td>
                        <span className={`guidance-data-badge guidance-data-badge--inline ${statusBadgeClass(user.status)}`}>
                          {user.status === "active" ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`guidance-data-badge guidance-data-badge--inline${
                            user.mustChangePassword ? " guidance-data-badge--amber" : " guidance-data-badge--emerald"
                          }`}
                        >
                          {user.mustChangePassword ? (
                            <>
                              <KeyRound aria-hidden size={11} />
                              Bekleniyor
                            </>
                          ) : (
                            <>
                              <CheckCircle2 aria-hidden size={11} />
                              Tamamlandı
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="guidance-data-actions sa-users-row-actions">
                          <button
                            aria-label={`${user.fullName} düzenle`}
                            className="sa-users-btn sa-users-btn--ghost sa-users-btn--icon"
                            onClick={() => {
                              setUserError(null);
                              setSelectedUser(user);
                              setEditingUser(user);
                            }}
                            title="Düzenle"
                            type="button"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            aria-label={`${user.fullName} sil`}
                            className="sa-users-btn sa-users-btn--ghost sa-users-btn--icon sa-users-btn--danger"
                            disabled={user.role === "super_admin"}
                            onClick={() => void deleteGlobalUser(user)}
                            title="Pasifleştir"
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

      <Modal open={showCreateUser} onClose={() => setShowCreateUser(false)} title="Yeni kullanıcı" kicker="Global CRUD" icon={<UserCog size={20} />}>
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
          {protectedSelection ? <p className="guidance-data-empty sa-users-protected-note">Süper admin hesabı sistem hesabıdır; bu ekranda değiştirilemez.</p> : null}
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
