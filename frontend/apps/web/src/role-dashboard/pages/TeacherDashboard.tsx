import { CalendarClock, ClipboardCheck, MessageSquare, Save } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { AttendanceRecord, AttendanceSession } from "../../lib/api";
import { api } from "../../lib/api";
import { demoStudents, observationCategories } from "../data";
import { AnnouncementsPanel } from "../components/AnnouncementsPanel";
import { LessonList } from "../components/LessonList";
import { RoleCard } from "../components/RoleCard";
import type { DashboardData } from "../types";
import { attendanceLabel } from "../utils";
import "./TeacherDashboard.css";

export function TeacherDashboard({ data, onRefresh }: { data: DashboardData; onRefresh: () => Promise<void> }) {
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);
  const [observationForm, setObservationForm] = useState({ studentId: "student-2", category: "attention", note: "" });

  const activeLesson = data.currentLesson?.found ? data.currentLesson.lesson : undefined;
  const fallbackLesson = data.teacherLessons[0];

  async function openAttendance() {
    const lesson = activeLesson ?? fallbackLesson;
    if (!lesson) {
      setTeacherMessage("Bugün için ders bulunamadı.");
      return;
    }
    setTeacherMessage(null);
    const session = await api.createAttendanceSession(lesson.id);
    setAttendanceSession(session);
    setRecords(session.records);
  }

  async function saveAttendance() {
    if (!attendanceSession) return;
    setSavingAttendance(true);
    try {
      const updated = await api.updateAttendanceRecords(attendanceSession.id, records);
      setAttendanceSession(updated);
      setRecords(updated.records);
      setTeacherMessage("Yoklama kaydedildi.");
    } finally {
      setSavingAttendance(false);
    }
  }

  async function createObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!observationForm.note.trim()) {
      setTeacherMessage("Gözlem notu zorunludur.");
      return;
    }
    await api.createObservation(observationForm);
    setObservationForm((current) => ({ ...current, note: "" }));
    setTeacherMessage("Gözlem kaydı rehberlik kuyruğuna aktarıldı.");
    await onRefresh();
  }

  return (
    <section className="role-grid teacher-dashboard">
      <div className="role-main-column">
        <RoleCard title="Akıllı yoklama" icon={<ClipboardCheck size={18} />}>
          <div className="active-lesson-card">
            <div>
              <span>{activeLesson ? "Aktif ders bulundu" : "Aktif ders yok"}</span>
              <strong>{activeLesson ? `${activeLesson.className} · ${activeLesson.subjectName}` : data.currentLesson?.reason ?? "Manuel ders seçimi için günlük takvim kullanılıyor."}</strong>
            </div>
            <button className="primary-action small-action" type="button" onClick={() => void openAttendance()}>
              <ClipboardCheck size={16} />
              Yoklama aç
            </button>
          </div>

          {teacherMessage && <div className="role-alert role-alert--inline">{teacherMessage}</div>}

          {attendanceSession && (
            <div className="attendance-board">
              {records.map((record) => (
                <div className="attendance-row" key={record.studentId}>
                  <strong>
                    {record.number} · {record.studentName}
                  </strong>
                  <div className="attendance-actions">
                    {(["present", "absent", "late", "excused"] as const).map((status) => (
                      <button
                        className={record.status === status ? "attendance-status active" : "attendance-status"}
                        key={status}
                        type="button"
                        onClick={() => setRecords((current) => current.map((item) => (item.studentId === record.studentId ? { ...item, status } : item)))}
                      >
                        {attendanceLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button className="primary-action" type="button" disabled={savingAttendance} onClick={() => void saveAttendance()}>
                <Save size={16} />
                Yoklamayı kaydet
              </button>
            </div>
          )}
        </RoleCard>

        <RoleCard title="Bugünkü derslerim" icon={<CalendarClock size={18} />}>
          <LessonList lessons={data.teacherLessons} emptyText="Öğretmene atanmış ders bulunamadı." />
        </RoleCard>
      </div>

      <aside className="role-side-column">
        <RoleCard title="Öğrenci gözlemi" icon={<MessageSquare size={18} />}>
          <form className="observation-form" onSubmit={(event) => void createObservation(event)}>
            <label>
              <span>Öğrenci</span>
              <select value={observationForm.studentId} onChange={(event) => setObservationForm((current) => ({ ...current, studentId: event.target.value }))}>
                {demoStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} · {student.className}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Kategori</span>
              <select value={observationForm.category} onChange={(event) => setObservationForm((current) => ({ ...current, category: event.target.value }))}>
                {observationCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Not</span>
              <textarea value={observationForm.note} onChange={(event) => setObservationForm((current) => ({ ...current, note: event.target.value }))} rows={4} />
            </label>
            <button className="primary-action" type="submit">
              <Save size={16} />
              Gözlem kaydet
            </button>
          </form>
        </RoleCard>
        <AnnouncementsPanel announcements={data.announcements} />
      </aside>
    </section>
  );
}
