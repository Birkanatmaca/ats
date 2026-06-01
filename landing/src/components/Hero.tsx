import Orb from "./Orb";
import BlurText from "./BlurText";
import BlurGradientText from "./BlurGradientText";
import { Button } from "@/components/animate-ui/components/buttons/button";

const GRADIENT_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

export function Hero() {
  return (
    <section className="hero hero--centered snap-section snap-section--viewport" aria-label="OGTA okul yönetim platformu">
      <div className="hero-orb" aria-hidden="true">
        <Orb backgroundColor="#070b14" hoverIntensity={0.25} rotateOnHover />
      </div>
      <div className="hero-vignette" aria-hidden="true" />

      <div className="container hero-content">
        <h1 className="hero-headline">
          <BlurText
            inline
            tag="span"
            className="hero-headline-part"
            text="Okulunuzun"
            animateBy="words"
            delay={85}
            direction="top"
            stepDuration={0.38}
            immediate
          />
          <BlurGradientText
            className="hero-headline-accent"
            text="Dijital Yönetim"
            colors={GRADIENT_COLORS}
            delay={120}
            startDelay={220}
            direction="top"
            stepDuration={0.38}
            animationSpeed={7}
            immediate
          />
          <BlurText
            inline
            tag="span"
            className="hero-headline-part"
            text="Merkezi"
            animateBy="words"
            delay={85}
            startDelay={520}
            direction="top"
            stepDuration={0.38}
            immediate
          />
        </h1>

        <BlurText
          block
          tag="p"
          className="hero-subtitle"
          text="Ders programı, yoklama, veli iletişimi, rehberlik süreçleri ve AI destekli analizleri OGTA ile tek platformda yönetin."
          animateBy="words"
          delay={35}
          startDelay={750}
          direction="top"
          stepDuration={0.32}
          immediate
        />

        <div className="hero-actions">
          <Button variant="default" size="lg" asChild>
            <a href="#iletisim">Demo İsteyin</a>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <a href="#ozellikler">Platformu İnceleyin</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
