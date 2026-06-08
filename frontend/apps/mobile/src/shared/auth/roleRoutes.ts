import type { Href } from "expo-router";
import type { Role } from "@/shared/api/types";

export type MobileRoleShell = "principal" | "teacher" | "guardian" | "guidance" | "driver" | "super_admin_blocked";

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
    case "driver":
      return "driver";
    case "super_admin":
    default:
      return "super_admin_blocked";
  }
}

export function shellHref(shell: MobileRoleShell): Href {
  switch (shell) {
    case "principal":
      return "/(app)/principal" as Href;
    case "teacher":
      return "/(app)/teacher" as Href;
    case "guardian":
      return "/(app)/guardian" as Href;
    case "guidance":
      return "/(app)/guidance" as Href;
    case "driver":
      return "/(app)/driver" as Href;
    case "super_admin_blocked":
      return "/(app)/super-admin-blocked" as Href;
  }
}

export const roleLabels: Record<Role, string> = {
  super_admin: "Süper Admin",
  system_admin: "Sistem Yöneticisi",
  principal: "Müdür",
  guidance: "Rehberlik",
  teacher: "Öğretmen",
  guardian: "Veli",
  driver: "Şoför"
};
