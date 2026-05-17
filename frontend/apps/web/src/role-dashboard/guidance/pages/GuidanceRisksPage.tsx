import { AlertTriangle } from "lucide-react";
import { GuidanceRiskList } from "../components/GuidanceRiskList";
import type { GuidanceRiskSignal } from "../types";

export function GuidanceRisksPage({ risks }: { risks: GuidanceRiskSignal[] }) {
  const highCount = risks.filter((risk) => risk.level === "high").length;

  return (
    <section className="guidance-page-stack">
      <div className="guidance-page-title">
        <span className="section-kicker">Erken uyarı</span>
        <h1>Risk sinyalleri</h1>
      </div>

      <section className="principal-surface-card">
        <div className="guidance-card-head">
          <div>
            <h2>Değerlendirme kuyruğu</h2>
            <p>Kural tabanlı sinyaller rehberlik değerlendirmesi için listelenir.</p>
          </div>
          <span className="status-badge critical">
            <AlertTriangle size={14} />
            {highCount} yüksek
          </span>
        </div>
        <GuidanceRiskList signals={risks} />
      </section>
    </section>
  );
}
