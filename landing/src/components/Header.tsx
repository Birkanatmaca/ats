import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { APP_URL, navLinks } from "../lib/constants";
import GooeyNav, { type GooeyNavItem } from "./GooeyNav";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeIndex = Math.max(
    0,
    navLinks.findIndex((link) => link.href === location.pathname)
  );

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

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const gooeyItems = useMemo<GooeyNavItem[]>(
    () => navLinks.map((link) => ({ label: link.label, href: link.href })),
    []
  );

  function navigateTo(href: string) {
    if (href === "/" && location.pathname === "/") {
      window.scrollTo(0, 0);
      window.history.replaceState(null, "", "/");
    } else {
      navigate(href);
    }
    setMenuOpen(false);
  }

  function goHome(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    navigateTo("/");
  }

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`} id="top">
      <div className="container header-inner">
        <a className="brand" href="/" onClick={goHome}>
          <img src="/ogta-wordmark.png" alt="OGTA" width={120} height={32} />
        </a>

        <div className="header-gooey">
          <GooeyNav
            items={gooeyItems}
            initialActiveIndex={activeIndex}
            key={location.pathname}
            particleCount={0}
            onItemClick={(item) => navigateTo(item.href)}
          />
        </div>

        <div className="header-actions">
          <Button variant="gradient" size="default" asChild>
            <a href={APP_URL}>Panel girişi</a>
          </Button>
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
          <Link key={link.href} onClick={() => setMenuOpen(false)} to={link.href}>
            {link.label}
          </Link>
        ))}
        <Button variant="gradient" size="default" asChild>
          <a href={APP_URL}>Panel girişi</a>
        </Button>
      </div>
    </header>
  );
}
