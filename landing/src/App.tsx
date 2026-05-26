import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { TrustStrip } from "./components/TrustStrip";
import { Features } from "./components/Features";
import { OgtaAiSection } from "./components/OgtaAiSection";
import { Pricing } from "./components/Pricing";
import { FaqSection } from "./components/FaqSection";
import { CtaSection } from "./components/CtaSection";
import { Footer } from "./components/Footer";
import { SeoHead } from "./components/SeoHead";

export function App() {
  return (
    <>
      <SeoHead />
      <div className="page-glow" aria-hidden />
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <Features />
        <OgtaAiSection />
        <Pricing />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
