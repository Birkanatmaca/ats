import { useState } from "react";
import { Layers3, Mail, MessageSquare, Puzzle, Sparkles } from "lucide-react";
import BlurGradientText from "./BlurGradientText";
import BlurText from "./BlurText";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { CONTACT_EMAIL } from "../lib/constants";
import { ContactRequestModal } from "./ContactRequestModal";

const GRADIENT_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

const POLICY_POINTS = [
  {
    icon: Puzzle,
    title: "Modüler lisans",
    text: "Kurumunuz yalnızca ihtiyaç duyduğu modülleri devreye alır; gereksiz paket yükü olmaz."
  },
  {
    icon: Layers3,
    title: "Kuruma özel yapı",
    text: "Öğrenci sayısı, kullanıcı rolleri ve operasyon kapsamına göre lisans planı birlikte şekillendirilir."
  },
  {
    icon: Sparkles,
    title: "Şeffaf teklif süreci",
    text: "Sabit liste fiyatı yerine ihtiyaç analizi sonrası net, yazılı kurumsal teklif sunulur."
  }
] as const;

export function LicensingSection() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="section section-tint licensing-section" id="lisanslama">
      <div className="container licensing-section__wrap">
        <div className="section-head center licensing-section__head">
          <h1 className="licensing-headline">
            <BlurGradientText
              className="licensing-headline-accent"
              text="Lisanslama"
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
            className="licensing-subtitle"
            text="Kuruma uygun modüler fiyat politikası"
            animateBy="words"
            delay={40}
            startDelay={180}
            direction="top"
            stepDuration={0.32}
            immediate
          />

          <BlurText
            block
            tag="p"
            className="licensing-intro-text"
            text="OGTA'da her kurum aynı pakete zorlanmaz. Operasyon kapsamınıza göre modülleri birlikte belirler, demo ve teklif sürecini kurumunuza özel yürütürüz. Web sitemizde sabit ücret paylaşılmaz; net fiyatlandırma teklif aşamasında iletilir."
            animateBy="words"
            delay={22}
            startDelay={420}
            direction="top"
            stepDuration={0.28}
            immediate
          />
        </div>

        <div className="licensing-policy-grid">
          {POLICY_POINTS.map((point) => {
            const Icon = point.icon;

            return (
              <article className="licensing-policy-card" key={point.title}>
                <div aria-hidden="true" className="licensing-policy-card__icon">
                  <Icon size={18} strokeWidth={2} />
                </div>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            );
          })}
        </div>

        <div className="licensing-contact-panel">
          <div className="licensing-contact-card">
            <div className="licensing-contact-card__copy">
              <p className="eyebrow">İletişim</p>
              <h2>Demo planlayın veya fiyat teklifi isteyin</h2>
              <p className="section-lead">
                Kurumunuza özel modül yapısı ve lisans planı için formu doldurun; talebiniz{" "}
                <strong>{CONTACT_EMAIL}</strong> adresine iletilir.
              </p>
              <a className="licensing-contact-card__email" href={`mailto:${CONTACT_EMAIL}`}>
                <Mail aria-hidden="true" size={17} strokeWidth={2.2} />
                {CONTACT_EMAIL}
              </a>
            </div>

            <div className="licensing-contact-card__actions">
              <Button onClick={() => setModalOpen(true)} size="lg" type="button" variant="gradient">
                <MessageSquare aria-hidden="true" size={18} strokeWidth={2.2} />
                Talep formunu aç
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ContactRequestModal onClose={() => setModalOpen(false)} open={modalOpen} />
    </section>
  );
}
