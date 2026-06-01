import { useEffect } from "react";
import { LANDING_URL } from "../lib/constants";
import { SEO, allStructuredData, seoImageUrl } from "../lib/seo";

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

export function SeoHead() {
  useEffect(() => {
    const canonical = LANDING_URL.replace(/\/$/, "/");
    const image = seoImageUrl();

    document.title = SEO.title;
    document.documentElement.lang = "tr";

    upsertMeta("name", "description", SEO.description);
    upsertMeta("name", "keywords", SEO.keywords);
    upsertMeta("name", "author", SEO.legalName);
    upsertMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    upsertMeta("name", "theme-color", SEO.themeColor);
    upsertMeta("name", "application-name", SEO.siteName);

    upsertLink("canonical", canonical);
    upsertLink("alternate", canonical);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SEO.siteName);
    upsertMeta("property", "og:locale", SEO.locale);
    upsertMeta("property", "og:title", SEO.title);
    upsertMeta("property", "og:description", SEO.description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:alt", "OGTA okul yönetim platformu logosu");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", SEO.title);
    upsertMeta("name", "twitter:description", SEO.description);
    upsertMeta("name", "twitter:image", image);

    upsertJsonLd("ogta-seo-jsonld", allStructuredData());
  }, []);

  return null;
}
