import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  HeartHandshake,
  ShieldCheck,
  Users
} from "lucide-react";
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

export function Features() {
  return (
    <section className="section section-tint modules-section snap-section snap-section--viewport" id="ozellikler">
      <div className="container modules-section__wrap">
        <div className="modules-section__panel">
          <div className="section-head center">
            <h2 id="moduller-heading">Modüllerimiz</h2>
          </div>

          <GlowingCards
            aria-labelledby="moduller-heading"
            className="modules-glowing-cards"
            gap="clamp(0.65rem, 1.15vw, 0.9rem)"
            glowRadius={22}
            maxWidth="100%"
            role="list"
          >
            {features.map((feature) => {
              const Icon = iconMap[feature.icon];
              const glowColor = glowColorMap[feature.icon];

              return (
                <GlowingCard glowColor={glowColor} key={feature.title} role="listitem">
                  <div aria-hidden="true" className="glowing-card__icon">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </GlowingCard>
              );
            })}
          </GlowingCards>
        </div>
      </div>
    </section>
  );
}
