import { APP_URL, CONTACT_EMAIL } from "../lib/constants";

export function CtaSection() {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("OGTA Demo Talebi")}`;

  return (
    <section className="section section-cta" id="iletisim">
      <div className="container cta-card">
        <div className="cta-copy">
          <p className="eyebrow">Başlayın</p>
          <h2>Kurumunuz için OGTA demo planlayın</h2>
          <p>Öğrenci sayınız, paket tercihiniz ve ihtiyaçlarınıza göre size özel fiyat teklifi hazırlayalım.</p>
        </div>
        <div className="cta-actions">
          <a className="btn btn-primary btn-lg" href={mailto}>
            {CONTACT_EMAIL}
          </a>
          <a className="btn btn-ghost btn-lg" href={APP_URL}>
            Platforma giriş
          </a>
        </div>
      </div>
    </section>
  );
}
