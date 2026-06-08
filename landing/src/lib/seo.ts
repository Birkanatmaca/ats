import { APP_URL, CONTACT_EMAIL, LANDING_URL } from "./constants";
import { globalKeywordsMeta } from "./seo-keywords";
import type { SolutionPageConfig } from "./solution-pages";
import { solutionPages } from "./solution-pages";

type SitemapChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type SitemapEntry = {
  path: string;
  priority: number;
  changefreq: SitemapChangeFrequency;
};

export const SEO = {
  siteName: "OGTA",
  legalName: "OGTA Platform",
  title: "OGTA | Okul Yazılımı — Okul Yönetim, Öğrenci Takip ve AI Platformu",
  description:
    "OGTA okul yazılımı: okul yönetim sistemi, öğrenci takip, okul takip, yoklama, ders programı, rehberlik ve veli paneli. Özel okul, kolej ve eğitim kurumları için bulut tabanlı okul yönetim yazılımı.",
  keywords: globalKeywordsMeta(),
  locale: "tr_TR",
  themeColor: "#0891b2",
  twitterHandle: "@ogtaiplatform"
} as const;

export const SOCIAL_IMAGE = {
  path: "/ogta-og-logo-card.png",
  alt: "OGTA okul yazılımı ve okul yönetim platformu",
  width: 1200,
  height: 630,
  type: "image/png"
} as const;

export const FAQ_ITEMS = [
  {
    question: "OGTA okul yazılımı nedir?",
    answer:
      "OGTA; yoklama, ders programı, öğrenci takip, okul takip, rehberlik, veli paneli ve ogta.ai komut asistanını tek platformda sunan bulut tabanlı okul yazılımı ve okul yönetim sistemidir."
  },
  {
    question: "Okul yazılımı ile okul yönetim sistemi arasında fark var mı?",
    answer:
      "Okul yazılımı genel terimdir; okul yönetim sistemi idari ve operasyonel modülleri kapsar. OGTA her iki kavramı karşılayan entegre bir eğitim kurumu yazılımı sunar."
  },
  {
    question: "OGTA okul yönetim sistemi hangi kurumlar için uygundur?",
    answer:
      "Özel okul, kolej, kurs merkezi, etüt merkezi ve rehberlik odaklı eğitim kurumları için tasarlanmış çok kiracılı (multi-tenant) bir okul yönetim platformudur."
  },
  {
    question: "Öğrenci takip sistemi neleri kapsar?",
    answer:
      "Devamsızlık ve yoklama takibi, öğretmen gözlemleri, rehberlik notları, risk sinyalleri ve veli bilgilendirme süreçleri tek öğrenci takip sisteminde birleşir."
  },
  {
    question: "Okul takip sistemi ne işe yarar?",
    answer:
      "Kurum operasyonlarını, devamsızlık trendlerini, yoklama tamamlama durumunu ve sınıf metriklerini gerçek zamanlı izlemenizi sağlar."
  },
  {
    question: "Veli takip sistemi var mı?",
    answer:
      "Evet. Veliler devamsızlık, ders programı ve kurum duyurularını mobil uyumlu veli panelinden takip eder."
  },
  {
    question: "ogta.ai nedir?",
    answer:
      "Okul operasyonlarına gömülü komut asistanıdır. Yoklama, gözlem ve operasyonel işlemleri doğal dille hızlandırır; kritik aksiyonlar yetki ve onay kontrolünden geçer."
  },
  {
    question: "Okul yazılımı fiyatlandırması nasıl?",
    answer:
      "Starter, Core ve Premium paketlerle öğrenci bazlı yıllık lisans sunulur. Demo ve teklif için iletişim formunu kullanabilirsiniz."
  },
  {
    question: "Verilerimiz güvende mi?",
    answer:
      "Tenant izolasyonu, rol tabanlı erişim (RBAC) ve denetim izi ile KVKK odaklı veri koruma sağlanır."
  }
] as const;

export const STATIC_SITEMAP_PATHS: SitemapEntry[] = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/cozumler", priority: 0.99, changefreq: "weekly" },
  { path: "/hakkimizda", priority: 0.8, changefreq: "monthly" },
  { path: "/lisanslama", priority: 0.85, changefreq: "monthly" },
  { path: "/sss", priority: 0.8, changefreq: "monthly" },
  { path: "/iletisim", priority: 0.85, changefreq: "monthly" }
];

type JsonLdNode = Record<string, unknown>;

function isRecord(value: unknown): value is JsonLdNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenStructuredData(input: unknown): JsonLdNode[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap(flattenStructuredData);
  if (isRecord(input) && Array.isArray(input["@graph"])) return flattenStructuredData(input["@graph"]);
  return isRecord(input) ? [input] : [];
}

function stripJsonLdContext(node: JsonLdNode): JsonLdNode {
  const rest = { ...node };
  delete rest["@context"];
  return rest;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function siteBaseUrl(baseUrl = LANDING_URL) {
  const trimmed = baseUrl.trim() || "https://ogtasis.com";
  return trimmed.replace(/\/+$/, "");
}

export function canonicalPath(path = "/") {
  const withoutLeadingSlash = path.trim().replace(/^\/+/, "");
  const normalized = `/${withoutLeadingSlash}`.replace(/\/{2,}/g, "/");
  return normalized === "/" ? "/" : normalized.replace(/\/+$/, "");
}

export function absoluteUrl(path = "/", baseUrl = LANDING_URL) {
  const base = siteBaseUrl(baseUrl);
  const normalized = canonicalPath(path);
  return normalized === "/" ? `${base}/` : `${base}${normalized}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO.legalName,
    alternateName: [
      "OGTA",
      "OGTA Okul Yazılımı",
      "OGTA Okul Yönetim Sistemi",
      "OGTA Öğrenci Takip Sistemi",
      "OGTA Okul Takip Sistemi"
    ],
    url: absoluteUrl("/"),
    logo: absoluteUrl("/ogta-logo.png"),
    email: CONTACT_EMAIL,
    contactPoint: {
      "@type": "ContactPoint",
      email: CONTACT_EMAIL,
      contactType: "sales",
      availableLanguage: ["tr-TR"]
    },
    sameAs: [APP_URL.replace(/\/$/, "")]
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SEO.siteName,
    alternateName: [
      "OGTA Okul Yazılımı",
      "OGTA Okul Yönetim Sistemi",
      "OGTA Okul Yönetim Yazılımı",
      "OGTA Okul Takip Sistemi",
      "OGTA Öğrenci Takip Sistemi",
      "OGTA Okul Sistemi",
      "OGTA Eğitim Kurumu Yazılımı",
      "OGTA Yoklama Sistemi"
    ],
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "School Management Software",
    operatingSystem: "Web, iOS, Android",
    url: absoluteUrl("/"),
    description: SEO.description,
    inLanguage: "tr-TR",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "5",
      highPrice: "15",
      offerCount: "3"
    },
    featureList: [
      "Okul yazılımı",
      "Okul yönetim sistemi",
      "Öğrenci takip sistemi",
      "Okul takip sistemi",
      "Devamsızlık takip sistemi",
      "Veli takip sistemi",
      "Yoklama sistemi",
      "Ders programı yazılımı",
      "Rehberlik yazılımı",
      "ogta.ai komut asistanı"
    ]
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO.siteName,
    alternateName: ["OGTA Okul Yazılımı", "OGTA Okul Yönetim Platformu"],
    url: absoluteUrl("/"),
    inLanguage: "tr-TR",
    description: SEO.description,
    publisher: {
      "@type": "Organization",
      name: SEO.legalName,
      logo: absoluteUrl("/ogta-logo.png")
    }
  };
}

export function faqJsonLd(items: ReadonlyArray<{ question: string; answer: string }> = FAQ_ITEMS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

export function solutionsHubJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "OGTA Okul Yazılımı Çözümleri",
    description:
      "Okul yazılımı, okul yönetim sistemi, öğrenci takip, okul takip, yoklama, rehberlik ve veli paneli çözümleri.",
    url: absoluteUrl("/cozumler"),
    inLanguage: "tr-TR",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: solutionPages.map((page, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: page.h1,
        url: absoluteUrl(page.path)
      }))
    }
  };
}

export function solutionPageJsonLd(config: SolutionPageConfig) {
  const pageUrl = absoluteUrl(config.path);
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: config.title,
      description: config.metaDescription,
      url: pageUrl,
      inLanguage: "tr-TR",
      isPartOf: {
        "@type": "WebSite",
        name: SEO.siteName,
        url: absoluteUrl("/")
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: seoImageUrl(),
        width: SOCIAL_IMAGE.width,
        height: SOCIAL_IMAGE.height
      },
      about: {
        "@type": "SoftwareApplication",
        name: "OGTA",
        applicationCategory: "School Management Software"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Anasayfa", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Çözümler", item: absoluteUrl("/cozumler") },
        { "@type": "ListItem", position: 3, name: config.h1, item: pageUrl }
      ]
    },
    faqJsonLd(config.faq)
  ];
}

export function structuredDataGraph(items: unknown | unknown[] = []) {
  return {
    "@context": "https://schema.org",
    "@graph": flattenStructuredData(items).map(stripJsonLdContext)
  };
}

export function allStructuredData(extra: unknown | unknown[] = []) {
  return structuredDataGraph([organizationJsonLd(), softwareApplicationJsonLd(), webSiteJsonLd(), extra]);
}

export function seoImageUrl() {
  return absoluteUrl(SOCIAL_IMAGE.path);
}

export function sitemapEntries(): SitemapEntry[] {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [
    ...STATIC_SITEMAP_PATHS,
    ...solutionPages.map((page) => ({
      path: page.path,
      priority: page.sitemapPriority,
      changefreq: "weekly" as const
    }))
  ];

  return entries
    .map((entry) => ({
      ...entry,
      path: canonicalPath(entry.path)
    }))
    .filter((entry) => {
      if (seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    })
    .sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path, "tr"));
}

export function buildSitemapXml({
  baseUrl = LANDING_URL,
  lastmod = new Date().toISOString().slice(0, 10)
}: { baseUrl?: string; lastmod?: string } = {}) {
  const urls = sitemapEntries().map((entry) => ({
    loc: absoluteUrl(entry.path, baseUrl),
    priority: entry.priority,
    changefreq: entry.changefreq
  }));

  const body = urls
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(2)}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}
