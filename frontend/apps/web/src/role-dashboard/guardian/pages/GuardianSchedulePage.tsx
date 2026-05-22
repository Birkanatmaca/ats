import { CalendarDays, Clock3, Download, LayoutGrid, List, Printer, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { GuidanceKpiCard } from "../../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../../guidance/components/GuidanceMetricGrid";
import "../../guidance/GuidanceDataPage.css";
import "../../guidance/GuidanceSurface.css";
import { currentWeekday, lessonsForDay, sortLessons, weekdayLabel } from "../../teacher/utils/lessonSchedule";
import "../../teacher/TeacherLessonsPage.css";
import { GuardianLessonList } from "../components/GuardianLessonList";
import { GuardianWeekScheduleCalendar } from "../components/GuardianWeekScheduleCalendar";
import type { GuardianChild, GuardianData } from "../types";
import { downloadGuardianSchedule, printGuardianSchedule } from "../utils/scheduleExport";
import "../GuardianSchedulePage.css";

type ScheduleView = "week" | "list";

export function GuardianSchedulePage({ child, lessons: rawLessons }: { child: GuardianChild; lessons: GuardianData["scheduleLessons"] }) {
  const [view, setView] = useState<ScheduleView>("week");
  const lessons = useMemo(() => sortLessons(rawLessons), [rawLessons]);
  const today = currentWeekday();
  const subjectCount = useMemo(() => new Set(lessons.map((lesson) => lesson.subjectName)).size, [lessons]);
  const todayCount = lessonsForDay(lessons, today).length;

  function handleDownload() {
    downloadGuardianSchedule(lessons, child);
  }

  function handlePrint() {
    printGuardianSchedule();
  }

  return (
    <section className="guidance-page-stack guidance-surface-page guidance-data-page guardian-schedule-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<LayoutGrid size={20} />} label="Haftalık ders" value={lessons.length} detail="Yayınlanmış program" tone="sky" />
        <GuidanceKpiCard icon={<CalendarDays size={20} />} label="Farklı ders" value={subjectCount} detail={child.className} tone="emerald" />
        <GuidanceKpiCard icon={<Clock3 size={20} />} label="Bugün" value={todayCount} detail={weekdayLabel(today)} tone="amber" />
        <GuidanceKpiCard icon={<UserRound size={20} />} label="Öğrenci" value={child.fullName.split(" ")[0] || child.fullName} detail={`No ${child.schoolNumber}`} tone="violet" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card guardian-schedule-card" id="guardian-schedule-print-area">
        <div className="guardian-schedule-print-header">
          <strong>{child.fullName}</strong>
          <span>
            {child.className} · {child.tenantName}
          </span>
        </div>

        <header className="guidance-data-card-head guardian-schedule-card-head">
          <div className="teacher-lessons-view-toggle guardian-schedule-view-toggle" role="tablist" aria-label="Program görünümü">
            <button
              className={view === "week" ? "is-active" : ""}
              type="button"
              role="tab"
              aria-selected={view === "week"}
              onClick={() => setView("week")}
            >
              <LayoutGrid size={14} aria-hidden />
              Haftalık takvim
            </button>
            <button
              className={view === "list" ? "is-active" : ""}
              type="button"
              role="tab"
              aria-selected={view === "list"}
              onClick={() => setView("list")}
            >
              <List size={14} aria-hidden />
              Liste
            </button>
          </div>

          <div className="guardian-schedule-actions">
            <button className="ghost-action small-action" type="button" onClick={handleDownload} disabled={lessons.length === 0}>
              <Download size={15} />
              Programı indir
            </button>
            <button className="ghost-action small-action" type="button" onClick={handlePrint} disabled={lessons.length === 0}>
              <Printer size={15} />
              Yazdır
            </button>
            <span className="guardian-schedule-count">{lessons.length} ders</span>
          </div>
        </header>

        {lessons.length === 0 ? (
          <p className="teacher-lessons-empty">Yayınlanmış ders programı bulunamadı.</p>
        ) : view === "week" ? (
          <GuardianWeekScheduleCalendar lessons={lessons} />
        ) : (
          <div className="guardian-schedule-list-wrap">
            <GuardianLessonList lessons={lessons} />
          </div>
        )}
      </article>
    </section>
  );
}
