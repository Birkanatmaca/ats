import { Bell, CalendarDays, ClipboardCheck, LayoutDashboard, ListChecks, School, UserCircle, UserRound, UsersRound } from "lucide-react";

export const principalTabs = [
  { id: "overview", label: "Genel", icon: <LayoutDashboard size={18} /> },
  { id: "teachers", label: "Öğretmenler", icon: <UserRound size={18} /> },
  { id: "students", label: "Öğrenciler", icon: <UsersRound size={18} /> },
  { id: "classes", label: "Sınıflar", icon: <School size={18} /> },
  { id: "attendance", label: "Yoklama", icon: <ClipboardCheck size={18} /> },
  { id: "schedule", label: "Program", icon: <CalendarDays size={18} /> },
  { id: "operations", label: "Operasyon", icon: <ListChecks size={18} /> },
  { id: "announcements", label: "Duyuru", icon: <Bell size={18} /> },
  { id: "profile", label: "Profil", icon: <UserCircle size={18} /> }
] as const;

export type PrincipalTab = (typeof principalTabs)[number]["id"];
