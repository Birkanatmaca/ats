import { Blocks, Building2, FileClock, LayoutDashboard, LifeBuoy, Settings2, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminTab } from "../types";

export const navTabs: Array<{ id: AdminTab; label: string; icon: ReactNode }> = [
  { id: "overview", label: "Genel", icon: <LayoutDashboard size={18} /> },
  { id: "institutions", label: "Kurumlar", icon: <Building2 size={18} /> },
  { id: "users", label: "Kullanıcılar", icon: <UsersRound size={18} /> },
  { id: "support", label: "Destek", icon: <LifeBuoy size={18} /> },
  { id: "logs", label: "Loglar", icon: <FileClock size={18} /> },
  { id: "modules", label: "Modüller", icon: <Blocks size={18} /> },
  { id: "settings", label: "Ayarlar", icon: <Settings2 size={18} /> }
];
