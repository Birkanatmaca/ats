import { Link } from "react-router-dom";
import { solutionPagesByCategory } from "../lib/solution-pages";

export function SeoSolutionsSection() {
  const featured = solutionPagesByCategory.flatMap((g) => g.pages).slice(0, 6);

  return (
    <section aria-labelledby="seo-solutions-title" className="section section-tint seo-solutions">
      <div className="container">
        <div className="section-head center">
          <h2 id="seo-solutions-title">Okul yazılımı ve takip çözümleri</h2>
          <p className="section-subtitle">
            OGTA okul yazılımı; okul yönetim sistemi, öğrenci takip, okul takip, yoklama, rehberlik ve veli paneli
            ihtiyaçlarını tek platformda karşılar.
          </p>
        </div>
        <ul className="seo-solutions__grid seo-solutions__grid--6">
          {featured.map((page) => (
            <li className="seo-solutions__card" key={page.path}>
              <h3>
                <Link to={page.path}>{page.h1}</Link>
              </h3>
              <p>{page.lead.slice(0, 140)}…</p>
              <Link className="seo-solutions__more" to={page.path}>
                İncele →
              </Link>
            </li>
          ))}
        </ul>
        <p className="seo-solutions__hub-link">
          <Link to="/cozumler">Tüm okul yazılımı çözümlerini görüntüle →</Link>
        </p>
      </div>
    </section>
  );
}
