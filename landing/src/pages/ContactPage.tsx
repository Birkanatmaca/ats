import { PageSeo } from "../components/PageSeo";
import { CtaSection } from "../components/CtaSection";

export function ContactPage() {
  return (
    <>
      <PageSeo
        description="OGTA demo talebi ve kurumsal teklif için info@ogtasis.com üzerinden bizimle iletişime geçin."
        path="/iletisim"
        title="İletişim | OGTA"
      />
      <main className="site-page site-page--contact">
        <CtaSection />
      </main>
    </>
  );
}
