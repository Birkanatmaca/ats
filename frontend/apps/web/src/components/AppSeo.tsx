import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PANEL_SEO, applyPageSeo } from "../lib/seo";

export function AppSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/login")) {
      applyPageSeo(PANEL_SEO.login);
      return;
    }
    if (pathname.startsWith("/maintenance")) {
      applyPageSeo(PANEL_SEO.maintenance);
      return;
    }
    if (pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) {
      applyPageSeo({
        title: "Şifre İşlemleri | OGTA",
        description: "OGTA hesabınız için güvenli şifre sıfırlama ve kurtarma.",
        robots: "noindex, nofollow"
      });
      return;
    }
    applyPageSeo(PANEL_SEO.app);
  }, [pathname]);

  return null;
}
