import type { MobileRoleShell } from "@/shared/auth/roleRoutes";

export type TabConfig = {
  name: string;
  title: string;
  icon: keyof typeof TAB_ICONS;
};

export type MoreMenuItem = {
  key: string;
  label: string;
  route: string;
};

/** Expo Router tab `name` must match file name without extension. */
export const TAB_ICONS = {
  home: "home",
  users: "users",
  school: "school",
  "clipboard-check": "clipboard-check",
  "ellipsis-horizontal": "ellipsis-horizontal",
  calendar: "calendar",
  "book-open": "book-open",
  "alert-triangle": "alert-triangle",
  "file-text": "file-text",
  "user-round": "user-round"
} as const;

export const roleTabConfigs: Record<Exclude<MobileRoleShell, "super_admin_blocked">, TabConfig[]> = {
  principal: [
    { name: "index", title: "Genel", icon: "home" },
    { name: "students", title: "Öğrenciler", icon: "users" },
    { name: "classes", title: "Sınıflar", icon: "school" },
    { name: "attendance", title: "Yoklama", icon: "clipboard-check" },
    { name: "more", title: "Daha Fazla", icon: "ellipsis-horizontal" }
  ],
  teacher: [
    { name: "index", title: "Genel", icon: "home" },
    { name: "lessons", title: "Dersler", icon: "calendar" },
    { name: "attendance", title: "Yoklama", icon: "clipboard-check" },
    { name: "observations", title: "Gözlemler", icon: "book-open" },
    { name: "more", title: "Daha Fazla", icon: "ellipsis-horizontal" }
  ],
  guardian: [
    { name: "index", title: "Genel", icon: "home" },
    { name: "child", title: "Öğrencim", icon: "user-round" },
    { name: "schedule", title: "Program", icon: "calendar" },
    { name: "attendance", title: "Devamsızlık", icon: "clipboard-check" },
    { name: "more", title: "Daha Fazla", icon: "ellipsis-horizontal" }
  ],
  guidance: [
    { name: "index", title: "Genel", icon: "home" },
    { name: "students", title: "Öğrenciler", icon: "users" },
    { name: "risks", title: "Riskler", icon: "alert-triangle" },
    { name: "notes", title: "Notlar", icon: "file-text" },
    { name: "more", title: "Daha Fazla", icon: "ellipsis-horizontal" }
  ]
};

const commonMore: Omit<MoreMenuItem, "route">[] = [
  { key: "announcements", label: "Duyurular" },
  { key: "notifications", label: "Bildirimler" },
  { key: "support", label: "Destek" },
  { key: "profile", label: "Profil" }
];

export function getMoreMenuItems(shell: Exclude<MobileRoleShell, "super_admin_blocked">): MoreMenuItem[] {
  const base = `/(app)/${shell}`;
  const items: MoreMenuItem[] = commonMore.map((item) => ({ ...item, route: `${base}/${item.key}` }));
  if (shell === "principal") {
    return [
      { key: "teachers", label: "Öğretmenler", route: `${base}/teachers` },
      { key: "schedule", label: "Program", route: `${base}/schedule` },
      ...items
    ];
  }
  return items;
}
