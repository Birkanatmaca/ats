import type { ModuleStatus } from "../../lib/api";
import { moduleIcon } from "../components/adminIcons";
import { StatusBadge } from "../components/StatusBadge";
import "./ModulesPage.css";

export function ModulesPage({ modules }: { modules: ModuleStatus[] }) {
  return (
    <section className="sa-page-stack">
      <div className="sa-strip">
        <div>
          <span className="sa-kicker">Modül kontrolü</span>
          <h2>Ürün yüzeyleri ve servis sağlığı</h2>
        </div>
        <div className="sa-inline-controls">
          <StatusBadge value="operational" />
          <StatusBadge value="planned" />
        </div>
      </div>

      <section className="sa-module-grid">
        {modules.map((module) => (
          <div className="sa-module-card" key={module.name}>
            <div className="sa-module-icon">{moduleIcon(module.name)}</div>
            <div>
              <strong>{module.name}</strong>
              <p>{module.description}</p>
            </div>
            <StatusBadge value={module.status} />
          </div>
        ))}
      </section>
    </section>
  );
}
