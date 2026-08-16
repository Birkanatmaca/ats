import { Camera, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { roleLabel, statusLabel } from "../../admin/utils/labels";
import type { AuthSession, Role, UserAccount, UserProfile } from "../../lib/api";
import { api, storeAuthSession } from "../../lib/api";
import "../guidance/GuidanceDataPage.css";
import "./ProfilePage.css";

const ACCENT_OPTIONS = [
  { value: "#0891b2", label: "Turkuaz" },
  { value: "#6d28d9", label: "Mor" },
  { value: "#047857", label: "Yeşil" },
  { value: "#b45309", label: "Amber" },
  { value: "#be123c", label: "Kırmızı" },
  { value: "#334155", label: "Grafit" }
] as const;

const ROLE_OPTIONS: Role[] = ["principal", "guidance", "teacher", "guardian"];
const STATUS_OPTIONS = ["active", "first_login", "invited", "passive"] as const;

function canManageTenantUsers(role: Role) {
  return role === "principal" || role === "system_admin";
}

function profileToForm(profile: UserProfile) {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone ?? "",
    role: profile.role,
    status: profile.status,
    avatarUrl: profile.avatarUrl ?? "",
    profileAccent: profile.profileAccent || "#0891b2"
  };
}

function accountToProfile(account: UserAccount): UserProfile {
  return {
    id: account.id,
    tenantId: account.tenantId,
    tenant: account.tenant,
    fullName: account.fullName,
    email: account.email,
    phone: account.phone,
    role: account.role as Role,
    status: account.status,
    avatarUrl: account.avatarUrl,
    profileAccent: account.profileAccent,
    mustChangePassword: account.mustChangePassword,
    createdAt: account.createdAt
  };
}

export function ProfilePage({
  session,
  onSessionUpdate
}: {
  session: AuthSession;
  onSessionUpdate: (session: AuthSession) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isManager = canManageTenantUsers(session.principal.role);
  const [ownProfile, setOwnProfile] = useState<UserProfile | null>(null);
  const [tenantUsers, setTenantUsers] = useState<UserAccount[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(session.principal.userId);
  const [form, setForm] = useState(profileToForm({
    id: session.principal.userId,
    tenantId: session.principal.tenantId,
    fullName: session.principal.name,
    email: session.principal.email ?? "",
    role: session.principal.role,
    status: "active",
    mustChangePassword: session.principal.mustChangePassword,
    createdAt: new Date().toISOString()
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingSelf = selectedUserId === session.principal.userId;
  const canEditDetails = isManager || editingSelf;
  const canEditVisual = isManager || editingSelf;

  const selectedProfile = useMemo(() => {
    if (editingSelf) {
      return ownProfile;
    }
    const account = tenantUsers.find((user) => user.id === selectedUserId);
    return account ? accountToProfile(account) : null;
  }, [editingSelf, ownProfile, selectedUserId, tenantUsers]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await api.profile();
      setOwnProfile(profile);
      const userIdParam = searchParams.get("userId");
      if (isManager) {
        const users = await api.principalUsers();
        setTenantUsers(users ?? []);
        const targetId =
          userIdParam && users?.some((user) => user.id === userIdParam) ? userIdParam : session.principal.userId;
        setSelectedUserId(targetId);
        if (targetId === session.principal.userId) {
          setForm(profileToForm(profile));
        } else {
          const account = users?.find((user) => user.id === targetId);
          if (account) {
            setForm(profileToForm(accountToProfile(account)));
          }
        }
      } else {
        setSelectedUserId(session.principal.userId);
        setForm(profileToForm(profile));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Profil yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [isManager, searchParams, session.principal.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedProfile || loading) {
      return;
    }
    setForm(profileToForm(selectedProfile));
  }, [selectedUserId, selectedProfile?.id, loading]);

  function handleUserChange(userId: string) {
    setSelectedUserId(userId);
    setMessage(null);
    setError(null);
    if (userId === session.principal.userId) {
      setSearchParams({});
      if (ownProfile) {
        setForm(profileToForm(ownProfile));
      }
      return;
    }
    setSearchParams({ userId });
    const account = tenantUsers.find((user) => user.id === userId);
    if (account) {
      setForm(profileToForm(accountToProfile(account)));
    }
  }

  async function handleAvatarFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir görsel dosyası seçin.");
      return;
    }
    if (file.size > 2_000_000) {
      setError("Görsel en fazla 2 MB olabilir.");
      return;
    }
    setAvatarUploading(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await api.uploadFile({
        file,
        category: "profile",
        resourceType: "profile",
        resourceId: selectedUserId
      });
      setForm((current) => ({ ...current, avatarUrl: api.filePublicURL(uploaded.key) }));
      setMessage("Profil görseli yüklendi. Kalıcı olması için profili kaydedin.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Görsel yüklenemedi.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (avatarUploading) {
      setError("Profil görseli yüklenirken kaydetmeyin.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (isManager && !editingSelf) {
        await api.updatePrincipalUser(selectedUserId, {
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          role: form.role,
          status: form.status,
          avatarUrl: form.avatarUrl,
          profileAccent: form.profileAccent
        });
        await load();
        setMessage("Kullanıcı bilgileri güncellendi.");
      } else if (isManager && editingSelf) {
        await api.updatePrincipalUser(session.principal.userId, {
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          role: form.role,
          status: form.status,
          avatarUrl: form.avatarUrl,
          profileAccent: form.profileAccent
        });
        const updated = await api.profile();
        setOwnProfile(updated);
        const nextSession: AuthSession = {
          ...session,
          principal: {
            ...session.principal,
            name: updated.fullName,
            email: updated.email
          }
        };
        storeAuthSession(nextSession);
        onSessionUpdate(nextSession);
        setMessage("Profiliniz güncellendi.");
      } else {
        const updated = await api.updateProfile({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          avatarUrl: form.avatarUrl || null,
          profileAccent: form.profileAccent
        });
        setOwnProfile(updated);
        const nextSession: AuthSession = {
          ...session,
          principal: {
            ...session.principal,
            name: updated.fullName,
            email: updated.email
          }
        };
        storeAuthSession(nextSession);
        onSessionUpdate(nextSession);
        setMessage("Profiliniz güncellendi.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  }

  const initials = form.fullName.slice(0, 1).toLocaleUpperCase("tr-TR");

  return (
    <section className="guidance-page-stack guidance-data-page profile-page">
      {isManager ? (
        <article className="guidance-data-card profile-user-picker-card">
          <header className="guidance-data-card-head">
            <h2>Kullanıcı seçimi</h2>
            <span>{tenantUsers.length} kurum kullanıcısı</span>
          </header>
          <div className="profile-user-picker">
            <label className="field">
              <span>Düzenlenen kullanıcı</span>
              <select value={selectedUserId} onChange={(event) => handleUserChange(event.target.value)}>
                <option value={session.principal.userId}>{session.principal.name} (Ben)</option>
                {tenantUsers
                  .filter((user) => user.id !== session.principal.userId)
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} · {roleLabel(user.role)}
                    </option>
                  ))}
              </select>
            </label>
            <p className="profile-user-picker-hint">
              Müdür olarak kurumdaki tüm kullanıcıların bilgilerini düzenleyebilirsiniz. Diğer roller yalnızca kendi görünüm ayarlarını değiştirebilir.
            </p>
          </div>
        </article>
      ) : null}

      {loading ? (
        <p className="guidance-data-empty">Profil yükleniyor…</p>
      ) : (
        <form className="profile-layout" onSubmit={handleSubmit}>
          <article className="guidance-data-card profile-visual-card">
            <header className="guidance-data-card-head">
              <h2>Görünüm</h2>
              <span>{canEditVisual ? "Düzenlenebilir" : "Salt okunur"}</span>
            </header>
            <div className="profile-visual-body">
              <div className="profile-visual-center">
                <div
                  className="profile-avatar-shell"
                  style={{ "--profile-accent": form.profileAccent } as React.CSSProperties}
                >
                  <div className="profile-avatar-preview">
                    {form.avatarUrl ? <img src={form.avatarUrl} alt="" /> : <span>{initials}</span>}
                  </div>
                  {canEditVisual ? (
                    <button
                      className="profile-avatar-upload-btn"
                      type="button"
                      aria-label="Profil görseli yükle"
                      disabled={avatarUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarUploading ? <Loader2 className="spin" size={16} /> : <Camera size={16} />}
                    </button>
                  ) : null}
                </div>

                <input ref={fileInputRef} accept="image/png,image/jpeg,image/webp" hidden type="file" onChange={handleAvatarFile} />

                <p className="profile-visual-lead">Profil görseli ve tema rengi navbar’da görünür.</p>

                <div className="profile-visual-actions">
                  <button className="ghost-action" type="button" onClick={() => fileInputRef.current?.click()} disabled={!canEditVisual || avatarUploading}>
                    {avatarUploading ? <Loader2 className="spin" size={16} /> : <Camera size={16} />}
                    {avatarUploading ? "Yükleniyor" : "Görsel yükle"}
                  </button>
                  <button
                    className="ghost-action"
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, avatarUrl: "" }))}
                    disabled={!canEditVisual || !form.avatarUrl || avatarUploading}
                  >
                    Görseli kaldır
                  </button>
                </div>

                <div className="profile-accent-section">
                  <span className="profile-accent-label">Tema rengi</span>
                  <div className="profile-accent-grid">
                    {ACCENT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`profile-accent-option${form.profileAccent === option.value ? " is-active" : ""}`}
                        style={{ "--swatch-color": option.value } as React.CSSProperties}
                        type="button"
                        title={option.label}
                        disabled={!canEditVisual}
                        onClick={() => setForm((current) => ({ ...current, profileAccent: option.value }))}
                      >
                        <span className="profile-accent-swatch" aria-hidden />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="guidance-data-card profile-details-card">
            <header className="guidance-data-card-head">
              <h2>Hesap bilgileri</h2>
              <span>{canEditDetails ? "Tam düzenleme" : "Salt okunur"}</span>
            </header>
            <div className="profile-details-body">
              {error ? <div className="form-error">{error}</div> : null}
              {message ? <div className="form-success">{message}</div> : null}
              <label className="field">
                <span>Ad soyad</span>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  disabled={!canEditDetails}
                  required
                />
              </label>
              <label className="field">
                <span>E-posta</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  disabled={!canEditDetails}
                  required
                />
              </label>
              <label className="field">
                <span>Telefon</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  disabled={!canEditDetails}
                  placeholder="05xx xxx xx xx"
                />
              </label>
              <div className="profile-details-row">
                <label className="field">
                  <span>Rol</span>
                  <select
                    value={form.role}
                    onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
                    disabled={!isManager || editingSelf}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Durum</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                    disabled={!isManager || editingSelf}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="primary-action profile-save-btn" type="submit" disabled={saving || avatarUploading}>
                {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                {isManager && !editingSelf ? "Kullanıcıyı kaydet" : "Profili kaydet"}
              </button>
            </div>
          </article>
        </form>
      )}
    </section>
  );
}
