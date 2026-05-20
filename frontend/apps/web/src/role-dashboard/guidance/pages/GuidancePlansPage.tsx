import { HeartHandshake } from "lucide-react";

export function GuidancePlansPage() {
  return (
    <section className="guidance-page-stack">
      <div className="guidance-page-title">
        <span className="section-kicker">Takip planları</span>
        <h1>Rehberlik takip</h1>
      </div>

      <section className="principal-surface-card">
        <div className="guidance-card-head">
          <div>
            <h2>Faz 2</h2>
            <p>Rehberlik takip planları, görüşme kayıtları ve veli bilgilendirme aksiyonları bu fazda API ile entegre edilecek.</p>
          </div>
          <span className="status-badge normal">
            <HeartHandshake size={14} />
            Yakında
          </span>
        </div>
        <p className="empty-text">Şu an için örnek plan verisi gösterilmiyor. Gözlem ve risk ekranları aktif MVP kapsamındadır.</p>
      </section>
    </section>
  );
}
