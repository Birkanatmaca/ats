import type {
  AuditEntry,
  Institution,
  PlatformSettings,
  SuperAdminOverview,
  SupportTicket,
  SystemMetrics,
  UserAccount
} from "../lib/api";

export type SuperAdminState = {
  overview?: SuperAdminOverview;
  institutions?: Institution[];
  users?: UserAccount[];
  auditLogs?: AuditEntry[];
  settings?: PlatformSettings;
  supportTickets?: SupportTicket[];
  systemMetrics?: SystemMetrics;
};

export type AdminTab = "overview" | "institutions" | "billing" | "users" | "support" | "logs" | "ai" | "modules" | "settings";
