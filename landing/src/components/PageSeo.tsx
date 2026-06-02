import { useEffect } from "react";
import { LANDING_URL } from "../lib/constants";
import { SEO, allStructuredData, faqJsonLd, seoImageUrl } from "../lib/seo";

type PageSeoProps = {
  title: string;
  description: string;
  path?: string;
  includeFaqSchema?: boolean;
  keywords?: string;
  jsonLd?: unknown | unknown[];
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function PageSeo({
  title,
  description,
  path = "/",
  includeFaqSchema = false,
  keywords,
  jsonLd
}: PageSeoProps) {
  useEffect(() => {
    const base = LANDING_URL.replace(/\/$/, "");
    const canonical = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const image = seoImageUrl();
    const structuredData = jsonLd ?? (includeFaqSchema ? [...allStructuredData(), faqJsonLd()] : allStructuredData());

    document.title = title;
    document.documentElement.lang = "tr";

    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", keywords ?? SEO.keywords);
    upsertMeta("name", "author", SEO.legalName);
    upsertMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    upsertMeta("name", "theme-color", SEO.themeColor);
    upsertMeta("name", "application-name", SEO.siteName);

    upsertLink("canonical", canonical);
    upsertLink("alternate", canonical);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SEO.siteName);
    upsertMeta("property", "og:locale", SEO.locale);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:alt", "OGTA okul yönetim platformu logosu");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    upsertJsonLd("ogta-seo-jsonld", structuredData);
  }, [title, description, path, includeFaqSchema, keywords, jsonLd]);

  return null;
}
