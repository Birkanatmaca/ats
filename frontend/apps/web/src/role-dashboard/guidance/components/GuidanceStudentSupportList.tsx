import { categoryLabel } from "../../utils";
import type { GuidanceStudentSupport } from "../types";
import { formatGuidanceDate, supportStatusLabel } from "../utils";

export function GuidanceStudentSupportList({ students, limit }: { students: GuidanceStudentSupport[]; limit?: number }) {
  const visibleStudents = typeof limit === "number" ? students.slice(0, limit) : students;

  if (visibleStudents.length === 0) {
    return <p className="empty-text guidance-empty-pad">Destek takibinde öğrenci yok.</p>;
  }

  return (
    <div className="guidance-student-list">
      {visibleStudents.map((student) => (
        <article className="guidance-student-row" key={student.studentId}>
          <div>
            <strong>{student.studentName}</strong>
            <span>
              {student.className} · {student.observationCount} gözlem · {categoryLabel(student.lastCategory)}
            </span>
          </div>
          <div className="guidance-student-meta">
            <span className={`status-badge ${student.status === "review" ? "warning" : "active"}`}>{supportStatusLabel(student.status)}</span>
            <small>{formatGuidanceDate(student.lastSeenAt)}</small>
          </div>
        </article>
      ))}
    </div>
  );
}
