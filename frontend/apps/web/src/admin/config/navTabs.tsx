import { Blocks, BrainCircuit, Building2, CreditCard, FileClock, LayoutDashboard, LifeBuoy, Settings2, UserCircle, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminTab } from "../types";

export const navTabs: Array<{ id: AdminTab; label: string; icon: ReactNode; group: string }> = [
  { id: "overview", label: "Genel", icon: <LayoutDashboard size={18} />, group: "Özet" },
  { id: "institutions", label: "Kurumlar", icon: <Building2 size={18} />, group: "Platform" },
  { id: "billing", label: "Faturalama", icon: <CreditCard size={18} />, group: "Platform" },
  { id: "users", label: "Kullanıcılar", icon: <UsersRound size={18} />, group: "Platform" },
  { id: "support", label: "Destek", icon: <LifeBuoy size={18} />, group: "Operasyon" },
  { id: "logs", label: "Loglar", icon: <FileClock size={18} />, group: "Operasyon" },
  { id: "ai", label: "ogta.ai", icon: <BrainCircuit size={18} />, group: "Operasyon" },
  { id: "modules", label: "Modüller", icon: <Blocks size={18} />, group: "Sistem" },
  { id: "settings", label: "Ayarlar", icon: <Settings2 size={18} />, group: "Sistem" },
  { id: "profile", label: "Profil", icon: <UserCircle size={18} />, group: "Sistem" }
];
