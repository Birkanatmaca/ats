import { Check, Sparkles } from "lucide-react";
import { ogtaChecks } from "../lib/constants";

const DEMO_MESSAGES = [
  {
    role: "user" as const,
    text: "Ayşe Yılmaz için dikkat gözlemi ekle — derste dağılıyor."
  },
  {
    role: "ai" as const,
    text: "10-A sınıfında iki aday buldum. Hangi öğrenciyi kastediyorsunuz?"
  },
  {
    role: "user" as const,
    text: "Birinci aday."
  },
  {
    role: "ai" as const,
    text: "Taslak hazır. Kategori: dikkat · Onaylıyor musunuz?"
  }
];

export function OgtaAiSection() {
  return (
    <section className="section section-tint ogta-section snap-section snap-section--viewport" id="ogta-ai">
      <div className="container ogta-section__wrap">
        <div className="section-head center">
          <h2 id="ogta-ai-heading">
            OGTA<span className="ogta-section__brand-ai">.ai</span>
          </h2>
        </div>

        <article className="ogta-section__card" aria-labelledby="ogta-ai-heading">
          <div className="ogta-section__body">
            <div className="ogta-section__copy">
              <h3 className="ogta-section__tagline">Doğal dille komut verin, onaylı aksiyon alın</h3>
              <p className="section-lead">
                OGTA.ai ayrı bir sohbet uygulaması değil — mevcut okul operasyonlarını hızlandıran komut
                asistanıdır. Her kritik işlem yetki, kapsam ve açık onay ile çalışır.
              </p>

              <ul className="ogta-section__checks">
                {ogtaChecks.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true" className="ogta-section__check-icon">
                      <Check size={13} strokeWidth={2.8} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ogta-section__demo" aria-label="OGTA.ai örnek oturum">
              <div className="ogta-demo">
                <div className="ogta-demo__glow" aria-hidden="true" />
                <header className="ogta-demo__header">
                  <div className="ogta-demo__brand">
                    <Sparkles aria-hidden="true" size={15} strokeWidth={2.2} />
                    <span>
                      OGTA<span className="ogta-section__brand-ai">.ai</span> asistan
                    </span>
                  </div>
                  <span className="ogta-demo__status">Çevrimiçi</span>
                </header>

                <div className="ogta-demo__messages">
                  {DEMO_MESSAGES.map((message, index) => (
                    <div
                      className={`ogta-demo__message ogta-demo__message--${message.role}`}
                      key={index}
                    >
                      <span className="ogta-demo__message-label">
                        {message.role === "user" ? "Siz" : "OGTA.ai"}
                      </span>
                      <p>{message.text}</p>
                    </div>
                  ))}
                </div>

                <footer className="ogta-demo__footer">
                  <Check aria-hidden="true" size={14} strokeWidth={2.5} />
                  <span>Gözlem kaydı oluşturuldu · audit log yazıldı</span>
                </footer>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
