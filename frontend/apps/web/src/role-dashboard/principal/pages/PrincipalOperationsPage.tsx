import { statusLabel } from "../../../admin/utils/labels";
import type { PrincipalConsoleData } from "../types";

export function PrincipalOperationsPage({ data }: { data: PrincipalConsoleData }) {
  const operations = data.summary?.operations ?? [];

  return (
    <section className="principal-page-stack">
      <header className="sa-page-header">
        <span className="sa-kicker">Operasyon</span>
        <h1>Aksiyon bekleyen işler</h1>
        <p>Öncelik ve durum bilgisine göre takip edilmesi gereken operasyonları sırala.</p>
      </header>

      <article className="principal-surface-card">
        {operations.length === 0 ? (
          <p className="empty-text">Aksiyon bekleyen operasyon bulunmuyor.</p>
        ) : (
          <div className="principal-list">
            {operations.map((item) => (
              <div className="principal-list-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{statusLabel(item.status)}</span>
                </div>
                <small>{statusLabel(item.priority)}</small>
                <em>{item.id}</em>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
