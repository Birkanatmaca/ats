import { BarChart3, Bell, BookOpenCheck, Bus, CalendarDays, CircleDollarSign, ClipboardCheck, FolderOpen, HeartHandshake, Inbox, LayoutDashboard, ListChecks, School, Soup, UserCircle, UserRound, UsersRound } from "lucide-react";

export const principalTabs = [
  { id: "overview", label: "Genel", icon: <LayoutDashboard size={18} />, group: "Özet" },
  { id: "reports", label: "Raporlar", icon: <BarChart3 size={18} />, group: "Özet" },
  { id: "teachers", label: "Öğretmenler", icon: <UserRound size={18} />, group: "Okul" },
  { id: "students", label: "Öğrenciler", icon: <UsersRound size={18} />, group: "Okul" },
  { id: "guardians", label: "Veliler", icon: <HeartHandshake size={18} />, group: "Okul" },
  { id: "classes", label: "Sınıflar", icon: <School size={18} />, group: "Okul" },
  { id: "academic", label: "Akademik", icon: <BookOpenCheck size={18} />, group: "Akademik" },
  { id: "attendance", label: "Yoklama", icon: <ClipboardCheck size={18} />, group: "Akademik" },
  { id: "schedule", label: "Program", icon: <CalendarDays size={18} />, group: "Akademik" },
  { id: "billing", label: "Tahsilat", icon: <CircleDollarSign size={18} />, group: "Operasyon" },
  { id: "life", label: "Okul Yaşamı", icon: <Soup size={18} />, group: "Operasyon" },
  { id: "services", label: "Servis Şoförleri", icon: <Bus size={18} />, group: "Operasyon" },
  { id: "operations", label: "Operasyon", icon: <ListChecks size={18} />, group: "Operasyon" },
  { id: "guidance-cases", label: "Rehberlik vakaları", icon: <FolderOpen size={18} />, group: "Operasyon" },
  { id: "announcements", label: "Duyuru", icon: <Bell size={18} />, group: "İletişim" },
  { id: "notifications", label: "Bildirimler", icon: <Inbox size={18} />, group: "İletişim" },
  { id: "profile", label: "Profil", icon: <UserCircle size={18} />, group: "İletişim" }
] as const;

export type PrincipalTab = (typeof principalTabs)[number]["id"];
