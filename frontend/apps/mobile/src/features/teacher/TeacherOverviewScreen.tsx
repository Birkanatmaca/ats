import { useQuery } from "@tanstack/react-query";
import { TeacherActiveLessonCard } from "@/features/teacher/TeacherActiveLessonCard";
import { TeacherOgtaAiStrip } from "@/features/teacher/TeacherOgtaAiStrip";
import { TeacherOverviewStats } from "@/features/teacher/TeacherOverviewStats";
import { TeacherQuickActions } from "@/features/teacher/TeacherQuickActions";
import { TeacherRecentObservationsPanel } from "@/features/teacher/TeacherRecentObservationsPanel";
import { TeacherTodayLessonsPanel } from "@/features/teacher/TeacherTodayLessonsPanel";
import { TeacherWelcomeCard } from "@/features/teacher/TeacherWelcomeCard";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { useAuth } from "@/shared/auth/AuthContext";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import {
  currentWeekday,
  isLessonInAttendanceWindow,
  lessonsForDay,
  sortLessons
} from "@/shared/utils/lessonSchedule";

export function TeacherOverviewScreen() {
  const { session } = useAuth();
  const today = currentWeekday();

  const calendarQ = useQuery({ queryKey: queryKeys.teacherCalendar, queryFn: () => api.teacherCalendar() });
  const lessonQ = useQuery({ queryKey: queryKeys.teacherCurrentLesson, queryFn: () => api.currentLesson() });
  const obsQ = useQuery({ queryKey: queryKeys.teacherObservations, queryFn: () => api.observations() });
  const studentsQ = useQuery({ queryKey: queryKeys.teacherStudents, queryFn: () => api.teacherStudents() });

  const lessons = sortLessons(calendarQ.data ?? []);
  const todayLessons = lessonsForDay(lessons, today);
  const activeLesson = lessonQ.data?.found ? lessonQ.data.lesson : undefined;
  const focusLesson =
    activeLesson ??
    todayLessons.find((lesson) => isLessonInAttendanceWindow(lesson)) ??
    todayLessons[0] ??
    null;
  const focusLessonInWindow = focusLesson ? isLessonInAttendanceWindow(focusLesson) : false;

  const sessionQ = useQuery({
    queryKey: queryKeys.attendanceSession(focusLesson?.id ?? "none"),
    queryFn: () => api.getAttendanceSessionByLesson(focusLesson!.id),
    enabled: Boolean(focusLesson?.id && focusLessonInWindow),
    retry: false
  });

  const myObs = (obsQ.data ?? [])
    .filter((item) => item.authorId === session?.principal.userId || item.authorName === session?.principal.name)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingAttendance = (sessionQ.data?.records ?? []).filter((record) => record.status === "unknown").length;
  const attendanceTotal = sessionQ.data?.records.length ?? 0;

  const refreshing =
    calendarQ.isRefetching || lessonQ.isRefetching || obsQ.isRefetching || studentsQ.isRefetching || sessionQ.isRefetching;
  const onRefresh = () => {
    void calendarQ.refetch();
    void lessonQ.refetch();
    void obsQ.refetch();
    void studentsQ.refetch();
    if (focusLesson?.id && focusLessonInWindow) void sessionQ.refetch();
  };

  if (calendarQ.isLoading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} topInsetExtra={10} onRefresh={onRefresh}>
      <TeacherWelcomeCard />
      {calendarQ.isError ? <ErrorState message={calendarQ.error.message} onRetry={onRefresh} /> : null}

      <TeacherOverviewStats
        data={{
          todayLessonCount: todayLessons.length,
          activeClassLabel: focusLesson?.className ?? "—",
          pendingAttendance,
          attendanceTotal,
          observationCount: myObs.length,
          studentScopeCount: studentsQ.data?.length ?? 0
        }}
      />

      <TeacherActiveLessonCard
        lesson={focusLesson}
        loading={sessionQ.isFetching && focusLessonInWindow}
        pendingCount={pendingAttendance}
        reason={lessonQ.data?.reason}
        totalCount={attendanceTotal}
      />

      <TeacherOgtaAiStrip />
      <TeacherTodayLessonsPanel activeLessonId={activeLesson?.id} lessons={todayLessons} />
      <TeacherRecentObservationsPanel observations={myObs} />
      <TeacherQuickActions />
    </Screen>
  );
}
