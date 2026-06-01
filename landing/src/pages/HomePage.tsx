import { useEffect } from "react";
import { SeoHead } from "../components/SeoHead";
import { Hero } from "../components/Hero";
import { RoleShowcaseSection } from "../components/RoleShowcaseSection";
import { Features } from "../components/Features";
import { OgtaAiSection } from "../components/OgtaAiSection";

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
      <SeoHead />
      <main>
        <Hero />
        <RoleShowcaseSection />
        <Features />
        <OgtaAiSection />
      </main>
    </>
  );
}
