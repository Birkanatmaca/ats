import { LogOut } from "lucide-react";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { NotificationBell } from "../role-dashboard/components/NotificationBell";
import { api } from "../lib/api";
import { AppBrand, SidebarTenantName } from "./AppBrand";

export type SidebarNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  group?: string;
  badge?: ReactNode;
  end?: boolean;
};

export function SidebarNav({
  ariaLabel,
  basePath,
  items
}: {
  ariaLabel: string;
  basePath: string;
  items: SidebarNavItem[];
}) {
  let lastGroup = "";
  return (
    <nav className="admin-nav" aria-label={ariaLabel}>
      {items.map((tab) => {
        const showGroup = Boolean(tab.group && tab.group !== lastGroup);
        if (tab.group) {
          lastGroup = tab.group;
        }
        return (
          <Fragment key={tab.id}>
            {showGroup ? <p className="nav-group-label">{tab.group}</p> : null}
            <NavLink
              className={({ isActive }) => (isActive ? "nav-button active" : "nav-button")}
              end={tab.end}
              to={`${basePath}/${tab.id}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge}
            </NavLink>
          </Fragment>
        );
      })}
    </nav>
  );
}

export function SidebarFooter({
  tenantName,
  tenantSubtitle,
  userName,
  userMeta,
  profilePath = "/dashboard/profile",
  showNotifications = true,
  notificationMode = "user",
  onUnreadNotificationsChange,
  onLogout
}: {
  tenantName: string;
  tenantSubtitle?: string;
  userName?: string;
  userMeta?: string;
  profilePath?: string;
  showNotifications?: boolean;
  notificationMode?: "user" | "guardian";
  onUnreadNotificationsChange?: (count: number) => void;
  onLogout: () => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [accent, setAccent] = useState("#2d7fc7");
  const initial = (userName ?? tenantName).slice(0, 1).toLocaleUpperCase("tr-TR");

  useEffect(() => {
    if (!userName) {
      return;
    }
    void api
      .profile()
      .then((profile) => {
        setAvatarUrl(profile.avatarUrl || null);
        setAccent(profile.profileAccent || "#2d7fc7");
      })
      .catch(() => {
        setAvatarUrl(null);
      });
  }, [userName]);

  return (
    <div className="sidebar-footer">
      <SidebarTenantName name={tenantName} subtitle={tenantSubtitle} />
      {userName ? (
        <div className="sidebar-user">
          {showNotifications ? (
            <NotificationBell
              mode={notificationMode}
              managePath={`${profilePath.replace(/\/profile$/, "")}/notifications`}
              onUnreadChange={onUnreadNotificationsChange}
            />
          ) : null}
          <NavLink className="sidebar-user-link" to={profilePath} aria-label="Profil sayfası">
            <div className="profile-avatar" style={{ background: avatarUrl ? "#fff" : accent }}>
              {avatarUrl ? <img src={avatarUrl} alt="" className="profile-avatar-image" /> : initial}
            </div>
            <div className="sidebar-user-text">
              <strong>{userName}</strong>
              <span>{userMeta}</span>
            </div>
          </NavLink>
        </div>
      ) : null}
      <button type="button" className="sidebar-logout" onClick={onLogout}>
        <LogOut size={18} aria-hidden />
        <span>Çıkış yap</span>
      </button>
    </div>
  );
}

export function AppSidebar({
  ariaLabel,
  basePath,
  items,
  tenantName,
  tenantSubtitle,
  userName,
  userMeta,
  profilePath,
  showNotifications,
  notificationMode,
  onUnreadNotificationsChange,
  extra,
  onLogout
}: {
  ariaLabel: string;
  basePath: string;
  items: SidebarNavItem[];
  tenantName: string;
  tenantSubtitle?: string;
  userName?: string;
  userMeta?: string;
  profilePath?: string;
  showNotifications?: boolean;
  notificationMode?: "user" | "guardian";
  onUnreadNotificationsChange?: (count: number) => void;
  extra?: ReactNode;
  onLogout: () => void;
}) {
  return (
    <aside className="admin-sidebar">
      <NavLink className="sidebar-brand" to={basePath} aria-label="OGTA ana sayfa">
        <AppBrand compact />
      </NavLink>
      {extra}
      <SidebarNav ariaLabel={ariaLabel} basePath={basePath} items={items} />
      <SidebarFooter
        notificationMode={notificationMode}
        onLogout={onLogout}
        onUnreadNotificationsChange={onUnreadNotificationsChange}
        profilePath={profilePath}
        showNotifications={showNotifications}
        tenantName={tenantName}
        tenantSubtitle={tenantSubtitle}
        userMeta={userMeta}
        userName={userName}
      />
    </aside>
  );
}
