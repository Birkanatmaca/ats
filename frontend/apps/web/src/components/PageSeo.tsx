import { useEffect } from "react";
import { applyPageSeo, type PageSeoConfig } from "../lib/seo";

export function PageSeo(config: PageSeoConfig) {
  useEffect(() => {
    applyPageSeo(config);
  }, [config.title, config.description, config.robots, config.noindex]);

  return null;
}
