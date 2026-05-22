export function AppBrand({ compact }: { compact?: boolean }) {
  return (
    <div className={`app-brand${compact ? " app-brand--compact" : ""}`}>
      <img
        className="app-brand-logo"
        src="/ogta-wordmark.png"
        alt="OGTA"
        width={compact ? 120 : 140}
        height={compact ? 38 : 44}
        decoding="async"
      />
    </div>
  );
}

export function SidebarTenantName({ name, subtitle }: { name: string; subtitle?: string }) {
  return (
    <div className="sidebar-tenant" title={name}>
      <span className="sidebar-tenant-label">Kurum</span>
      <strong className="sidebar-tenant-name">{name}</strong>
      {subtitle ? <span className="sidebar-tenant-sub">{subtitle}</span> : null}
    </div>
  );
}
