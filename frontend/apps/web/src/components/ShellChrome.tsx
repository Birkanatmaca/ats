import { LogOut } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { NotificationBell } from "../role-dashboard/components/NotificationBell";
import { api } from "../lib/api";
import { SidebarTenantName } from "./AppBrand";

export function NavbarUserMenu({
  name,
  meta,
  showNotifications = true,
  notificationMode = "user",
  onUnreadNotificationsChange,
  profilePath = "/dashboard/profile",
  extra,
  middleAction
}: {
  name: string;
  meta: string;
  showNotifications?: boolean;
  notificationMode?: "user" | "guardian";
  onUnreadNotificationsChange?: (count: number) => void;
  profilePath?: string;
  extra?: ReactNode;
  middleAction?: ReactNode;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [accent, setAccent] = useState("#0891b2");
  const initial = name.slice(0, 1).toLocaleUpperCase("tr-TR");

  useEffect(() => {
    void api
      .profile()
      .then((profile) => {
        setAvatarUrl(profile.avatarUrl || null);
        setAccent(profile.profileAccent || "#0891b2");
      })
      .catch(() => {
        setAvatarUrl(null);
      });
  }, [name]);

  return (
    <div className="navbar-actions">
      {extra}
      {showNotifications ? (
        <NotificationBell mode={notificationMode} managePath={`${profilePath.replace(/\/profile$/, "")}/notifications`} onUnreadChange={onUnreadNotificationsChange} />
      ) : null}
      {middleAction}
      <NavLink className="navbar-profile navbar-profile-link" to={profilePath} aria-label="Profil sayfası">
        <div className="profile-avatar" style={{ background: avatarUrl ? "#fff" : accent }}>
          {avatarUrl ? <img src={avatarUrl} alt="" className="profile-avatar-image" /> : initial}
        </div>
        <div className="navbar-profile-text">
          <strong>{name}</strong>
          <span>{meta}</span>
        </div>
      </NavLink>
    </div>
  );
}

export function SidebarFooter({
  tenantName,
  tenantSubtitle,
  onLogout
}: {
  tenantName: string;
  tenantSubtitle?: string;
  onLogout: () => void;
}) {
  return (
    <div className="sidebar-footer">
      <SidebarTenantName name={tenantName} subtitle={tenantSubtitle} />
      <button type="button" className="sidebar-logout" onClick={onLogout}>
        <LogOut size={18} aria-hidden />
        <span>Çıkış yap</span>
      </button>
    </div>
  );
}
