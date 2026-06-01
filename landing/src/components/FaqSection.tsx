import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import BlurGradientText from "./BlurGradientText";
import BlurText from "./BlurText";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { FAQ_CATEGORIES } from "../lib/faq";

const GRADIENT_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

export function FaqSection() {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(`${baseId}-genel-0`);

  function toggleItem(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <section aria-labelledby="faq-heading" className="section section-tint faq-section" id="sss">
      <div className="container faq-section__wrap">
        <div className="section-head center faq-section__head">
          <h1 className="faq-headline" id="faq-heading">
            <BlurGradientText
              className="faq-headline-accent"
              text="SSS"
              colors={GRADIENT_COLORS}
              delay={100}
              direction="top"
              stepDuration={0.38}
              animationSpeed={7}
              immediate
              tag="span"
            />
          </h1>

          <BlurText
            animateBy="words"
            block
            className="faq-subtitle"
            delay={40}
            direction="top"
            immediate
            startDelay={180}
            stepDuration={0.32}
            tag="p"
            text="Sık sorulan sorular"
          />

          <BlurText
            animateBy="words"
            block
            className="faq-intro-text"
            delay={22}
            direction="top"
            immediate
            startDelay={420}
            stepDuration={0.28}
            tag="p"
            text="OGTA, modüller, OGTA.ai, lisanslama ve güvenlik hakkında en çok merak edilen konuları kategoriler halinde derledik."
          />
        </div>

        <div className="faq-layout">
          {FAQ_CATEGORIES.map((category) => (
            <section aria-labelledby={`${baseId}-${category.id}-title`} className="faq-category" key={category.id}>
              <header className="faq-category__head">
                <h2 id={`${baseId}-${category.id}-title`}>{category.title}</h2>
                <p>{category.description}</p>
              </header>

              <div className="faq-list">
                {category.items.map((item, index) => {
                  const itemId = `${baseId}-${category.id}-${index}`;
                  const isOpen = openId === itemId;

                  return (
                    <article className={`faq-item${isOpen ? " is-open" : ""}`} key={item.question}>
                      <button
                        aria-controls={`${itemId}-panel`}
                        aria-expanded={isOpen}
                        className="faq-item__trigger"
                        id={`${itemId}-trigger`}
                        onClick={() => toggleItem(itemId)}
                        type="button"
                      >
                        <span>{item.question}</span>
                        <ChevronDown
                          aria-hidden="true"
                          className="faq-item__chevron"
                          size={18}
                          strokeWidth={2.2}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <motion.div
                            animate={{ height: "auto", opacity: 1 }}
                            className="faq-item__panel"
                            exit={{ height: 0, opacity: 0 }}
                            id={`${itemId}-panel`}
                            initial={{ height: 0, opacity: 0 }}
                            role="region"
                            aria-labelledby={`${itemId}-trigger`}
                            transition={{ duration: 0.28, ease: "easeOut" }}
                          >
                            <div className="faq-item__content">
                              <p>{item.answer}</p>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="faq-cta">
          <div className="faq-cta__copy">
            <p className="eyebrow">Hâlâ sorunuz mu var?</p>
            <h2>Cevabını bulamadığınız konular için bize yazın</h2>
            <p className="section-lead">
              Demo talebi, fiyat teklifi veya teknik sorularınız için lisanslama sayfasındaki formu kullanabilirsiniz.
            </p>
          </div>
          <div className="faq-cta__actions">
            <Button asChild size="lg" variant="gradient">
              <Link to="/lisanslama">
                <MessageCircle aria-hidden="true" size={18} strokeWidth={2.2} />
                İletişime geç
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
