import { PageSeo } from "../components/PageSeo";
import { FaqSection } from "../components/FaqSection";

export function FaqPage() {
  return (
    <>
      <PageSeo
        description="OGTA hakkında sık sorulan sorular: modüller, OGTA.ai, modüler lisanslama, KVKK, kurulum ve destek."
        includeFaqSchema
        path="/sss"
        title="Sık Sorulan Sorular | OGTA"
      />
      <main className="site-page faq-page">
        <FaqSection />
      </main>
    </>
  );
}
