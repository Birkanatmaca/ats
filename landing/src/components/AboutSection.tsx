import {
  HeartHandshake,
  Layers3,
  School,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import BlurGradientText from "./BlurGradientText";
import BlurText from "./BlurText";
import { GlowingCard, GlowingCards } from "./GlowingCards";

const GRADIENT_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

const ABOUT_CARDS = [
  {
    icon: Target,
    glowColor: "#3b82f6",
    title: "Neden OGTA?",
    text: "Okullar yoklama, program ve veli iletişimini farklı araçlarla yönetiyor. OGTA bu parçalanmayı tek, tutarlı bir platformda birleştirir."
  },
  {
    icon: Layers3,
    glowColor: "#a855f7",
    title: "Ne sunuyoruz?",
    text: "Akıllı yoklama, AI destekli ders programı, rehberlik modülü, veli paneli ve müdür dashboard'u — aynı veri modeli üzerinde."
  },
  {
    icon: School,
    glowColor: "#22c55e",
    title: "Kimler için?",
    text: "Özel okul, kolej, kurs merkezi ve rehberlik odaklı kurumlar; günlük operasyonu dijitalleştirmek isteyen eğitim yöneticileri için."
  },
  {
    icon: Sparkles,
    glowColor: "#f59e0b",
    title: "OGTA.ai farkı",
    text: "Doğal dil komutlarıyla operasyonel işlemleri hızlandırır; kritik aksiyonlar yetki ve onay kontrolünden geçer."
  },
  {
    icon: ShieldCheck,
    glowColor: "#94a3b8",
    title: "Güvenilir altyapı",
    text: "Multi-tenant mimari, rol bazlı erişim (RBAC) ve denetim izi ile kurum verisi izole, denetlenebilir ve KVKK odaklı korunur."
  },
  {
    icon: HeartHandshake,
    glowColor: "#fb7185",
    title: "Amacımız",
    text: "Kurumların operasyon yükünü azaltıp eğitime, rehberliğe ve öğrenci gelişimine daha fazla zaman ayırmasını sağlamak."
  }
] as const;

export function AboutSection() {
  return (
    <section className="section section-tint about-section snap-section--viewport" id="hakkimizda">
      <div className="container about-section__wrap">
        <div className="about-section__panel">
          <div className="section-head center about-section__head">
            <h1 className="about-headline">
              <BlurGradientText
                className="about-headline-accent"
                text="Hakkımızda"
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
              block
              tag="p"
              className="about-subtitle"
              text="Eğitime odaklanmanız için operasyonu sadeleştiriyoruz"
              animateBy="words"
              delay={40}
              startDelay={180}
              direction="top"
              stepDuration={0.32}
              immediate
            />
          </div>

          <div className="about-section__intro">
            <BlurText
              block
              tag="p"
              className="about-intro-text"
              text="OGTA, eğitim kurumlarının günlük operasyonlarını dağınık araçlardan kurtarıp tek bir güvenilir platformda birleştirmek için geliştirilmiş bulut tabanlı okul yönetim yazılımıdır."
              animateBy="words"
              delay={28}
              startDelay={420}
              direction="top"
              stepDuration={0.3}
              immediate
            />
            <BlurText
              block
              tag="p"
              className="about-intro-text"
              text="Yoklama defterleri, Excel listeleri ve dağınık iletişim kanalları; müdürden öğretmene, rehberlikten veliye kadar herkesin zaman kaybetmesine yol açar. OGTA bu süreçleri dijitalleştirir: devamsızlık anında kayda geçer, ders programı çakışmadan yönetilir, rehberlik notları yapılandırılmış biçimde saklanır ve veli bilgilendirmesi şeffaf kanallardan iletilir."
              animateBy="words"
              delay={22}
              startDelay={720}
              direction="top"
              stepDuration={0.28}
              immediate
            />
          </div>

          <GlowingCards
            aria-label="Hakkımızda bilgi kartları"
            className="about-glowing-cards"
            gap="clamp(0.55rem, 1vw, 0.75rem)"
            glowRadius={20}
            maxWidth="100%"
            role="list"
          >
            {ABOUT_CARDS.map((card) => {
              const Icon = card.icon;

              return (
                <GlowingCard glowColor={card.glowColor} key={card.title} role="listitem">
                  <div aria-hidden="true" className="glowing-card__icon">
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </GlowingCard>
              );
            })}
          </GlowingCards>
        </div>
      </div>
    </section>
  );
}
