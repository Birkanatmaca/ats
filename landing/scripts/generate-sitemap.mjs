import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = "https://ogtasis.com";

const staticPages = [
  { path: "/", priority: "1.00", changefreq: "weekly" },
  { path: "/cozumler", priority: "0.99", changefreq: "weekly" },
  { path: "/okul-yazilimi", priority: "0.98", changefreq: "weekly" },
  { path: "/okul-yonetim-sistemi", priority: "0.97", changefreq: "weekly" },
  { path: "/ogrenci-takip-sistemi", priority: "0.96", changefreq: "weekly" },
  { path: "/okul-takip-sistemi", priority: "0.95", changefreq: "weekly" },
  { path: "/okul-otomasyon-sistemi", priority: "0.94", changefreq: "weekly" },
  { path: "/ozel-okul-yazilimi", priority: "0.94", changefreq: "weekly" },
  { path: "/egitim-kurumu-yazilimi", priority: "0.93", changefreq: "weekly" },
  { path: "/yoklama-sistemi", priority: "0.93", changefreq: "weekly" },
  { path: "/kolej-yonetim-sistemi", priority: "0.93", changefreq: "weekly" },
  { path: "/devamsizlik-takip-sistemi", priority: "0.92", changefreq: "weekly" },
  { path: "/veli-takip-sistemi", priority: "0.91", changefreq: "weekly" },
  { path: "/ders-programi-yazilimi", priority: "0.90", changefreq: "weekly" },
  { path: "/rehberlik-yazilimi", priority: "0.90", changefreq: "weekly" },
  { path: "/hakkimizda", priority: "0.80", changefreq: "monthly" },
  { path: "/lisanslama", priority: "0.85", changefreq: "monthly" },
  { path: "/sss", priority: "0.80", changefreq: "monthly" },
  { path: "/iletisim", priority: "0.85", changefreq: "monthly" }
];

const body = staticPages
  .map(
    (page) => `  <url>
    <loc>${base}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

writeFileSync(join(__dirname, "../public/sitemap.xml"), xml, "utf8");
console.log("sitemap.xml generated");
