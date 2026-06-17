import { BarChart3, Bell, BookOpenCheck, Bus, CalendarDays, CircleDollarSign, ClipboardCheck, FolderOpen, HeartHandshake, Inbox, LayoutDashboard, ListChecks, School, Soup, UserCircle, UserRound, UsersRound } from "lucide-react";

export const principalTabs = [
  { id: "overview", label: "Genel", icon: <LayoutDashboard size={18} /> },
  { id: "reports", label: "Raporlar", icon: <BarChart3 size={18} /> },
  { id: "teachers", label: "Öğretmenler", icon: <UserRound size={18} /> },
  { id: "students", label: "Öğrenciler", icon: <UsersRound size={18} /> },
  { id: "guardians", label: "Veliler", icon: <HeartHandshake size={18} /> },
  { id: "classes", label: "Sınıflar", icon: <School size={18} /> },
  { id: "academic", label: "Akademik", icon: <BookOpenCheck size={18} /> },
  { id: "attendance", label: "Yoklama", icon: <ClipboardCheck size={18} /> },
  { id: "billing", label: "Tahsilat", icon: <CircleDollarSign size={18} /> },
  { id: "schedule", label: "Program", icon: <CalendarDays size={18} /> },
  { id: "life", label: "Okul Yaşamı", icon: <Soup size={18} /> },
  { id: "services", label: "Servis Şoförleri", icon: <Bus size={18} /> },
  { id: "operations", label: "Operasyon", icon: <ListChecks size={18} /> },
  { id: "guidance-cases", label: "Rehberlik vakaları", icon: <FolderOpen size={18} /> },
  { id: "announcements", label: "Duyuru", icon: <Bell size={18} /> },
  { id: "notifications", label: "Bildirimler", icon: <Inbox size={18} /> },
  { id: "profile", label: "Profil", icon: <UserCircle size={18} /> }
] as const;

export type PrincipalTab = (typeof principalTabs)[number]["id"];
