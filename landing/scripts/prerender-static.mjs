/**
 * Build sonrası her SEO rotası için statik HTML üretir.
 * Google ve diğer botlar JS çalıştırmadan içerik + meta görebilir.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const landingRoot = join(__dirname, "..");
const distDir = join(landingRoot, "dist");
const baseUrl = normalizeBaseUrl(process.env.VITE_LANDING_URL || process.env.LANDING_URL || "https://ogtasis.com");
const socialImage = `${baseUrl}/ogta-og-logo-card.png`;

if (!existsSync(join(distDir, "index.html"))) {
  console.error("dist/index.html bulunamadi. Once vite build calistirin.");
  process.exit(1);
}

const template = readFileSync(join(distDir, "index.html"), "utf8");
const solutionPages = extractSolutionPages();
const staticPages = buildStaticPages();

const routes = [
  ...staticPages,
  ...solutionPages.map((page) => ({
    path: page.path,
    title: page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    bodyHtml: renderSolutionBody(page)
  }))
];

let written = 0;
for (const route of routes) {
  const html = injectRoute(template, route);
  const outPath = routePathToFile(route.path);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");
  written += 1;
}

console.log(`prerender-static: ${written} HTML dosyasi yazildi (${baseUrl})`);

function buildStaticPages() {
  const home = extractHomeMeta(template);
  return [
    {
      path: "/",
      title: home.title,
      description: home.description,
      keywords: home.keywords,
      bodyHtml: renderHomeBody()
    },
    {
      path: "/hakkimizda",
      title: "Hakkımızda | OGTA",
      description:
        "OGTA, özel okul ve kolejler için bulut tabanlı okul yönetim platformudur. Eğitim kurumlarının operasyon yükünü azaltmak için tasarlandı.",
      keywords: home.keywords,
      bodyHtml: renderSimpleBody("Hakkımızda", "OGTA okul yazılımı ve okul yönetim platformu hakkında bilgi.")
    },
    {
      path: "/lisanslama",
      title: "Lisanslama | OGTA",
      description:
        "OGTA modüler lisanslama modeli ile kurumunuza uygun okul yönetim çözümü. Demo talebi ve fiyat teklifi için iletişime geçin.",
      keywords: home.keywords,
      bodyHtml: renderSimpleBody("Lisanslama", "Starter, Core ve Premium okul yazılımı paketleri.")
    },
    {
      path: "/sss",
      title: "Sık Sorulan Sorular | OGTA",
      description: "OGTA hakkında sık sorulan sorular: modüller, OGTA.ai, lisanslama, KVKK, kurulum ve destek.",
      keywords: home.keywords,
      bodyHtml: renderSimpleBody("Sık Sorulan Sorular", "Okul yazılımı, okul takip ve okul yönetim hakkında SSS.")
    },
    {
      path: "/iletisim",
      title: "İletişim | OGTA",
      description: "OGTA demo talebi ve kurumsal teklif için info@ogtasis.com üzerinden bizimle iletişime geçin.",
      keywords: home.keywords,
      bodyHtml: renderSimpleBody("İletişim", "Demo ve teklif için iletişim formu.")
    },
    {
      path: "/cozumler",
      title: "Okul Yazılımı Çözümleri | OGTA — Yönetim, Takip ve Modüller",
      description:
        "OGTA okul yazılımı çözümleri: okul yönetim sistemi, öğrenci takip, okul takip, yoklama, ders programı, rehberlik ve veli paneli.",
      keywords: home.keywords,
      bodyHtml: renderHubBody(solutionPages)
    }
  ];
}

function extractHomeMeta(html) {
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "OGTA";
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  const keywords = html.match(/<meta name="keywords" content="([^"]*)"/)?.[1] ?? "";
  return { title, description, keywords };
}

function extractSolutionPages() {
  const sourceText = readFileSync(join(landingRoot, "src/lib/solution-pages.ts"), "utf8");
  const sourceFile = ts.createSourceFile("solution-pages.ts", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let arrayExpression;

  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === "solutionPageDrafts" && node.initializer) {
      const init = unwrap(node.initializer);
      if (ts.isArrayLiteralExpression(init)) arrayExpression = init;
    }
    ts.forEachChild(node, visit);
  });

  if (!arrayExpression) throw new Error("solutionPageDrafts bulunamadi");

  return arrayExpression.elements
    .map(unwrap)
    .filter(ts.isObjectLiteralExpression)
    .map((node) => objectToRecord(node, sourceFile))
    .map((draft) => finalizePage(draft, sourceText));
}

function finalizePage(draft, seoKeywordsSource) {
  const slug = draft.slug;
  const cluster = extractKeywordCluster(seoKeywordsSource, slug);
  const keywords = cluster?.keywords?.join(", ") ?? draft.h1;
  return {
    path: draft.path,
    title: draft.title,
    metaDescription: draft.metaDescription,
    keywords,
    h1: draft.h1,
    lead: draft.lead,
    sections: draft.sections ?? [],
    features: draft.features ?? [],
    faq: draft.faq ?? [],
    highlights: draft.highlights ?? [],
    useCases: draft.useCases ?? [],
    comparisonRows: draft.comparisonRows ?? []
  };
}

function extractKeywordCluster(sourceText, slug) {
  const blockRe = new RegExp(`"${slug}"\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, "m");
  const block = sourceText.match(blockRe)?.[1];
  if (!block) return null;
  const keywordsMatch = block.match(/keywords:\s*\[([\s\S]*?)\]/);
  if (!keywordsMatch) return null;
  const keywords = [...keywordsMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return { keywords };
}

function objectToRecord(node, sourceFile) {
  const record = {};
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name.getText(sourceFile);
    record[name] = readValue(property.initializer, sourceFile);
  }
  return record;
}

function readValue(expression, sourceFile) {
  const value = unwrap(expression);
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  if (ts.isNumericLiteral(value)) return Number(value.text);
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(value)) {
    return value.elements.map(unwrap).map((item) => {
      if (ts.isObjectLiteralExpression(item)) return objectToRecord(item, sourceFile);
      if (ts.isStringLiteral(item) || ts.isNoSubstitutionTemplateLiteral(item)) return item.text;
      return undefined;
    }).filter(Boolean);
  }
  return undefined;
}

function unwrap(expression) {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function injectRoute(template, route) {
  const canonical = absoluteUrl(route.path);
  let html = template;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(route.title)}</title>`);
  html = replaceMetaContent(html, "name", "description", route.description);
  html = replaceMetaContent(html, "name", "keywords", route.keywords);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escapeAttr(canonical)}" />`);
  html = html.replace(/<link rel="alternate" hreflang="tr-TR" href="[^"]*"\s*\/?>/, `<link rel="alternate" hreflang="tr-TR" href="${escapeAttr(canonical)}" />`);
  html = html.replace(/<link rel="alternate" hreflang="x-default" href="[^"]*"\s*\/?>/, `<link rel="alternate" hreflang="x-default" href="${escapeAttr(canonical)}" />`);
  html = replaceMetaContent(html, "property", "og:title", route.title);
  html = replaceMetaContent(html, "property", "og:description", route.description);
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${escapeAttr(canonical)}" />`);
  html = replaceMetaContent(html, "name", "twitter:title", route.title);
  html = replaceMetaContent(html, "name", "twitter:description", route.description);

  const rootContent = `<div id="root" data-prerender="true">${route.bodyHtml}</div>`;
  html = html.replace(/<div id="root"><\/div>(\s*<script)/, `${rootContent}$1`);

  return html;
}

function replaceMetaContent(html, attr, key, content) {
  const singleLine = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`, "g");
  const multiLine = new RegExp(
    `<meta\\s*\\n\\s*${attr}="${key}"\\s*\\n\\s*content="[^"]*"\\s*\\n\\s*/>`,
    "g"
  );
  const replacement = `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`;
  return html.replace(singleLine, replacement).replace(multiLine, replacement);
}

function renderHomeBody() {
  return `
<main class="prerender-shell">
  <h1>OGTA Okul Yazılımı — Okul Yönetim, Öğrenci Takip ve AI Platformu</h1>
  <p>OGTA; okul yönetim sistemi, okul takip sistemi, öğrenci takip, yoklama, ders programı, rehberlik ve veli panelini tek platformda sunar.</p>
  <nav aria-label="Çözüm sayfaları">
    <ul>
      <li><a href="${absoluteUrl("/okul-takip")}">Okul takip</a></li>
      <li><a href="${absoluteUrl("/okul-takip-sistemi")}">Okul takip sistemi</a></li>
      <li><a href="${absoluteUrl("/okul-yonetim")}">Okul yönetim</a></li>
      <li><a href="${absoluteUrl("/okul-yonetim-sistemi")}">Okul yönetim sistemi</a></li>
      <li><a href="${absoluteUrl("/cozumler")}">Tüm çözümler</a></li>
    </ul>
  </nav>
</main>`;
}

function renderSimpleBody(h1, lead) {
  return `<main class="prerender-shell"><h1>${escapeHtml(h1)}</h1><p>${escapeHtml(lead)}</p></main>`;
}

function renderHubBody(pages) {
  const links = pages
    .map((page) => `<li><a href="${absoluteUrl(page.path)}">${escapeHtml(page.h1)}</a> — ${escapeHtml(page.lead.slice(0, 140))}…</li>`)
    .join("");
  return `<main class="prerender-shell"><h1>Okul Yazılımı Çözümleri</h1><p>OGTA modüler okul yazılımı çözümleri.</p><ul>${links}</ul></main>`;
}

function renderSolutionBody(page) {
  const sections = (page.sections ?? [])
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.title)}</h2>${section.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</section>`
    )
    .join("");

  const highlights =
    page.highlights?.length > 0
      ? `<section><h2>Öne çıkan başlıklar</h2><ul>${page.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`
      : "";

  const useCases =
    page.useCases?.length > 0
      ? `<section><h2>Kullanım senaryoları</h2>${page.useCases
          .map((item) => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`)
          .join("")}</section>`
      : "";

  const comparison =
    page.comparisonRows?.length > 0
      ? `<section><h2>OGTA vs geleneksel yöntemler</h2><table><thead><tr><th>Alan</th><th>OGTA</th><th>Geleneksel</th></tr></thead><tbody>${page.comparisonRows
          .map(
            (row) =>
              `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.ogta)}</td><td>${escapeHtml(row.legacy)}</td></tr>`
          )
          .join("")}</tbody></table></section>`
      : "";

  const features = (page.features ?? [])
    .map((feature) => `<article><h3>${escapeHtml(feature.title)}</h3><p>${escapeHtml(feature.text)}</p></article>`)
    .join("");

  const faq = (page.faq ?? [])
    .map((item) => `<div><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></div>`)
    .join("");

  return `
<main class="prerender-shell solution-page">
  <nav><a href="${absoluteUrl("/")}">Anasayfa</a> / <a href="${absoluteUrl("/cozumler")}">Çözümler</a> / ${escapeHtml(page.h1)}</nav>
  <header><h1>${escapeHtml(page.h1)}</h1><p>${escapeHtml(page.lead)}</p></header>
  ${sections}
  ${highlights}
  ${useCases}
  ${comparison}
  <section><h2>Özellikler</h2>${features}</section>
  <section><h2>Sık sorulan sorular</h2>${faq}</section>
  <p><a href="${absoluteUrl("/iletisim")}">Demo isteyin</a></p>
</main>`;
}

function routePathToFile(path) {
  const normalized = path === "/" ? "/index.html" : `${path.replace(/\/+$/, "")}/index.html`;
  return join(distDir, normalized);
}

function normalizeBaseUrl(value) {
  return (value.trim() || "https://ogtasis.com").replace(/\/+$/, "");
}

function absoluteUrl(path) {
  const normalized = path === "/" ? "/" : `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return normalized === "/" ? `${baseUrl}/` : `${baseUrl}${normalized}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
