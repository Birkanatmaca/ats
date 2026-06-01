import { Check } from "lucide-react";
import { pricingPlans } from "../lib/constants";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function Pricing() {
  return (
    <section className="section" id="fiyatlandirma">
      <div className="container">
        <div className="section-head center">
          <p className="eyebrow">Lisanslama</p>
          <h2>Öğrenci bazlı, şeffaf fiyatlandırma</h2>
          <p className="section-lead">
            Starter, Core ve Premium paketler. Kurum büyüklüğünüze göre esnek lisans; yıllık teklif ve PDF
            çıktısı ile kurumsal satış sürecine uygun.
          </p>
        </div>
        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <article
              className={`price-card price-card--${plan.id}${plan.featured ? " featured" : ""}`}
              key={plan.id}
            >
              {plan.featured ? <span className="price-badge">Önerilen</span> : null}
              <div className="price-top">
                <h3>{plan.name}</h3>
                <p>{plan.tagline}</p>
              </div>
              <div className="price-amount">
                <strong>{formatUsd(plan.price)}</strong>
                <span>/ öğrenci / yıl</span>
              </div>
              <p className="price-min">Min. {formatUsd(plan.minOrder)} / yıl</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check aria-hidden size={14} strokeWidth={2.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a className={`btn ${plan.featured ? "btn-primary" : "btn-secondary"} btn-block`} href="#iletisim">
                Teklif al
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
