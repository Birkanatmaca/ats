import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  HeartHandshake,
  ShieldCheck,
  Users
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { features } from "../lib/constants";
import { GlowingCard, GlowingCards } from "./GlowingCards";

const iconMap = {
  attendance: ClipboardCheck,
  schedule: CalendarDays,
  guidance: HeartHandshake,
  guardian: Users,
  dashboard: BarChart3,
  security: ShieldCheck
} as const;

const glowColorMap = {
  attendance: "#3b82f6",
  schedule: "#a855f7",
  guidance: "#22c55e",
  guardian: "#fb7185",
  dashboard: "#f59e0b",
  security: "#94a3b8"
} as const;

function ModuleCard({ feature }: { feature: (typeof features)[number] }) {
  const Icon = iconMap[feature.icon];
  const glowColor = glowColorMap[feature.icon];

  return (
    <GlowingCard glowColor={glowColor} role="listitem">
      <div aria-hidden="true" className="glowing-card__icon">
        <Icon size={20} strokeWidth={2} />
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </GlowingCard>
  );
}

export function Features() {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = features.length;

  function goPrev() {
    setActiveIndex((current) => (current - 1 + total) % total);
  }

  function goNext() {
    setActiveIndex((current) => (current + 1) % total);
  }

  const activeFeature = features[activeIndex];

  return (
    <section className="section section-tint modules-section snap-section snap-section--viewport" id="ozellikler">
      <div className="container modules-section__wrap">
        <div className="modules-section__panel">
          <div className="section-head center">
            <h2 id="moduller-heading">Modüllerimiz</h2>
          </div>

          <div className="modules-display__desktop">
            <GlowingCards
              aria-labelledby="moduller-heading"
              className="modules-glowing-cards"
              gap="clamp(0.65rem, 1.15vw, 0.9rem)"
              glowRadius={22}
              maxWidth="100%"
              role="list"
            >
              {features.map((feature) => (
                <ModuleCard feature={feature} key={feature.title} />
              ))}
            </GlowingCards>
          </div>

          <div aria-labelledby="moduller-heading" className="modules-display__mobile" role="list">
            <div className="modules-carousel">
              <button
                aria-label="Önceki modül"
                className="modules-carousel__nav"
                onClick={goPrev}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.2} />
              </button>

              <div className="modules-carousel__viewport">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="modules-carousel__slide"
                    exit={{ opacity: 0, x: -24 }}
                    initial={{ opacity: 0, x: 24 }}
                    key={activeFeature.title}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    <ModuleCard feature={activeFeature} />
                  </motion.div>
                </AnimatePresence>
              </div>

              <button
                aria-label="Sonraki modül"
                className="modules-carousel__nav"
                onClick={goNext}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={22} strokeWidth={2.2} />
              </button>
            </div>

            <div aria-hidden="true" className="modules-carousel__meta">
              <span className="modules-carousel__counter">
                {activeIndex + 1} / {total}
              </span>
              <div className="modules-carousel__dots">
                {features.map((feature, index) => (
                  <button
                    aria-label={`${feature.title} modülüne git`}
                    className={`modules-carousel__dot${index === activeIndex ? " is-active" : ""}`}
                    key={feature.title}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
