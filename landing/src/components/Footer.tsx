import { navLinks } from "../lib/constants";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <img alt="OGTA" height={28} src="/ogta-wordmark.png" width={100} />
          <p>Özel okul, kolej ve eğitim kurumları için bulut tabanlı okul yönetim yazılımı. Yoklama, ders programı, rehberlik ve ogta.ai — tek platformda.</p>
        </div>
        <div className="footer-links">
          {navLinks.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </div>
        <p className="footer-copy">© {year} OGTA Platform. Tüm hakları saklıdır.</p>
      </div>
    </footer>
  );
}
