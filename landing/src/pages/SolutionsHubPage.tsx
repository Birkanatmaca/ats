import { Link } from "react-router-dom";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { APP_URL } from "../lib/constants";
import { solutionsHubJsonLd, SEO } from "../lib/seo";
import { solutionPagesByCategory } from "../lib/solution-pages";
import { PageSeo } from "../components/PageSeo";

export function SolutionsHubPage() {
  return (
    <>
      <PageSeo
        description="OGTA okul yazılımı çözümleri: okul yönetim sistemi, öğrenci takip, okul takip, yoklama, ders programı, rehberlik, veli paneli ve eğitim kurumu yazılımı. Tüm modüller tek platformda."
        jsonLd={solutionsHubJsonLd()}
        path="/cozumler"
        title="Okul Yazılımı Çözümleri | OGTA — Yönetim, Takip ve Modüller"
        keywords={SEO.keywords}
      />
      <main className="solution-page solutions-hub">
        <div className="container solution-page__inner">
          <nav aria-label="Breadcrumb" className="solution-breadcrumb">
            <Link to="/">Anasayfa</Link>
            <span aria-hidden="true">/</span>
            <span>Çözümler</span>
          </nav>

          <header className="solution-hero">
            <p className="solution-kicker">OGTA Platform</p>
            <h1>Okul Yazılımı Çözümleri</h1>
            <p className="solution-lead">
              OGTA okul yazılımı; okul yönetim sistemi, öğrenci takip sistemi, okul takip sistemi, yoklama, ders
              programı, rehberlik ve veli paneli modüllerini tek eğitim kurumu yazılımında birleştirir. İhtiyacınıza
              uygun çözümü keşfedin.
            </p>
            <div className="solution-hero__actions">
              <Button variant="default" size="lg" asChild>
                <Link to="/iletisim">Demo isteyin</Link>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <a href={APP_URL}>Panel girişi</a>
              </Button>
            </div>
          </header>

          {solutionPagesByCategory.map((group) =>
            group.pages.length > 0 ? (
              <section aria-labelledby={`hub-${group.category}`} className="solutions-hub__group" key={group.category}>
                <h2 id={`hub-${group.category}`}>{group.label}</h2>
                <ul className="solutions-hub__grid">
                  {group.pages.map((page) => (
                    <li className="seo-solutions__card" key={page.path}>
                      <h3>
                        <Link to={page.path}>{page.h1}</Link>
                      </h3>
                      <p>{page.lead.slice(0, 180)}…</p>
                      <Link className="seo-solutions__more" to={page.path}>
                        Detaylı incele →
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null
          )}

          <section aria-labelledby="hub-keywords" className="solutions-hub__keywords">
            <h2 id="hub-keywords">Aradığınız okul yazılımı terimleri</h2>
            <p className="solution-lead">
              OGTA; okul yazılımı, okul yönetim yazılımı, okul otomasyon sistemi, eğitim kurumu yazılımı, özel okul
              yazılımı, kolej yönetim sistemi, devamsızlık takip sistemi, veli takip sistemi ve yapay zeka destekli
              okul yönetimi arayan kurumlar için geliştirilmiştir.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
