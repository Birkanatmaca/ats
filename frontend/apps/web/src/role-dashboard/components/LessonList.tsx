import type { Lesson } from "../../lib/api";

export function LessonList({ lessons, emptyText }: { lessons: Lesson[]; emptyText: string }) {
  if (lessons.length === 0) {
    return <p className="role-empty">{emptyText}</p>;
  }
  return (
    <div className="lesson-list">
      {lessons.map((lesson) => (
        <div className="lesson-row" key={lesson.id}>
          <div>
            <strong>{lesson.className}</strong>
            <span>
              {lesson.subjectName} · {lesson.teacherName}
            </span>
          </div>
          <small>
            {lesson.startTime}-{lesson.endTime}
          </small>
        </div>
      ))}
    </div>
  );
}
