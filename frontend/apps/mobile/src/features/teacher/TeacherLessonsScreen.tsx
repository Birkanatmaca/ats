import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  LayoutGrid,
  List,
  MapPin,
  School,
  SlidersHorizontal
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { Lesson } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import {
  currentWeekday,
  formatLessonRange,
  isLessonInAttendanceWindow,
  lessonsForDay,
  SCHOOL_WEEK_DAYS,
  sortLessons,
  weekdayLabel
} from "@/shared/utils/lessonSchedule";

type ViewMode = "day" | "week";

function classTone(className: string) {
  const palette = [
    { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
    { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    { bg: "#faf5ff", border: "#ddd6fe", text: "#6d28d9" },
    { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" }
  ];
  let hash = 0;
  for (let i = 0; i < className.length; i += 1) hash = (hash + className.charCodeAt(i) * (i + 1)) % palette.length;
  return palette[hash] ?? palette[0];
}

export function TeacherLessonsScreen() {
  const router = useRouter();
  const today = currentWeekday();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDay, setSelectedDay] = useState(today === 0 ? 1 : today);
  const [classFilter, setClassFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");

  const calendarQ = useQuery({ queryKey: queryKeys.teacherCalendar, queryFn: () => api.teacherCalendar() });
  const currentQ = useQuery({ queryKey: queryKeys.teacherCurrentLesson, queryFn: () => api.currentLesson() });

  const lessons = useMemo(() => sortLessons(calendarQ.data ?? []), [calendarQ.data]);
  const activeLessonId = currentQ.data?.found ? currentQ.data.lesson?.id : undefined;

  const classOptions = useMemo(() => {
    const names = new Set(lessons.map((item) => item.className).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
  }, [lessons]);

  const stats = useMemo(() => {
    const classCount = new Set(lessons.map((item) => item.className)).size;
    const todayCount = lessonsForDay(lessons, today).length;
    return {
      weekly: lessons.length,
      classCount,
      todayCount,
      activeLabel: currentQ.data?.found ? (currentQ.data.lesson?.className ?? "Var") : "Yok"
    };
  }, [lessons, today, currentQ.data]);

  const defaultDay = useMemo(() => {
    if (lessons.some((item) => item.dayOfWeek === today)) return today === 0 ? 1 : today;
    return SCHOOL_WEEK_DAYS.find((day) => lessons.some((item) => item.dayOfWeek === day)) ?? 1;
  }, [lessons, today]);

  useEffect(() => {
    setSelectedDay((current) => (lessons.some((item) => item.dayOfWeek === current) ? current : defaultDay));
  }, [defaultDay, lessons]);

  const filterLesson = (item: Lesson) => {
    if (classFilter && item.className !== classFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const blob = `${item.className} ${item.subjectName} ${item.room} ${item.startTime}`.toLowerCase();
    return blob.includes(q);
  };

  const dayLessons = useMemo(
    () => lessonsForDay(lessons, selectedDay).filter(filterLesson),
    [lessons, selectedDay, classFilter, search]
  );

  const weekGrouped = useMemo(() => {
    return SCHOOL_WEEK_DAYS.map((day) => ({
      day,
      lessons: lessonsForDay(lessons, day).filter(filterLesson)
    })).filter((group) => group.lessons.length > 0);
  }, [lessons, classFilter, search]);

  const daysWithLessons = useMemo(
    () => SCHOOL_WEEK_DAYS.filter((day) => lessonsForDay(lessons, day).length > 0),
    [lessons]
  );

  if (calendarQ.isLoading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  if (calendarQ.isError) {
    return (
      <Screen>
        <ErrorState message={calendarQ.error.message} onRetry={() => void calendarQ.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen layout="tab" refreshing={calendarQ.isRefetching} topInsetExtra={6} onRefresh={() => void calendarQ.refetch()}>
      <View style={styles.heroShell}>
        <View
          style={[
            styles.hero,
            platformShadow("0 14px 32px rgba(5,150,105,0.22)", {
              shadowColor: "#059669",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              elevation: 8
            })
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <CalendarDays color="#a7f3d0" size={22} strokeWidth={2.4} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Derslerim</Text>
              <Text style={styles.heroSubtitle}>Haftalık program ve günlük ders akışı</Text>
            </View>
          </View>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.weekly}</Text>
              <Text style={styles.heroMetaLabel}>haftalık</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.todayCount}</Text>
              <Text style={styles.heroMetaLabel}>bugün</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.classCount}</Text>
              <Text style={styles.heroMetaLabel}>sınıf</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.viewToggle}>
        <Pressable
          onPress={() => setViewMode("day")}
          style={[styles.viewBtn, viewMode === "day" && styles.viewBtnActive]}
        >
          <List color={viewMode === "day" ? "#047857" : colors.textMuted} size={16} strokeWidth={2.2} />
          <Text style={[styles.viewBtnText, viewMode === "day" && styles.viewBtnTextActive]}>Günlük</Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode("week")}
          style={[styles.viewBtn, viewMode === "week" && styles.viewBtnActive]}
        >
          <LayoutGrid color={viewMode === "week" ? "#047857" : colors.textMuted} size={16} strokeWidth={2.2} />
          <Text style={[styles.viewBtnText, viewMode === "week" && styles.viewBtnTextActive]}>Haftalık</Text>
        </Pressable>
      </View>

      <View style={styles.filtersCard}>
        <View style={styles.searchFilterRow}>
          <View style={styles.searchWrap}>
            <School color="#059669" size={18} strokeWidth={2.2} />
            <TextInput
              onChangeText={setSearch}
              placeholder="Sınıf, ders veya derslik ara..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              value={search}
            />
          </View>
          <Pressable
            onPress={() => setFiltersOpen((current) => !current)}
            style={({ pressed }) => [
              styles.filterBtn,
              (filtersOpen || classFilter) && styles.filterBtnActive,
              pressed && styles.filterBtnPressed
            ]}
          >
            <SlidersHorizontal color={filtersOpen || classFilter ? "#059669" : colors.textMuted} size={18} strokeWidth={2.2} />
          </Pressable>
        </View>

        {filtersOpen && classOptions.length > 0 ? (
          <View style={styles.filtersPanel}>
            <Text style={styles.filterLabel}>Sınıf</Text>
            <View style={styles.chipRow}>
              <FilterChip active={!classFilter} label="Tümü" onPress={() => setClassFilter("")} />
              {classOptions.map((name) => (
                <FilterChip key={name} active={classFilter === name} label={name} onPress={() => setClassFilter(name)} />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {lessons.length === 0 ? (
        <EmptyState
          message="Yayınlanmış programda size atanmış ders bulunamadı."
          title="Ders programı boş"
        />
      ) : viewMode === "day" ? (
        <>
          <View style={styles.dayBar}>
            {(daysWithLessons.length > 0 ? daysWithLessons : SCHOOL_WEEK_DAYS).map((day) => {
              const count = lessonsForDay(lessons, day).length;
              const isToday = day === today;
              const isSelected = day === selectedDay;
              return (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={[styles.dayChip, isSelected && styles.dayChipActive, isToday && !isSelected && styles.dayChipToday]}
                >
                  <Text style={[styles.dayChipLabel, isSelected && styles.dayChipLabelActive]}>
                    {weekdayLabel(day).slice(0, 3)}
                  </Text>
                  <Text style={[styles.dayChipCount, isSelected && styles.dayChipCountActive]}>{count}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.listHead}>
            <Text style={styles.listTitle}>{weekdayLabel(selectedDay)}</Text>
            <Text style={styles.listCount}>{dayLessons.length} ders</Text>
          </View>

          {dayLessons.length === 0 ? (
            <EmptyState message="Bu gün ve filtreye uyan ders bulunamadı." title="Ders yok" />
          ) : (
            dayLessons.map((lesson, index) => (
              <LessonCard
                key={lesson.id}
                activeLessonId={activeLessonId}
                isLast={index === dayLessons.length - 1}
                lesson={lesson}
                onOpenAttendance={() => router.push("/(app)/teacher/(tabs)/attendance")}
              />
            ))
          )}
        </>
      ) : (
        <>
          <View style={styles.listHead}>
            <Text style={styles.listTitle}>Haftalık özet</Text>
            <Text style={styles.listCount}>{weekGrouped.reduce((sum, g) => sum + g.lessons.length, 0)} ders</Text>
          </View>

          {weekGrouped.length === 0 ? (
            <EmptyState message="Filtreye uyan ders bulunamadı." title="Sonuç yok" />
          ) : (
            weekGrouped.map((group) => (
              <View key={group.day} style={styles.weekSection}>
                <Pressable onPress={() => { setSelectedDay(group.day); setViewMode("day"); }} style={styles.weekSectionHead}>
                  <Text style={styles.weekSectionTitle}>
                    {weekdayLabel(group.day)}
                    {group.day === today ? " · Bugün" : ""}
                  </Text>
                  <View style={styles.weekSectionLink}>
                    <Text style={styles.weekSectionCount}>{group.lessons.length} ders</Text>
                    <ChevronRight color="#059669" size={14} strokeWidth={2.4} />
                  </View>
                </Pressable>
                {group.lessons.map((lesson, index) => (
                  <LessonCard
                    key={lesson.id}
                    activeLessonId={activeLessonId}
                    compact
                    isLast={index === group.lessons.length - 1}
                    lesson={lesson}
                    onOpenAttendance={() => router.push("/(app)/teacher/(tabs)/attendance")}
                  />
                ))}
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function LessonCard({
  lesson,
  activeLessonId,
  onOpenAttendance,
  isLast,
  compact
}: {
  lesson: Lesson;
  activeLessonId?: string;
  onOpenAttendance: () => void;
  isLast: boolean;
  compact?: boolean;
}) {
  const tone = classTone(lesson.className);
  const isActive = lesson.id === activeLessonId;
  const windowOpen = isLessonInAttendanceWindow(lesson);

  return (
    <View style={styles.timelineRow}>
      {!compact ? (
        <View style={styles.timelineCol}>
          <View style={[styles.timelineDot, isActive && styles.timelineDotActive]} />
          {!isLast ? <View style={styles.timelineLine} /> : null}
        </View>
      ) : null}

      <Pressable
        onPress={onOpenAttendance}
        style={({ pressed }) => [
          styles.lessonCard,
          { backgroundColor: tone.bg, borderColor: tone.border },
          isActive && styles.lessonCardActive,
          pressed && styles.lessonCardPressed,
          compact && styles.lessonCardCompact
        ]}
      >
        <View style={styles.lessonTop}>
          <View style={styles.timeBlock}>
            <Text style={[styles.timeStart, { color: tone.text }]}>{lesson.startTime.slice(0, 5)}</Text>
            <Text style={styles.timeEnd}>{lesson.endTime.slice(0, 5)}</Text>
          </View>
          <View style={styles.lessonMain}>
            <Text numberOfLines={1} style={styles.lessonTitle}>
              {lesson.className} · {lesson.subjectName}
            </Text>
            <View style={styles.metaRow}>
              <Clock color={colors.textMuted} size={11} strokeWidth={2.2} />
              <Text style={styles.lessonMeta}>{formatLessonRange(lesson)}</Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin color={colors.textMuted} size={11} strokeWidth={2.2} />
              <Text style={styles.lessonMeta}>{lesson.room || "Derslik belirtilmedi"}</Text>
            </View>
          </View>
          <ChevronRight color={tone.text} size={16} strokeWidth={2.4} />
        </View>

        <View style={styles.badgeRow}>
          {isActive ? (
            <View style={[styles.badge, styles.badgeActive]}>
              <Text style={styles.badgeTextLight}>Aktif ders</Text>
            </View>
          ) : null}
          {windowOpen ? (
            <View style={[styles.badge, styles.badgeWindow]}>
              <Text style={styles.badgeTextWindow}>Yoklama açık</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginHorizontal: -4, marginBottom: 12 },
  hero: {
    backgroundColor: "#059669",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  heroSubtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "500" },
  heroMetaRow: { flexDirection: "row", alignItems: "center" },
  heroMetaPill: { flex: 1, alignItems: "center", gap: 2 },
  heroMetaValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroMetaLabel: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "600" },
  heroMetaDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.18)" },
  viewToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4
  },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10
  },
  viewBtnActive: { backgroundColor: "#ecfdf5" },
  viewBtnText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  viewBtnTextActive: { color: "#047857" },
  filtersCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
    marginBottom: 12
  },
  searchFilterRow: { flexDirection: "row", gap: 8 },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    minHeight: 44
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "500" },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  filterBtnActive: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  filterBtnPressed: { opacity: 0.88 },
  filtersPanel: { gap: 8 },
  filterLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background
  },
  chipActive: { backgroundColor: "#ecfdf5", borderColor: "#059669" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#047857" },
  dayBar: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  dayChip: {
    minWidth: 52,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2
  },
  dayChipActive: { backgroundColor: "#059669", borderColor: "#059669" },
  dayChipToday: { borderColor: "#6ee7b7", backgroundColor: "#ecfdf5" },
  dayChipLabel: { fontSize: 11, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase" },
  dayChipLabelActive: { color: "#fff" },
  dayChipCount: { fontSize: 13, fontWeight: "800", color: colors.text },
  dayChipCountActive: { color: "#fff" },
  listHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  listCount: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  weekSection: { marginBottom: 14, gap: 6 },
  weekSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4
  },
  weekSectionTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  weekSectionLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  weekSectionCount: { fontSize: 12, fontWeight: "700", color: "#059669" },
  timelineRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  timelineCol: { width: 16, alignItems: "center" },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#a7f3d0",
    borderWidth: 2,
    borderColor: "#059669",
    marginTop: 18
  },
  timelineDotActive: { backgroundColor: "#059669" },
  timelineLine: { flex: 1, width: 2, backgroundColor: "#d1fae5", marginTop: 4, marginBottom: -8 },
  lessonCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8
  },
  lessonCardCompact: { marginLeft: 0 },
  lessonCardActive: { borderWidth: 2, borderColor: "#059669" },
  lessonCardPressed: { opacity: 0.9 },
  lessonTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  timeBlock: { width: 48, alignItems: "center", gap: 2, paddingTop: 2 },
  timeStart: { fontSize: 14, fontWeight: "800" },
  timeEnd: { fontSize: 10, fontWeight: "600", color: colors.textMuted },
  lessonMain: { flex: 1, gap: 4 },
  lessonTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  lessonMeta: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeActive: { backgroundColor: "#059669" },
  badgeTextLight: { fontSize: 10, fontWeight: "800", color: "#fff" },
  badgeWindow: { backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fde68a" },
  badgeTextWindow: { fontSize: 10, fontWeight: "800", color: "#b45309" }
});
