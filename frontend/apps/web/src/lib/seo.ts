export type PageSeoConfig = {
  title: string;
  description?: string;
  robots?: string;
  noindex?: boolean;
};

export const PANEL_SEO = {
  login: {
    title: "Giriş | OGTA Okul Yönetim Paneli",
    description:
      "Müdür, öğretmen, rehberlik, veli ve sistem yöneticisi panellerine güvenli giriş. OGTA okul yönetim platformu.",
    robots: "noindex, nofollow"
  },
  app: {
    title: "OGTA Panel",
    description: "OGTA okul yönetim paneli — yetkili kullanıcı oturumu.",
    robots: "noindex, nofollow"
  },
  maintenance: {
    title: "Bakım Modu | OGTA",
    description: "OGTA platformu geçici bakım çalışması nedeniyle kısa süreliğine kullanılamıyor.",
    robots: "noindex, nofollow"
  }
} as const;

export function applyPageSeo(config: PageSeoConfig) {
  document.title = config.title;

  const description = config.description ?? "";
  let descEl = document.head.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!descEl) {
    descEl = document.createElement("meta");
    descEl.name = "description";
    document.head.appendChild(descEl);
  }
  descEl.content = description;

  const robots = config.robots ?? (config.noindex ? "noindex, nofollow" : "index, follow");
  let robotsEl = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!robotsEl) {
    robotsEl = document.createElement("meta");
    robotsEl.name = "robots";
    document.head.appendChild(robotsEl);
  }
  robotsEl.content = robots;
}
