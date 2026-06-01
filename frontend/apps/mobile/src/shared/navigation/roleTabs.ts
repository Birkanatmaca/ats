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
  section: "operations" | "school" | "communication" | "account";
  description?: string;
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

/** Görünür tab bar: sol 2 + ortada ogta.ai + sağ 2 */
export const roleTabConfigs: Record<Exclude<MobileRoleShell, "super_admin_blocked">, TabConfig[]> = {
  principal: [
    { name: "index", title: "Genel", icon: "home" },
    { name: "students", title: "Öğrenciler", icon: "users" },
    { name: "classes", title: "Sınıflar", icon: "school" },
    { name: "more", title: "Daha Fazla", icon: "ellipsis-horizontal" }
  ],
  teacher: [
    { name: "index", title: "Genel", icon: "home" },
    { name: "lessons", title: "Dersler", icon: "calendar" },
    { name: "observations", title: "Gözlemler", icon: "book-open" },
    { name: "more", title: "Daha Fazla", icon: "ellipsis-horizontal" }
  ],
  guardian: [
    { name: "index", title: "Genel", icon: "home" },
    { name: "child", title: "Öğrencim", icon: "user-round" },
    { name: "schedule", title: "Program", icon: "calendar" },
    { name: "more", title: "Daha Fazla", icon: "ellipsis-horizontal" }
  ],
  guidance: [
    { name: "index", title: "Genel", icon: "home" },
    { name: "students", title: "Öğrenciler", icon: "users" },
    { name: "risks", title: "Riskler", icon: "alert-triangle" },
    { name: "more", title: "Daha Fazla", icon: "ellipsis-horizontal" }
  ]
};

/** Tab bar'dan gizlenen ekranlar — Daha Fazla menüsünden erişilir */
export const roleHiddenTabScreens: Record<
  Exclude<MobileRoleShell, "super_admin_blocked">,
  { name: string; title: string }[]
> = {
  principal: [],
  teacher: [{ name: "attendance", title: "Yoklama" }],
  guardian: [{ name: "attendance", title: "Devamsızlık" }],
  guidance: [{ name: "notes", title: "Notlar" }, { name: "observations", title: "Gözlemler" }, { name: "plans", title: "Takip planları" }]
};

const commonMore: Omit<MoreMenuItem, "route">[] = [
  { key: "announcements", label: "Duyurular", section: "communication", description: "Okul duyurularını görüntüle" },
  { key: "notifications", label: "Bildirimler", section: "communication", description: "Son bildirimleriniz" },
  { key: "support", label: "Destek", section: "communication", description: "Yardım ve talep oluştur" },
  { key: "profile", label: "Profil", section: "account", description: "Hesap ve tema ayarları" }
];

export function getMoreMenuItems(shell: Exclude<MobileRoleShell, "super_admin_blocked">): MoreMenuItem[] {
  const base = `/(app)/${shell}`;
  const items: MoreMenuItem[] = commonMore.map((item) => ({ ...item, route: `${base}/${item.key}` }));

  const hiddenItems = roleHiddenTabScreens[shell].map((tab) => ({
    key: tab.name,
    label: tab.title,
    route: `${base}/${tab.name}`,
    section: "operations" as const,
    description:
      tab.name === "attendance"
        ? shell === "guardian"
          ? "Çocuğunuzun devamsızlık özeti"
          : "Günlük yoklama takibi"
        : tab.name === "observations"
          ? "Öğretmen gözlem kayıtları"
          : tab.name === "plans"
            ? "Destek ve takip planları"
            : "Rehberlik notları ve kayıtlar"
  }));

  if (shell === "principal") {
    return [
      {
        key: "attendance",
        label: "Yoklama",
        route: `${base}/attendance`,
        section: "operations" as const,
        description: "Günlük yoklama takibi"
      },
      {
        key: "risks",
        label: "Riskler",
        route: `${base}/risks`,
        section: "operations" as const,
        description: "Öğrenci risk sinyalleri ve gözlemler"
      },
      {
        key: "teachers",
        label: "Öğretmenler",
        route: `${base}/teachers`,
        section: "school",
        description: "Öğretmen kadrosu ve atamalar"
      },
      {
        key: "schedule",
        label: "Program",
        route: `${base}/schedule`,
        section: "school",
        description: "Ders programı ve planlama"
      },
      ...items
    ];
  }

  return [...hiddenItems, ...items];
}

export const moreSectionLabels: Record<MoreMenuItem["section"], string> = {
  operations: "Operasyon",
  school: "Kurum yönetimi",
  communication: "Bildirim & destek",
  account: "Hesap"
};

export const moreSectionOrder: MoreMenuItem["section"][] = ["operations", "school", "communication", "account"];
