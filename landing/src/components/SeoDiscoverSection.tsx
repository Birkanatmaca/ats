import { Link } from "react-router-dom";

const keywordLinks = [
  { href: "/okul-takip", label: "Okul takip" },
  { href: "/okul-takip-sistemi", label: "Okul takip sistemi" },
  { href: "/okul-yonetim", label: "Okul yönetim" },
  { href: "/okul-yonetim-sistemi", label: "Okul yönetim sistemi" },
  { href: "/okul-yazilimi", label: "Okul yazılımı" },
  { href: "/ogrenci-takip-sistemi", label: "Öğrenci takip sistemi" },
  { href: "/yoklama-sistemi", label: "Yoklama sistemi" },
  { href: "/cozumler", label: "Tüm çözümler" }
] as const;

export function SeoDiscoverSection() {
  return (
    <section aria-labelledby="seo-discover-title" className="seo-discover snap-section">
      <div className="container seo-discover__inner">
        <h2 id="seo-discover-title">Okul yazılımı çözümlerimizi keşfedin</h2>
        <p>
          OGTA; okul takip, okul yönetim, öğrenci takip ve yoklama ihtiyaçlarını tek platformda birleştirir. Aradığınız
          modüle doğrudan gidin veya tüm çözümler sayfasından karşılaştırın.
        </p>
        <ul className="seo-discover__grid">
          {keywordLinks.map((item) => (
            <li key={item.href}>
              <Link to={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
