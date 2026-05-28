import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { CookieConsent } from "../components/CookieConsent";
import { SectionScrollController } from "../components/SectionScrollController";

export function SiteLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  useEffect(() => {
    if (!isHome) return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo(0, 0);

    if (window.location.hash) {
      window.history.replaceState(null, "", pathname);
    }
  }, [isHome, pathname]);

  return (
    <>
      {pathname !== "/" ? <ScrollRestoration /> : null}
      {isHome ? <SectionScrollController /> : null}
      <Header />
      <Outlet />
      <Footer />
      <CookieConsent />
    </>
  );
}
