import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");
const base = normalizeBaseUrl(process.env.VITE_LANDING_URL || process.env.LANDING_URL || "https://ogtasis.com");
const lastmod = process.env.SITEMAP_LASTMOD || new Date().toISOString().slice(0, 10);

const staticPages = extractObjectArray(join(__dirname, "../src/lib/seo.ts"), "STATIC_SITEMAP_PATHS").map((page) => ({
  path: requireString(page, "path", "STATIC_SITEMAP_PATHS"),
  priority: requireNumber(page, "priority", "STATIC_SITEMAP_PATHS"),
  changefreq: requireString(page, "changefreq", "STATIC_SITEMAP_PATHS")
}));

const solutionPages = extractObjectArray(join(__dirname, "../src/lib/solution-pages.ts"), "solutionPageDrafts").map((page) => ({
  path: requireString(page, "path", "solutionPageDrafts"),
  priority: requireNumber(page, "sitemapPriority", "solutionPageDrafts"),
  changefreq: "weekly"
}));

const pages = uniqueByPath([...staticPages, ...solutionPages])
  .map((page) => ({ ...page, path: normalizePath(page.path) }))
  .sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path, "tr"));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(sitemapUrl).join("\n")}
</urlset>
`;

const robots = ["User-agent: *", "Allow: /", "", `Sitemap: ${absoluteUrl("/sitemap.xml")}`, ""].join("\r\n");

writeFileSync(join(publicDir, "sitemap.xml"), xml, "utf8");
writeFileSync(join(publicDir, "robots.txt"), robots, "utf8");

console.log(`sitemap.xml generated: ${pages.length} URLs, lastmod ${lastmod}`);
console.log(`robots.txt generated: ${absoluteUrl("/sitemap.xml")}`);

function sitemapUrl(page) {
  return `  <url>
    <loc>${escapeXml(absoluteUrl(page.path))}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${escapeXml(page.changefreq)}</changefreq>
    <priority>${page.priority.toFixed(2)}</priority>
  </url>`;
}

function extractObjectArray(filePath, variableName) {
  const sourceText = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let arrayExpression;

  ts.forEachChild(sourceFile, function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === variableName && node.initializer) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isArrayLiteralExpression(initializer)) {
        arrayExpression = initializer;
      }
    }
    ts.forEachChild(node, visit);
  });

  if (!arrayExpression) {
    throw new Error(`Could not find array variable "${variableName}" in ${filePath}`);
  }

  return arrayExpression.elements
    .map(unwrapExpression)
    .filter(ts.isObjectLiteralExpression)
    .map(objectLiteralToRecord);
}

function objectLiteralToRecord(node) {
  const record = {};

  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = propertyNameText(property.name);
    if (!name) continue;
    const value = literalValue(property.initializer);
    if (value !== undefined) {
      record[name] = value;
    }
  }

  return record;
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function literalValue(expression) {
  const value = unwrapExpression(expression);

  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  if (ts.isNumericLiteral(value)) return Number(value.text);
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isPrefixUnaryExpression(value) && ts.isNumericLiteral(value.operand)) {
    const numberValue = Number(value.operand.text);
    return value.operator === ts.SyntaxKind.MinusToken ? -numberValue : numberValue;
  }

  return undefined;
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function requireString(record, key, context) {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${context}.${key} must be a non-empty string`);
  }
  return value;
}

function requireNumber(record, key, context) {
  const value = record[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${context}.${key} must be a number`);
  }
  return value;
}

function uniqueByPath(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const path = normalizePath(entry.path);
    if (seen.has(path)) {
      throw new Error(`Duplicate sitemap path: ${path}`);
    }
    seen.add(path);
    return true;
  });
}

function normalizeBaseUrl(value) {
  const trimmed = value.trim() || "https://ogtasis.com";
  return trimmed.replace(/\/+$/, "");
}

function normalizePath(value) {
  const withoutLeadingSlash = value.trim().replace(/^\/+/, "");
  const normalized = `/${withoutLeadingSlash}`.replace(/\/{2,}/g, "/");
  return normalized === "/" ? "/" : normalized.replace(/\/+$/, "");
}

function absoluteUrl(path) {
  const normalized = normalizePath(path);
  return normalized === "/" ? `${base}/` : `${base}${normalized}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
