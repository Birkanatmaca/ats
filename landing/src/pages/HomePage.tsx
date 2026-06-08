import { useEffect } from "react";
import { Hero } from "../components/Hero";
import { RoleShowcaseSection } from "../components/RoleShowcaseSection";
import { Features } from "../components/Features";
import { OgtaAiSection } from "../components/OgtaAiSection";
import { PageSeo } from "../components/PageSeo";
import { SEO } from "../lib/seo";

export function HomePage() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo(0, 0);

    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return (
    <>
      <PageSeo description={SEO.description} path="/" title={SEO.title} />
      <main>
        <Hero />
        <RoleShowcaseSection />
        <Features />
        <OgtaAiSection />
      </main>
    </>
  );
}
