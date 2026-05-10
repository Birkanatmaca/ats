import type { PrincipalConsoleData } from "../types";

export function PrincipalAnnouncementsPage({ data }: { data: PrincipalConsoleData }) {
  return (
    <section className="principal-page-stack">
      <header className="sa-page-header">
        <span className="sa-kicker">Duyurular</span>
        <h1>Yayınlanan duyurular</h1>
        <p>Veli ve öğretmen iletişiminde kullanılan güncel kurum duyurularını görüntüle.</p>
      </header>

      <article className="principal-surface-card">
        {data.announcements.length === 0 ? (
          <p className="empty-text">Yayınlanmış duyuru bulunamadı.</p>
        ) : (
          <div className="principal-list">
            {data.announcements.map((item) => (
              <div className="principal-list-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.audience}</span>
                </div>
                <small>{new Date(item.publishedAt).toLocaleDateString("tr-TR")}</small>
                <em>{item.body}</em>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
