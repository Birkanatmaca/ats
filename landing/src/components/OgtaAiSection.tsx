import { Check } from "lucide-react";
import { ogtaChecks } from "../lib/constants";

export function OgtaAiSection() {
  return (
    <section className="section section-tint" id="ogta-ai">
      <div className="container ogta-grid">
        <div className="ogta-copy">
          <p className="eyebrow">ogta.ai</p>
          <h2>Doğal dille komut verin, onaylı aksiyon alın</h2>
          <p className="section-lead">
            ogta.ai ayrı bir sohbet uygulaması değil — mevcut okul operasyonlarını hızlandıran komut
            asistanıdır. Her kritik işlem yetki, kapsam ve açık onay ile çalışır.
          </p>
          <ul className="check-list">
            {ogtaChecks.map((item) => (
              <li key={item}>
                <Check aria-hidden size={16} strokeWidth={2.5} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ogta-panel">
          <div className="terminal">
            <div className="terminal-bar">
              <span />
              <span />
              <span />
              <p>ogta.ai · öğretmen oturumu</p>
            </div>
            <div className="terminal-body">
              <p>
                <strong>Siz:</strong> Ayşe Yılmaz için dikkat gözlemi ekle — derste dağılıyor.
              </p>
              <p>
                <strong>ogta.ai:</strong> 10-A sınıfında iki aday buldum. Hangi öğrenci?
              </p>
              <p>
                <strong>Siz:</strong> Birinci aday.
              </p>
              <p>
                <strong>ogta.ai:</strong> Taslak hazır. Kategori: dikkat · Onaylıyor musunuz?
              </p>
              <p className="terminal-success">✓ Gözlem kaydı oluşturuldu · audit log yazıldı</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
