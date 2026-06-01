import { PageSeo } from "../components/PageSeo";
import { LicensingSection } from "../components/LicensingSection";

export function LicensingPage() {
  return (
    <>
      <PageSeo
        description="OGTA modüler lisanslama modeli ile kurumunuza uygun okul yönetim çözümü. Demo talebi, fiyat teklifi ve iletişim için info@ogtasis.com."
        path="/lisanslama"
        title="Lisanslama | OGTA"
      />
      <main className="site-page licensing-page">
        <LicensingSection />
      </main>
    </>
  );
}
