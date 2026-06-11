import type { MobileRoleShell } from "@/shared/auth/roleRoutes";

export type TabbedRoleShell = Exclude<MobileRoleShell, "driver" | "super_admin_blocked">;

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
export const roleTabConfigs: Record<TabbedRoleShell, TabConfig[]> = {
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
  TabbedRoleShell,
  { name: string; title: string }[]
> = {
  principal: [],
  teacher: [{ name: "attendance", title: "Yoklama" }],
  guardian: [
    { name: "attendance", title: "Devamsızlık" },
    { name: "service", title: "Servis" },
    { name: "billing", title: "Tahsilat" },
    { name: "academic", title: "Akademik" },
  ],
  guidance: [{ name: "notes", title: "Notlar" }, { name: "observations", title: "Gözlemler" }, { name: "plans", title: "Takip planları" }]
};

const commonMore: Omit<MoreMenuItem, "route">[] = [
  { key: "announcements", label: "Duyurular", section: "communication", description: "Okul duyurularını görüntüle" },
  { key: "notifications", label: "Bildirimler", section: "communication", description: "Son bildirimleriniz" },
  { key: "support", label: "Destek", section: "communication", description: "Yardım ve talep oluştur" },
  { key: "profile", label: "Profil", section: "account", description: "Hesap ve tema ayarları" }
];

export function isTabbedRoleShell(shell: MobileRoleShell | null | undefined): shell is TabbedRoleShell {
  return shell === "principal" || shell === "teacher" || shell === "guardian" || shell === "guidance";
}

export function getMoreMenuItems(shell: TabbedRoleShell): MoreMenuItem[] {
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
        : tab.name === "service"
          ? "Servis ataması ve canlı durum"
          : tab.name === "billing"
            ? "Ödeme planı ve gecikmiş taksitler"
            : tab.name === "academic"
              ? "Akademik rapor ve destek sinyalleri"
              : tab.name === "observations"
                ? "Öğretmen gözlem kayıtları"
                : tab.name === "plans"
                  ? "Destek ve takip planları"
                  : "Rehberlik notları ve kayıtlar"
  }));

  if (shell === "principal") {
    return [
      {
        key: "life",
        label: "Okul yaşamı",
        route: `${base}/life`,
        section: "operations" as const,
        description: "Yemek, etüt ve kulüp yönetimi"
      },
      {
        key: "services",
        label: "Servis",
        route: `${base}/services`,
        section: "operations" as const,
        description: "Servis rota, araç ve öğrenci atamaları"
      },
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
      {
        key: "student-imports",
        label: "Öğrenci import",
        route: `${base}/student-imports`,
        section: "school",
        description: "Toplu öğrenci aktarım geçmişi"
      },
      ...items
    ];
  }

  if (shell === "teacher") {
    return [
      ...hiddenItems,
      {
        key: "life",
        label: "Etüt & kulüp",
        route: `${base}/life`,
        section: "operations" as const,
        description: "Etüt katılımı ve danışman kulüpleri"
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
