import { UsersRound } from "lucide-react";
import { GuidanceStudentSupportList } from "../components/GuidanceStudentSupportList";
import type { GuidanceStudentSupport } from "../types";

export function GuidanceStudentsPage({ students }: { students: GuidanceStudentSupport[] }) {
  const reviewCount = students.filter((student) => student.status === "review").length;

  return (
    <section className="guidance-page-stack">
      <div className="guidance-page-title">
        <span className="section-kicker">Öğrenci destek</span>
        <h1>Destek takibi</h1>
      </div>

      <section className="principal-surface-card">
        <div className="guidance-card-head">
          <div>
            <h2>Öğrenci destek listesi</h2>
            <p>Gözlem kayıtlarından oluşan rehberlik takip görünümü.</p>
          </div>
          <span className="status-badge warning">
            <UsersRound size={14} />
            {reviewCount} inceleme
          </span>
        </div>
        <GuidanceStudentSupportList students={students} />
      </section>
    </section>
  );
}
