import type { PrincipalConsoleData } from "../types";

export function PrincipalSchedulePage({ data }: { data: PrincipalConsoleData }) {
  const lessons = data.schedule?.lessons ?? [];

  return (
    <section className="principal-page-stack">
      <header className="sa-page-header">
        <span className="sa-kicker">Ders yönetimi</span>
        <h1>Bugünkü ders akışı</h1>
        <p>Yayınlanan programı sınıf, öğretmen ve saat bilgileriyle incele.</p>
      </header>

      <article className="principal-surface-card">
        {lessons.length === 0 ? (
          <p className="empty-text">Yayınlanmış ders programı bulunamadı.</p>
        ) : (
          <div className="principal-list">
            {lessons.slice(0, 16).map((lesson) => (
              <div className="principal-list-row" key={lesson.id}>
                <div>
                  <strong>{lesson.className}</strong>
                  <span>{lesson.subjectName}</span>
                </div>
                <small>
                  {lesson.startTime} - {lesson.endTime}
                </small>
                <em>{lesson.teacherName}</em>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
