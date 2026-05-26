import { useEffect, useState } from "react";
import { APP_URL, navLinks } from "../lib/constants";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function scrollTo(href: string) {
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMenuOpen(false);
  }

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`} id="top">
      <div className="container header-inner">
        <a className="brand" href="#top" onClick={(event) => { event.preventDefault(); scrollTo("#top"); }}>
          <img src="/ogta-wordmark.png" alt="OGTA" width={120} height={32} />
        </a>
        <nav className="site-nav" aria-label="Ana menü">
          {navLinks.map((link) => (
            <a
              href={link.href}
              key={link.href}
              onClick={(event) => {
                event.preventDefault();
                scrollTo(link.href);
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <a className="btn btn-ghost" href={APP_URL}>
            Giriş yap
          </a>
          <a
            className="btn btn-primary"
            href="#iletisim"
            onClick={(event) => {
              event.preventDefault();
              scrollTo("#iletisim");
            }}
          >
            Demo talep et
          </a>
        </div>
        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span />
          <span />
        </button>
      </div>
      <div className={`mobile-nav${menuOpen ? " open" : ""}`}>
        {navLinks.map((link) => (
          <a
            href={link.href}
            key={link.href}
            onClick={(event) => {
              event.preventDefault();
              scrollTo(link.href);
            }}
          >
            {link.label}
          </a>
        ))}
        <a className="btn btn-primary" href={APP_URL}>
          Giriş yap
        </a>
      </div>
    </header>
  );
}
