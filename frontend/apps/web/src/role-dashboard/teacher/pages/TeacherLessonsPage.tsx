import { CalendarDays, Clock3, LayoutGrid, NotebookPen, Table2, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Lesson } from "../../../lib/api";
import { GuidanceKpiCard } from "../../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../../guidance/components/GuidanceMetricGrid";
import "../../guidance/GuidanceDataPage.css";
import "../../guidance/GuidanceSurface.css";
import {
  buildTimeSlots,
  currentWeekday,
  lessonAtSlot,
  lessonsForDay,
  sortLessons,
  SCHOOL_WEEK_DAYS,
  weekdayLabel
} from "../utils/lessonSchedule";
import "../TeacherLessonsPage.css";

type LessonsView = "week" | "day-table";

export function TeacherLessonsPage({ lessons: rawLessons, activeLessonId }: { lessons: Lesson[]; activeLessonId?: string }) {
  const lessons = useMemo(() => sortLessons(rawLessons), [rawLessons]);
  const [view, setView] = useState<LessonsView>("week");
  const today = currentWeekday();
  const classSet = useMemo(() => new Set(lessons.map((lesson) => lesson.className)), [lessons]);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId);
  const timeSlots = useMemo(() => buildTimeSlots(lessons), [lessons]);

  const defaultDay = useMemo(() => {
    if (lessons.some((lesson) => lesson.dayOfWeek === today)) {
      return today;
    }
    return SCHOOL_WEEK_DAYS.find((day) => lessons.some((lesson) => lesson.dayOfWeek === day)) ?? 1;
  }, [lessons, today]);

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const dayLessons = useMemo(() => lessonsForDay(lessons, selectedDay), [lessons, selectedDay]);

  useEffect(() => {
    setSelectedDay((current) => (lessons.some((lesson) => lesson.dayOfWeek === current) ? current : defaultDay));
  }, [defaultDay, lessons]);

  return (
    <section className="guidance-page-stack guidance-surface-page teacher-overview-page guidance-data-page teacher-lessons-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<CalendarDays size={20} />} label="Haftalık ders" value={lessons.length} detail="Yayınlanmış program" tone="sky" />
        <GuidanceKpiCard icon={<UserCheck size={20} />} label="Sınıf çeşidi" value={classSet.size} detail="Farklı sınıf" tone="emerald" />
        <GuidanceKpiCard icon={<Clock3 size={20} />} label="Aktif ders" value={activeLesson ? "Var" : "Yok"} detail={activeLesson?.className ?? "Program bekleniyor"} tone="amber" />
        <GuidanceKpiCard icon={<NotebookPen size={20} />} label="Bugün" value={lessonsForDay(lessons, today).length} detail={weekdayLabel(today)} tone="violet" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card teacher-lessons-card">
        <header className="guidance-data-card-head">
          <div className="teacher-lessons-view-toggle" role="tablist" aria-label="Görünüm">
            <button className={view === "week" ? "is-active" : ""} type="button" role="tab" aria-selected={view === "week"} onClick={() => setView("week")}>
              <LayoutGrid size={14} aria-hidden />
              Haftalık takvim
            </button>
            <button
              className={view === "day-table" ? "is-active" : ""}
              type="button"
              role="tab"
              aria-selected={view === "day-table"}
              onClick={() => setView("day-table")}
            >
              <Table2 size={14} aria-hidden />
              Günlük tablo
            </button>
          </div>
          <span>{lessons.length} ders</span>
        </header>

        {lessons.length === 0 ? (
          <p className="teacher-lessons-empty">Yayınlanmış programda size atanmış ders bulunamadı.</p>
        ) : view === "week" ? (
          <TeacherWeekCalendar lessons={lessons} timeSlots={timeSlots} activeLessonId={activeLessonId} today={today} />
        ) : (
          <TeacherDayScheduleTable
            lessons={lessons}
            selectedDay={selectedDay}
            today={today}
            dayLessons={dayLessons}
            activeLessonId={activeLessonId}
            onSelectDay={setSelectedDay}
          />
        )}
      </article>
    </section>
  );
}

function TeacherWeekCalendar({
  lessons,
  timeSlots,
  activeLessonId,
  today
}: {
  lessons: Lesson[];
  timeSlots: string[];
  activeLessonId?: string;
  today: number;
}) {
  if (timeSlots.length === 0) {
    return <p className="teacher-lessons-empty">Saat bilgisi olan ders bulunamadı.</p>;
  }

  return (
    <div className="teacher-week-calendar-wrap">
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
                        <div className={`teacher-week-lesson${lesson.id === activeLessonId ? " is-active" : ""}`}>
                          <strong>{lesson.className}</strong>
                          <span>{lesson.subjectName}</span>
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

function TeacherDayScheduleTable({
  lessons,
  selectedDay,
  today,
  dayLessons,
  activeLessonId,
  onSelectDay
}: {
  lessons: Lesson[];
  selectedDay: number;
  today: number;
  dayLessons: Lesson[];
  activeLessonId?: string;
  onSelectDay: (day: number) => void;
}) {
  const daysWithLessons = SCHOOL_WEEK_DAYS.filter((day) => lessons.some((lesson) => lesson.dayOfWeek === day));

  return (
    <>
      <div className="teacher-day-toolbar" role="tablist" aria-label="Gün seçimi">
        {daysWithLessons.map((day) => (
          <button
            key={day}
            className={`teacher-day-chip${selectedDay === day ? " is-selected" : ""}${day === today ? " is-today" : ""}`}
            type="button"
            role="tab"
            aria-selected={selectedDay === day}
            onClick={() => onSelectDay(day)}
          >
            {weekdayLabel(day)} ({lessonsForDay(lessons, day).length})
          </button>
        ))}
      </div>

      {dayLessons.length === 0 ? (
        <p className="teacher-lessons-empty">{weekdayLabel(selectedDay)} günü için ders yok.</p>
      ) : (
        <div className="teacher-day-table-wrap">
          <table className="teacher-day-table">
            <thead>
              <tr>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th>Sınıf</th>
                <th>Ders</th>
                <th>Derslik</th>
              </tr>
            </thead>
            <tbody>
              {dayLessons.map((lesson) => (
                <tr key={lesson.id} className={lesson.id === activeLessonId ? "is-active" : ""}>
                  <td className="teacher-day-time">{lesson.startTime}</td>
                  <td className="teacher-day-time">{lesson.endTime}</td>
                  <td>
                    <span className="teacher-day-primary">{lesson.className}</span>
                  </td>
                  <td>
                    <span className="teacher-day-primary">{lesson.subjectName}</span>
                    {lesson.id === activeLessonId ? (
                      <span className="teacher-day-secondary">Aktif ders</span>
                    ) : null}
                  </td>
                  <td>
                    <span className="teacher-day-secondary">{lesson.room || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
