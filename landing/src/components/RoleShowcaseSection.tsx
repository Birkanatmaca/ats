import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

type RoleId = "mudur" | "ogretmen" | "rehberlik" | "aile";

type RoleContent = {
  id: RoleId;
  label: string;
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  lead: string;
  highlights: string[];
};

const ROLES: RoleContent[] = [
  {
    id: "mudur",
    label: "Müdür",
    image: "/roles/okul-muduru.svg",
    imageAlt: "Okul müdürü OGTA panelini kullanırken",
    eyebrow: "Müdür paneli",
    title: "Kurumun tüm operasyonunu tek ekrandan yönetin",
    lead:
      "Devam oranları, sınıf yoğunluğu, yoklama tamamlama ve günlük operasyon önceliklerini gerçek zamanlı izleyin.",
    highlights: [
      "Kurum geneli devam ve yoklama dashboard'u",
      "Sınıf ve öğretmen bazlı performans görünümü",
      "Kritik uyarılar ve operasyon öncelik listesi",
      "Denetlenebilir raporlar ve yönetici özeti"
    ]
  },
  {
    id: "ogretmen",
    label: "Öğretmen",
    image: "/roles/okul-ogretmen.svg",
    imageAlt: "Öğretmen OGTA ile yoklama alırken",
    eyebrow: "Öğretmen paneli",
    title: "Ders akışınızı kesintisiz yönetin",
    lead:
      "Aktif dersinizi seçin, doğru sınıf listesine ulaşın ve yoklamayı saniyeler içinde tamamlayın.",
    highlights: [
      "Aktif derse göre otomatik sınıf listesi",
      "Hızlı yoklama ve devamsızlık kaydı",
      "Haftalık ders programı görünümü",
      "Öğrenci notlarına anında erişim"
    ]
  },
  {
    id: "rehberlik",
    label: "Rehberlik",
    image: "/roles/okul-rehberlik.svg",
    imageAlt: "Rehberlik uzmanı öğrenci gözlemi kaydederken",
    eyebrow: "Rehberlik modülü",
    title: "Gözlem ve takip süreçlerini yapılandırın",
    lead:
      "Öğrenci gözlemlerini standart biçimde kaydedin, risk sinyallerini erken yakalayın ve rehberlik planlarını yönetin.",
    highlights: [
      "Yapılandırılmış gözlem formları",
      "Risk sinyali ve takip planı akışı",
      "Rehberlik notları ve geçmiş kayıtlar",
      "ogta.ai destekli analiz önerileri"
    ]
  },
  {
    id: "aile",
    label: "Veli",
    image: "/roles/okul-aile.svg",
    imageAlt: "Veli OGTA veli panelinden bilgi alırken",
    eyebrow: "Veli paneli",
    title: "Okul ile iletişimde şeffaflık sağlayın",
    lead:
      "Devamsızlık bildirimleri, ders programı ve kurum duyuruları veliye zamanında ulaşır.",
    highlights: [
      "Anlık devamsızlık bildirimleri",
      "Güncel ders programı görüntüleme",
      "Kurum duyuruları ve bilgilendirmeler",
      "Şeffaf, güvenilir iletişim kanalı"
    ]
  }
];

const ROTATE_MS = 5000;

export function RoleShowcaseSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const activeRole = ROLES[activeIndex];

  useEffect(() => {
    ROLES.forEach((role) => {
      const img = new Image();
      img.src = role.image;
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % ROLES.length);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [cycleKey]);

  function selectRole(index: number) {
    setActiveIndex(index);
    setCycleKey((value) => value + 1);
  }

  return (
    <section className="section section-tint role-showcase snap-section snap-section--viewport" id="roller">
      <div className="container role-showcase__wrap">
        <div className="section-head center">
          <h2 id="roller-heading">Kimler için?</h2>
        </div>

        <article className="role-showcase__card" aria-labelledby="roller-heading">
          <header className="role-showcase__header">
            <div className="role-showcase__tabs" role="tablist" aria-label="OGTA kullanıcı rolleri">
              {ROLES.map((role, index) => (
                <button
                  aria-selected={index === activeIndex}
                  className={`role-showcase__tab${index === activeIndex ? " is-active" : ""}`}
                  key={role.id}
                  onClick={() => selectRole(index)}
                  role="tab"
                  style={
                    index === activeIndex
                      ? ({ "--role-progress-duration": `${ROTATE_MS}ms` } as CSSProperties)
                      : undefined
                  }
                  type="button"
                >
                  <span className="role-showcase__tab-label">{role.label}</span>
                  {index === activeIndex ? <span aria-hidden="true" className="role-showcase__tab-progress" /> : null}
                </button>
              ))}
            </div>
          </header>

          <div className="role-showcase__body">
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                className="role-showcase__copy"
                exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                key={activeRole.id}
                transition={{ duration: 0.38, ease: "easeOut" }}
              >
                <p className="role-showcase__role-eyebrow">{activeRole.eyebrow}</p>
                <h3>{activeRole.title}</h3>
                <p className="section-lead">{activeRole.lead}</p>

                <ul className="role-showcase__list">
                  {activeRole.highlights.map((item) => (
                    <li key={item}>
                      <CheckCircle2 aria-hidden="true" size={17} strokeWidth={2.2} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>

            <div className="role-showcase__visual" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.img
                  alt={activeRole.imageAlt}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="role-showcase__image"
                  exit={{ opacity: 0, scale: 0.97, x: 16 }}
                  initial={{ opacity: 0, scale: 1.02, x: -16 }}
                  key={activeRole.id}
                  loading="lazy"
                  src={activeRole.image}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </AnimatePresence>
            </div>
          </div>

          <div className="role-showcase__progress" aria-hidden="true">
            {ROLES.map((role, index) => (
              <span
                className={`role-showcase__dot${index === activeIndex ? " is-active" : ""}`}
                key={role.id}
                style={
                  index === activeIndex
                    ? ({ "--role-progress-duration": `${ROTATE_MS}ms` } as CSSProperties)
                    : undefined
                }
              />
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
