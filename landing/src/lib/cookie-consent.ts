export const COOKIE_STORAGE_KEY = "ogta-cookie-preferences";
export const LEGACY_COOKIE_KEY = "ogta-cookie-consent";

export type CookieCategoryId = "necessary" | "functional" | "analytics" | "marketing";

export type CookiePreferences = {
  version: 1;
  updatedAt: string;
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type CookieCategory = {
  id: CookieCategoryId;
  title: string;
  description: string;
  required: boolean;
  examples: string[];
  retention: string;
};

export const COOKIE_CATEGORIES: CookieCategory[] = [
  {
    id: "necessary",
    title: "Zorunlu çerezler",
    description:
      "Sitenin güvenli çalışması, oturum yönetimi ve çerez tercihlerinizin hatırlanması için gereklidir. Bu çerezler devre dışı bırakılamaz.",
    required: true,
    examples: ["ogta_session", "ogta-cookie-preferences", "csrf_token"],
    retention: "Oturum süresi veya en fazla 12 ay"
  },
  {
    id: "functional",
    title: "İşlevsel çerezler",
    description:
      "Dil tercihi, arayüz ayarları ve formlarda girdi hatırlama gibi gelişmiş site işlevlerini sağlar.",
    required: false,
    examples: ["ogta_ui_theme", "ogta_form_draft", "ogta_locale"],
    retention: "En fazla 6 ay"
  },
  {
    id: "analytics",
    title: "Analitik çerezler",
    description:
      "Ziyaretçi trafiği, sayfa performansı ve kullanım istatistiklerini anonim veya pseudonim biçimde ölçmemize yardımcı olur.",
    required: false,
    examples: ["_ogta_analytics", "_ogta_visit_id", "performance_metrics"],
    retention: "En fazla 13 ay"
  },
  {
    id: "marketing",
    title: "Pazarlama çerezleri",
    description:
      "İlgi alanlarınıza uygun içerik sunmak, kampanya etkinliğini ölçmek ve reklam performansını iyileştirmek için kullanılır.",
    required: false,
    examples: ["_ogta_campaign", "_ogta_referral", "ad_attribution"],
    retention: "En fazla 12 ay"
  }
];

export const DEFAULT_PREFERENCES: CookiePreferences = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false
};

export const ALL_ACCEPTED_PREFERENCES: CookiePreferences = {
  version: 1,
  updatedAt: new Date().toISOString(),
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true
};

function parsePreferences(raw: string | null): CookiePreferences | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
    if (parsed.version !== 1 || parsed.necessary !== true) return null;

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      necessary: true,
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing)
    };
  } catch {
    return null;
  }
}

function readLegacyConsent(): CookiePreferences | null {
  try {
    const legacy = localStorage.getItem(LEGACY_COOKIE_KEY);
    if (legacy === "accepted") {
      return { ...ALL_ACCEPTED_PREFERENCES, updatedAt: new Date().toISOString() };
    }
    if (legacy === "rejected") {
      return { ...DEFAULT_PREFERENCES, updatedAt: new Date().toISOString() };
    }
  } catch {
    /* noop */
  }
  return null;
}

export function readCookiePreferences(): CookiePreferences | null {
  try {
    const current = parsePreferences(localStorage.getItem(COOKIE_STORAGE_KEY));
    if (current) return current;

    const legacy = readLegacyConsent();
    if (legacy) {
      writeCookiePreferences(legacy);
      localStorage.removeItem(LEGACY_COOKIE_KEY);
      return legacy;
    }
  } catch {
    /* noop */
  }
  return null;
}

export function writeCookiePreferences(preferences: CookiePreferences) {
  const payload: CookiePreferences = {
    ...preferences,
    version: 1,
    necessary: true,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("ogta:cookie-preferences", { detail: payload }));
  } catch {
    /* noop */
  }
}

export function hasCookieConsent(): boolean {
  return readCookiePreferences() !== null;
}

export function isCategoryEnabled(preferences: CookiePreferences, category: CookieCategoryId): boolean {
  if (category === "necessary") return true;
  return preferences[category];
}
