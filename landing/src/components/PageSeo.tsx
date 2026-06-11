import { useEffect } from "react";
import { SEO, SOCIAL_IMAGE, absoluteUrl, allStructuredData, faqJsonLd, seoImageUrl } from "../lib/seo";

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

function upsertLink(rel: string, href: string, attrs: Record<string, string> = {}) {
  if (!href) return;
  const attrSelector = Object.entries(attrs)
    .map(([key, value]) => `[${key}="${value}"]`)
    .join("");
  let el = document.head.querySelector(`link[rel="${rel}"]${attrSelector}`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el?.setAttribute(key, value));
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
    const canonical = absoluteUrl(path);
    const image = seoImageUrl();
    const structuredData = allStructuredData([includeFaqSchema ? faqJsonLd() : undefined, jsonLd]);

    document.title = title;
    document.documentElement.lang = "tr";

    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", keywords ?? SEO.keywords);
    upsertMeta("name", "author", SEO.legalName);
    upsertMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    upsertMeta("name", "theme-color", SEO.themeColor);
    upsertMeta("name", "application-name", SEO.siteName);
    upsertMeta("name", "publisher", SEO.legalName);

    upsertLink("canonical", canonical);
    upsertLink("alternate", canonical, { hreflang: "tr-TR" });
    upsertLink("alternate", canonical, { hreflang: "x-default" });

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SEO.siteName);
    upsertMeta("property", "og:locale", SEO.locale);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:secure_url", image);
    upsertMeta("property", "og:image:type", SOCIAL_IMAGE.type);
    upsertMeta("property", "og:image:width", String(SOCIAL_IMAGE.width));
    upsertMeta("property", "og:image:height", String(SOCIAL_IMAGE.height));
    upsertMeta("property", "og:image:alt", SOCIAL_IMAGE.alt);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:site", SEO.twitterHandle);
    upsertMeta("name", "twitter:creator", SEO.twitterHandle);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);
    upsertMeta("name", "twitter:image:alt", SOCIAL_IMAGE.alt);

    upsertJsonLd("ogta-seo-jsonld", structuredData);
  }, [title, description, path, includeFaqSchema, keywords, jsonLd]);

  return null;
}
