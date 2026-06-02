import { Link } from "react-router-dom";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { APP_URL } from "../lib/constants";
import type { SolutionPageConfig } from "../lib/solution-pages";
import { solutionPageJsonLd } from "../lib/seo";
import { PageSeo } from "./PageSeo";

export function SolutionPageLayout({ config }: { config: SolutionPageConfig }) {
  return (
    <>
      <PageSeo
        description={config.metaDescription}
        jsonLd={solutionPageJsonLd(config)}
        keywords={config.keywords}
        path={config.path}
        title={config.title}
      />
      <main className="solution-page">
        <div className="container solution-page__inner">
          <nav aria-label="Breadcrumb" className="solution-breadcrumb">
            <Link to="/">Anasayfa</Link>
            <span aria-hidden="true">/</span>
            <Link to="/cozumler">Çözümler</Link>
            <span aria-hidden="true">/</span>
            <span>{config.h1}</span>
          </nav>

          <header className="solution-hero">
            <p className="solution-kicker">OGTA Platform</p>
            <h1>{config.h1}</h1>
            <p className="solution-lead">{config.lead}</p>
            <div className="solution-hero__actions">
              <Button variant="default" size="lg" asChild>
                <Link to="/iletisim">Demo isteyin</Link>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <a href={APP_URL}>Panel girişi</a>
              </Button>
            </div>
          </header>

          {config.sections.map((section) => (
            <section className="solution-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </section>
          ))}

          <section aria-labelledby="solution-features" className="solution-features">
            <h2 id="solution-features">Öne çıkan özellikler</h2>
            <ul className="solution-features__grid">
              {config.features.map((feature) => (
                <li className="solution-feature-card" key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="solution-faq" className="solution-faq">
            <h2 id="solution-faq">Sık sorulan sorular</h2>
            <dl className="solution-faq__list">
              {config.faq.map((item) => (
                <div className="solution-faq__item" key={item.question}>
                  <dt>{item.question}</dt>
                  <dd>{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <aside aria-labelledby="solution-related" className="solution-related">
            <h2 id="solution-related">İlgili çözümler</h2>
            <div className="solution-related__links">
              {config.relatedLinks.map((link) => (
                <Link key={link.href} to={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
