import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  HeartHandshake,
  ShieldCheck,
  Users
} from "lucide-react";
import { features } from "../lib/constants";

const iconMap = {
  attendance: ClipboardCheck,
  schedule: CalendarDays,
  guidance: HeartHandshake,
  guardian: Users,
  dashboard: BarChart3,
  security: ShieldCheck
} as const;

const toneMap = {
  attendance: "blue",
  schedule: "purple",
  guidance: "green",
  guardian: "rose",
  dashboard: "amber",
  security: "slate"
} as const;

export function Features() {
  return (
    <section className="section" id="ozellikler">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Platform</p>
          <h2>Okul yönetim yazılımında ihtiyacınız olan tüm modüller</h2>
          <p className="section-lead">
            Yoklama sisteminden ders programına, rehberlikten veli paneline — MVP odaklı, ölçülebilir değer üreten
            modüller. Her kritik işlem izlenebilir, raporlanabilir ve denetlenebilir.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon];
            const tone = toneMap[feature.icon];
            return (
              <article className="feature-card" key={feature.title}>
                <div className={`feature-icon feature-icon--${tone}`}>
                  <Icon size={22} strokeWidth={2} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
