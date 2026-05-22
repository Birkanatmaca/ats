import { useMemo } from "react";
import type { Lesson } from "../../../lib/api";
import {
  buildTimeSlots,
  currentWeekday,
  lessonAtSlot,
  SCHOOL_WEEK_DAYS,
  weekdayLabel
} from "../../teacher/utils/lessonSchedule";
import "../../teacher/TeacherLessonsPage.css";

export function GuardianWeekScheduleCalendar({ lessons }: { lessons: Lesson[] }) {
  const today = currentWeekday();
  const timeSlots = useMemo(() => buildTimeSlots(lessons), [lessons]);

  if (lessons.length === 0) {
    return <p className="teacher-lessons-empty">Yayınlanmış ders programı bulunamadı.</p>;
  }

  if (timeSlots.length === 0) {
    return <p className="teacher-lessons-empty">Saat bilgisi olan ders bulunamadı.</p>;
  }

  return (
    <div className="teacher-week-calendar-wrap guardian-week-calendar-wrap">
      <table className="teacher-week-calendar">
        <thead>
          <tr>
            <th className="teacher-week-time-col">Saat</th>
            {SCHOOL_WEEK_DAYS.map((day) => (
              <th key={day} className={day === today ? "is-today" : ""}>
                {weekdayLabel(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot) => (
            <tr key={slot}>
              <th className="teacher-week-time-col">{slot}</th>
              {SCHOOL_WEEK_DAYS.map((day) => {
                const lesson = lessonAtSlot(lessons, day, slot);
                return (
                  <td key={`${day}-${slot}`} className={`${day === today ? "is-today" : ""}${lesson ? "" : " is-empty"}`}>
                    {lesson ? (
                      <div className="teacher-week-slot">
                        <div className="teacher-week-lesson">
                          <strong>{lesson.subjectName}</strong>
                          <span>{lesson.teacherName}</span>
                          <em>
                            {lesson.endTime}
                            {lesson.room ? ` · ${lesson.room}` : ""}
                          </em>
                        </div>
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
