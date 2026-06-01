import { APP_URL, CONTACT_EMAIL, LANDING_URL } from "./constants";

export const SEO = {
  siteName: "OGTA",
  legalName: "OGTA Platform",
  title: "OGTA | Okul Yönetim Yazılımı — Yoklama, Ders Programı, Rehberlik & AI",
  description:
    "Özel okul, kolej ve eğitim kurumları için bulut tabanlı okul yönetim yazılımı. Akıllı yoklama, AI destekli ders programı, rehberlik modülü, veli paneli ve ogta.ai komut asistanı — tek platformda.",
  keywords: [
    "okul yönetim yazılımı",
    "okul otomasyon sistemi",
    "yoklama sistemi",
    "ders programı yazılımı",
    "rehberlik modülü",
    "veli bilgilendirme paneli",
    "özel okul yazılımı",
    "kolej yönetim sistemi",
    "ogta.ai",
    "okul yönetim platformu",
    "devamsızlık takibi",
    "eğitim kurumu yazılımı"
  ].join(", "),
  locale: "tr_TR",
  themeColor: "#0891b2",
  twitterHandle: "@ogtaiplatform"
} as const;

export const FAQ_ITEMS = [
  {
    question: "OGTA hangi kurumlar için uygundur?",
    answer:
      "OGTA; özel okul, kolej, kurs merkezi, etüt merkezi ve rehberlik odaklı eğitim kurumları için tasarlanmış çok kiracılı (multi-tenant) bir okul yönetim platformudur."
  },
  {
    question: "ogta.ai nedir, ChatGPT ile aynı mı?",
    answer:
      "ogta.ai, okul operasyonlarına gömülü bir komut asistanıdır. Yoklama, gözlem ve operasyonel işlemleri doğal dille hızlandırır; her kritik aksiyon yetki, kapsam ve onay kontrolünden geçer."
  },
  {
    question: "Fiyatlandırma nasıl çalışır?",
    answer:
      "Starter, Core ve Premium paketlerle öğrenci bazlı yıllık lisans sunuyoruz. Kurum büyüklüğünüze göre şeffaf teklif ve PDF fiyat çıktısı ile kurumsal satın alma sürecine uygun ilerlersiniz."
  },
  {
    question: "Verilerimiz güvende mi?",
    answer:
      "Kurum bazlı tenant izolasyonu, rol tabanlı erişim kontrolü (RBAC) ve hassas işlemler için denetim izi altyapısı ile verileriniz ayrıştırılmış ve izlenebilir şekilde korunur."
  }
] as const;

function absoluteUrl(path: string) {
  const base = LANDING_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO.legalName,
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
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description: SEO.description,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "5",
      highPrice: "15",
      offerCount: "3"
    },
    featureList: [
      "Akıllı yoklama",
      "AI destekli ders programı",
      "Rehberlik ve gözlem modülü",
      "Veli paneli",
      "Müdür dashboard",
      "ogta.ai komut asistanı"
    ]
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO.siteName,
    url: absoluteUrl("/"),
    inLanguage: "tr-TR",
    description: SEO.description
  };
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

export function allStructuredData() {
  return [organizationJsonLd(), softwareApplicationJsonLd(), webSiteJsonLd(), faqJsonLd()];
}

export function seoImageUrl() {
  return absoluteUrl("/ogta-logo.png");
}
