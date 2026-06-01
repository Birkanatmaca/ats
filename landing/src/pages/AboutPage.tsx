import { PageSeo } from "../components/PageSeo";
import { AboutSection } from "../components/AboutSection";

export function AboutPage() {
  return (
    <>
      <PageSeo
        description="OGTA, özel okul ve kolejler için bulut tabanlı okul yönetim platformudur. Eğitim kurumlarının operasyon yükünü azaltmak ve günlük süreçleri tek merkezden yönetmek için tasarlandı."
        path="/hakkimizda"
        title="Hakkımızda | OGTA"
      />
      <main className="about-page">
        <AboutSection />
      </main>
    </>
  );
}
