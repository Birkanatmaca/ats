import { Link } from "react-router-dom";
import { ArrowUpRight, Mail } from "lucide-react";
import { APP_URL, CONTACT_EMAIL, navLinks } from "../lib/constants";

export function Footer() {
  const year = new Date().getFullYear();
  const pageLinks = navLinks.filter((link) => link.href !== "/");

  return (
    <footer className="site-footer">
      <div className="container footer-shell">
        <div className="footer-top">
          <div className="footer-brand-block">
            <Link aria-label="OGTA anasayfa" className="footer-logo" to="/">
              <img alt="OGTA" height={30} src="/ogta-wordmark.png" width={108} />
            </Link>
            <p className="footer-brand-text">
              Özel okul ve kolejler için bulut tabanlı okul yönetim yazılımı. Yoklama, ders programı,
              rehberlik ve ogta.ai — tek platformda.
            </p>
          </div>

          <div className="footer-block">
            <h3 className="footer-block__title">Sayfalar</h3>
            <nav aria-label="Site sayfaları" className="footer-nav">
              {pageLinks.map((link) => (
                <Link key={link.href} to={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="footer-block">
            <h3 className="footer-block__title">Çözümler</h3>
            <nav aria-label="SEO çözüm sayfaları" className="footer-nav">
              <Link to="/okul-takip">Okul takip</Link>
              <Link to="/okul-takip-sistemi">Okul takip sistemi</Link>
              <Link to="/okul-yonetim">Okul yönetim</Link>
              <Link to="/okul-yonetim-sistemi">Okul yönetim sistemi</Link>
              <Link to="/cozumler">Tüm çözümler</Link>
            </nav>
          </div>

          <div className="footer-block">
            <h3 className="footer-block__title">Erişim</h3>
            <div className="footer-actions">
              <a className="footer-action footer-action--panel" href={APP_URL}>
                <span>Panel girişi</span>
                <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.2} />
              </a>
              <a className="footer-action footer-action--muted" href={`mailto:${CONTACT_EMAIL}`}>
                <Mail aria-hidden="true" size={16} strokeWidth={2.2} />
                <span>{CONTACT_EMAIL}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">© {year} OGTA Platform. Tüm hakları saklıdır.</p>
          <div className="footer-bottom-links">
            <Link to="/iletisim">İletişim</Link>
            <Link to="/sss">SSS</Link>
            <Link to="/lisanslama">Lisanslama</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
