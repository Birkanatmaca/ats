import type { Role } from "@/shared/api/types";

export type MobileRoleShell = "principal" | "teacher" | "guardian" | "guidance" | "super_admin_blocked";

export function resolveMobileShell(role: Role): MobileRoleShell {
  switch (role) {
    case "principal":
    case "system_admin":
      return "principal";
    case "teacher":
      return "teacher";
    case "guardian":
      return "guardian";
    case "guidance":
      return "guidance";
    case "super_admin":
    default:
      return "super_admin_blocked";
  }
}

export function shellHref(shell: MobileRoleShell): string {
  switch (shell) {
    case "principal":
      return "/(app)/principal";
    case "teacher":
      return "/(app)/teacher";
    case "guardian":
      return "/(app)/guardian";
    case "guidance":
      return "/(app)/guidance";
    case "super_admin_blocked":
      return "/(app)/super-admin-blocked";
  }
}

export const roleLabels: Record<Role, string> = {
  super_admin: "Süper Admin",
  system_admin: "Sistem Yöneticisi",
  principal: "Müdür",
  guidance: "Rehberlik",
  teacher: "Öğretmen",
  guardian: "Veli"
};
