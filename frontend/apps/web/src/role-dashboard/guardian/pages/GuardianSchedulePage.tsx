import { CalendarDays } from "lucide-react";
import { GuardianLessonList } from "../components/GuardianLessonList";
import type { GuardianChild, GuardianData } from "../types";

export function GuardianSchedulePage({ child, lessons }: { child: GuardianChild; lessons: GuardianData["scheduleLessons"] }) {
  return (
    <section className="guardian-page-stack">
      <div className="guardian-page-title">
        <span className="section-kicker">Ders programı</span>
        <h1>{child.className} programı</h1>
      </div>

      <section className="principal-surface-card">
        <div className="guardian-card-head">
          <div>
            <h2>Yayınlanan program</h2>
            <p>Çocuğa ait sınıf/şube programı kurum tarafından yayınlandığında burada görünür.</p>
          </div>
          <span className="status-badge active">
            <CalendarDays size={14} />
            {lessons.length} ders
          </span>
        </div>
        <GuardianLessonList lessons={lessons} />
      </section>
    </section>
  );
}
