import { APP_URL, CONTACT_EMAIL, LANDING_URL } from "./constants";
import { globalKeywordsMeta } from "./seo-keywords";
import type { SolutionPageConfig } from "./solution-pages";
import { solutionPages } from "./solution-pages";

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

export const STATIC_SITEMAP_PATHS = [
  { path: "/", priority: 1.0, changefreq: "weekly" as const },
  { path: "/cozumler", priority: 0.99, changefreq: "weekly" as const },
  { path: "/hakkimizda", priority: 0.8, changefreq: "monthly" as const },
  { path: "/lisanslama", priority: 0.85, changefreq: "monthly" as const },
  { path: "/sss", priority: 0.8, changefreq: "monthly" as const },
  { path: "/iletisim", priority: 0.85, changefreq: "monthly" as const }
];

function absoluteUrl(path: string) {
  const base = LANDING_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
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

export function allStructuredData() {
  return [organizationJsonLd(), softwareApplicationJsonLd(), webSiteJsonLd(), faqJsonLd()];
}

export function seoImageUrl() {
  return absoluteUrl("/ogta-logo.png");
}

export function buildSitemapXml() {
  const base = LANDING_URL.replace(/\/$/, "");
  const urls = [
    ...STATIC_SITEMAP_PATHS.map((entry) => ({
      loc: `${base}${entry.path}`,
      priority: entry.priority,
      changefreq: entry.changefreq
    })),
    ...solutionPages.map((page) => ({
      loc: `${base}${page.path}`,
      priority: page.sitemapPriority,
      changefreq: "weekly" as const
    }))
  ];

  const body = urls
    .map(
      (url) => `  <url>
    <loc>${url.loc}</loc>
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
