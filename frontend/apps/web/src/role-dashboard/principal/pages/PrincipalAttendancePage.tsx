import type { PrincipalConsoleData } from "../types";

export function PrincipalAttendancePage({ data }: { data: PrincipalConsoleData }) {
  const summary = data.summary;
  const rows = summary?.classAttendance ?? [];

  return (
    <section className="principal-page-stack">
      <header className="sa-page-header">
        <span className="sa-kicker">Yoklama</span>
        <h1>Yoklama takibi</h1>
        <p>Alınan/alınmayan yoklamaları ve devamsızlık yoğunluğunu sınıf bazında görüntüle.</p>
      </header>

      <article className="principal-surface-card">
        <div className="principal-inline-stats">
          <div>
            <span>Toplam ders</span>
            <strong>{summary?.todayLessons ?? 0}</strong>
          </div>
          <div>
            <span>Devamsız öğrenci</span>
            <strong>{summary?.absentToday ?? 0}</strong>
          </div>
          <div>
            <span>Tamamlama oranı</span>
            <strong>%{summary?.attendanceCompletionPct ?? 0}</strong>
          </div>
        </div>

        <div className="principal-list">
          {rows.length === 0 ? (
            <p className="empty-text">Sınıf bazlı yoklama özeti bulunamadı.</p>
          ) : (
            rows.map((item) => (
              <div className="principal-list-row" key={item.className}>
                <div>
                  <strong>{item.className}</strong>
                  <span>
                    {item.completed}/{item.total} yoklama
                  </span>
                </div>
                <small>{item.absent} devamsız</small>
                <em>{item.attentionNeed}</em>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
