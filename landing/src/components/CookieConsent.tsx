import { useEffect, useId, useState } from "react";
import { ChevronDown, Cookie, Shield, X } from "lucide-react";
import {
  ALL_ACCEPTED_PREFERENCES,
  COOKIE_CATEGORIES,
  DEFAULT_PREFERENCES,
  hasCookieConsent,
  readCookiePreferences,
  writeCookiePreferences,
  type CookieCategoryId,
  type CookiePreferences
} from "../lib/cookie-consent";
import { CONTACT_EMAIL } from "../lib/constants";
import "./CookieConsent.css";

type DraftPreferences = Omit<CookiePreferences, "version" | "updatedAt" | "necessary"> & {
  necessary: true;
};

function toDraft(preferences: CookiePreferences): DraftPreferences {
  return {
    necessary: true,
    functional: preferences.functional,
    analytics: preferences.analytics,
    marketing: preferences.marketing
  };
}

function fromDraft(draft: DraftPreferences): CookiePreferences {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    necessary: true,
    functional: draft.functional,
    analytics: draft.analytics,
    marketing: draft.marketing
  };
}

function Toggle({
  checked,
  disabled,
  label,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`cookie-toggle${checked ? " is-on" : ""}${disabled ? " is-disabled" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span aria-hidden="true" className="cookie-toggle__thumb" />
    </button>
  );
}

export function CookieConsent() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<CookiePreferences | null>(null);
  const [draft, setDraft] = useState<DraftPreferences>(toDraft(DEFAULT_PREFERENCES));
  const [expanded, setExpanded] = useState<CookieCategoryId | null>(null);

  useEffect(() => {
    const existing = readCookiePreferences();
    if (existing) {
      setSaved(existing);
      setDraft(toDraft(existing));
    }
  }, []);

  function updateDraft(category: CookieCategoryId, value: boolean) {
    if (category === "necessary") return;
    setDraft((current) => ({ ...current, [category]: value }));
  }

  function persist(preferences: CookiePreferences, closePanel = true) {
    writeCookiePreferences(preferences);
    setSaved(preferences);
    setDraft(toDraft(preferences));
    if (closePanel) setOpen(false);
  }

  function handleAcceptAll() {
    persist(ALL_ACCEPTED_PREFERENCES);
  }

  function handleRejectOptional() {
    persist({ ...DEFAULT_PREFERENCES, updatedAt: new Date().toISOString() });
  }

  function handleSaveSelection() {
    persist(fromDraft(draft));
  }

  function toggleExpanded(category: CookieCategoryId) {
    setExpanded((current) => (current === category ? null : category));
  }

  const consentGiven = saved !== null || hasCookieConsent();

  return (
    <div className={`cookie-widget${open ? " is-open" : ""}`}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={open ? "Çerez tercihlerini kapat" : "Çerez tercihlerini aç"}
        className="cookie-widget__trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Cookie aria-hidden="true" size={22} strokeWidth={2.1} />
        {!consentGiven ? <span className="cookie-widget__badge" aria-hidden="true" /> : null}
      </button>

      {open ? (
        <section
          aria-label="Çerez tercih merkezi"
          aria-live="polite"
          className="cookie-widget__panel"
          id={panelId}
          role="dialog"
        >
          <header className="cookie-widget__header">
            <div className="cookie-widget__heading">
              <Shield aria-hidden="true" size={18} />
              <div>
                <h2>Çerez tercih merkezi</h2>
                <p>Gizliliğinizi kontrol edin, tercihlerinizi istediğiniz zaman güncelleyin.</p>
              </div>
            </div>
            <button
              aria-label="Paneli kapat"
              className="cookie-widget__close"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={18} />
            </button>
          </header>

          <div className="cookie-widget__intro">
            <p>
              OGTA, web sitesinin güvenli çalışması ve deneyiminizi iyileştirmek için çerezler ve benzeri
              teknolojiler kullanır. Zorunlu çerezler her zaman aktiftir; diğer kategorileri aşağıdan
              yönetebilirsiniz.
            </p>
            <p className="cookie-widget__legal">
              Kişisel verileriniz 6698 sayılı KVKK kapsamında işlenir. Detaylı bilgi için{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=KVKK%20Ayd%C4%B1nlatma%20Metni`}>aydınlatma metni</a>{" "}
              talep edebilirsiniz.
            </p>
          </div>

          <div className="cookie-widget__categories">
            {COOKIE_CATEGORIES.map((category) => {
              const enabled = category.required || draft[category.id];
              const isExpanded = expanded === category.id;

              return (
                <article className="cookie-category" key={category.id}>
                  <div className="cookie-category__row">
                    <button
                      aria-expanded={isExpanded}
                      className="cookie-category__toggle-details"
                      onClick={() => toggleExpanded(category.id)}
                      type="button"
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={`cookie-category__chevron${isExpanded ? " is-open" : ""}`}
                        size={16}
                      />
                      <span className="cookie-category__title">{category.title}</span>
                      {category.required ? <span className="cookie-category__tag">Zorunlu</span> : null}
                    </button>
                    <Toggle
                      checked={enabled}
                      disabled={category.required}
                      label={`${category.title} ${enabled ? "açık" : "kapalı"}`}
                      onChange={(value) => updateDraft(category.id, value)}
                    />
                  </div>

                  <p className="cookie-category__summary">{category.description}</p>

                  {isExpanded ? (
                    <div className="cookie-category__details">
                      <div className="cookie-category__meta">
                        <span>
                          <strong>Saklama süresi:</strong> {category.retention}
                        </span>
                      </div>
                      <div>
                        <strong>Örnek çerezler:</strong>
                        <ul>
                          {category.examples.map((example) => (
                            <li key={example}>
                              <code>{example}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="cookie-widget__summary">
            <span>
              Seçiminiz:{" "}
              {draft.functional || draft.analytics || draft.marketing
                ? "Zorunlu + seçili isteğe bağlı çerezler"
                : "Yalnızca zorunlu çerezler"}
            </span>
            {saved ? (
              <span className="cookie-widget__saved-at">
                Son güncelleme: {new Date(saved.updatedAt).toLocaleString("tr-TR")}
              </span>
            ) : null}
          </div>

          <div className="cookie-widget__actions">
            <button className="cookie-widget__btn cookie-widget__btn--primary" onClick={handleAcceptAll} type="button">
              Tümünü kabul et
            </button>
            <button className="cookie-widget__btn cookie-widget__btn--ghost" onClick={handleRejectOptional} type="button">
              Yalnızca zorunlular
            </button>
            <button className="cookie-widget__btn cookie-widget__btn--save" onClick={handleSaveSelection} type="button">
              Seçimi kaydet
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
