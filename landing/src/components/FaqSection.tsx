import { FAQ_ITEMS } from "../lib/seo";

export function FaqSection() {
  return (
    <section className="section section-tint" id="sss" aria-labelledby="faq-heading">
      <div className="container">
        <div className="section-head center">
          <p className="eyebrow">Sık sorulan sorular</p>
          <h2 id="faq-heading">OGTA hakkında merak edilenler</h2>
          <p className="section-lead">
            Kurumunuzun dijital dönüşümünde doğru kararı vermenize yardımcı olacak kısa yanıtlar.
          </p>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
