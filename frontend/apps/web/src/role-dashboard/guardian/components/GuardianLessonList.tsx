import { Clock3, MapPin } from "lucide-react";
import type { Lesson } from "../../../lib/api";

const dayLabels = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function GuardianLessonList({ lessons, limit }: { lessons: Lesson[]; limit?: number }) {
  const visibleLessons = typeof limit === "number" ? lessons.slice(0, limit) : lessons;

  if (visibleLessons.length === 0) {
    return <p className="empty-text guardian-empty-pad">Çocuğa ait yayınlanmış ders programı bulunamadı.</p>;
  }

  return (
    <div className="guardian-lesson-list">
      {visibleLessons.map((lesson) => (
        <article className="guardian-lesson-row" key={lesson.id}>
          <div className="guardian-lesson-time">
            <strong>{lesson.startTime}</strong>
            <span>{lesson.endTime}</span>
          </div>
          <div className="guardian-lesson-body">
            <strong>{lesson.subjectName}</strong>
            <span>{lesson.teacherName}</span>
          </div>
          <div className="guardian-lesson-meta">
            <span>
              <Clock3 size={13} />
              {dayLabels[lesson.dayOfWeek] ?? "Gün"}
            </span>
            <span>
              <MapPin size={13} />
              {lesson.room || "Derslik"}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
