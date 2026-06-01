import type { Lesson } from "@/shared/api/types";
import { getClassTone } from "@/features/principal/classUtils";
import { colors } from "@/shared/theme/colors";
import { platformShadow } from "@/shared/ui/platformShadow";
import { SCHEDULE_TIME_SLOTS, SCHOOL_WEEK_DAYS, weekdayLabel } from "@/shared/utils/lessonSchedule";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const SUBJECT_TONES: Record<string, { bg: string; border: string; text: string }> = {
  matematik: { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
  turkce: { bg: "#fdf2f8", border: "#f9a8d4", text: "#be185d" },
  fen: { bg: "#ecfdf5", border: "#6ee7b7", text: "#047857" },
  ingilizce: { bg: "#faf5ff", border: "#c4b5fd", text: "#6d28d9" },
  sosyal: { bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  beden: { bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
  muzik: { bg: "#fefce8", border: "#fde047", text: "#a16207" },
  gorsel: { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce" },
  din: { bg: "#f8fafc", border: "#cbd5e1", text: "#334155" }
};

function subjectTone(subjectName: string) {
  const key = subjectName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
  for (const [token, tone] of Object.entries(SUBJECT_TONES)) {
    if (key.includes(token)) return tone;
  }
  return { bg: colors.accentLight, border: colors.border, text: colors.accent };
}

export type SectionOption = {
  id: string;
  classId: string;
  label: string;
  className: string;
  sectionName: string;
};

type Props = {
  lessons: Lesson[];
  selectedSection: SectionOption | null;
  sectionOptions: SectionOption[];
  editable: boolean;
  onSelectSection: (section: SectionOption) => void;
  onSelectLesson: (lesson: Lesson) => void;
};

function lessonKey(dayOfWeek: number, startTime: string) {
  return `${dayOfWeek}-${startTime.slice(0, 5)}`;
}

function buildLessonMap(lessons: Lesson[]) {
  const map = new Map<string, Lesson>();
  for (const lesson of lessons) {
    map.set(lessonKey(lesson.dayOfWeek, lesson.startTime), lesson);
  }
  return map;
}

function visibleDays(lessons: Lesson[]) {
  const active = new Set(lessons.map((l) => l.dayOfWeek));
  const days = SCHOOL_WEEK_DAYS.filter((day) => active.has(day));
  return days.length > 0 ? days : ([1, 2, 3, 4, 5] as const);
}

function visibleSlots(lessons: Lesson[]) {
  const used = new Set(lessons.map((l) => l.startTime.slice(0, 5)));
  const fromTemplate = SCHEDULE_TIME_SLOTS.filter((slot) => used.has(slot.start));
  return fromTemplate.length > 0 ? fromTemplate : SCHEDULE_TIME_SLOTS.slice(0, 8);
}

export function PrincipalScheduleCalendar({
  lessons,
  selectedSection,
  sectionOptions,
  editable,
  onSelectSection,
  onSelectLesson
}: Props) {
  const classLessons = selectedSection ? lessons.filter((l) => l.classId === selectedSection.classId) : [];
  const lessonMap = buildLessonMap(classLessons);
  const days = visibleDays(classLessons);
  const slots = visibleSlots(classLessons);
  const tone = selectedSection ? getClassTone(selectedSection.className) : getClassTone("");

  return (
    <View style={styles.wrap}>
      <View style={styles.selectorHead}>
        <Text style={styles.selectorTitle}>Sınıf / şube</Text>
        <Text style={styles.selectorHint}>Takvimde görmek istediğiniz sınıfı seçin</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionRow}>
        {sectionOptions.map((section) => {
          const active = selectedSection?.id === section.id;
          const sectionTone = getClassTone(section.className);
          return (
            <Pressable
              key={section.id}
              onPress={() => onSelectSection(section)}
              style={({ pressed }) => [
                styles.sectionChip,
                { borderColor: active ? sectionTone.color : colors.border, backgroundColor: active ? sectionTone.bg : colors.surface },
                pressed && styles.sectionChipPressed
              ]}
            >
              <View style={[styles.sectionBadge, { backgroundColor: sectionTone.badge }]}>
                <Text style={[styles.sectionBadgeText, { color: sectionTone.color }]}>{section.sectionName}</Text>
              </View>
              <Text style={[styles.sectionChipLabel, active && { color: sectionTone.color }]} numberOfLines={1}>
                {section.className}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedSection ? (
        <View style={[styles.calendarCard, platformShadow("0 10px 24px rgba(28,53,87,0.08)", { elevation: 3 })]}>
          <View style={styles.calendarHead}>
            <View style={[styles.calendarBadge, { backgroundColor: tone.badge }]}>
              <Text style={[styles.calendarBadgeText, { color: tone.color }]}>{selectedSection.sectionName}</Text>
            </View>
            <View style={styles.calendarHeadCopy}>
              <Text style={styles.calendarTitle}>{selectedSection.className}</Text>
              <Text style={styles.calendarMeta}>
                {classLessons.length} ders · {days.length} gün
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
            <View style={styles.grid}>
              <View style={styles.gridRow}>
                <View style={[styles.cornerCell, styles.headCell]}>
                  <Text style={styles.cornerText}>Gün</Text>
                </View>
                {slots.map((slot) => (
                  <View key={slot.start} style={[styles.headCell, styles.timeHeadCell]}>
                    <Text style={styles.timeHeadLabel}>{slot.label}</Text>
                    <Text style={styles.timeHeadMeta}>{slot.end}</Text>
                  </View>
                ))}
              </View>

              {days.map((day) => (
                <View key={day} style={styles.gridRow}>
                  <View style={[styles.dayCell, styles.stickyDay]}>
                    <Text style={styles.dayShort}>{weekdayLabel(day).slice(0, 3)}</Text>
                    <Text style={styles.dayFull}>{weekdayLabel(day)}</Text>
                  </View>
                  {slots.map((slot) => {
                    const lesson = lessonMap.get(lessonKey(day, slot.start));
                    const cellTone = lesson ? subjectTone(lesson.subjectName) : null;
                    return (
                      <Pressable
                        key={`${day}-${slot.start}`}
                        disabled={!lesson}
                        onPress={() => lesson && onSelectLesson(lesson)}
                        style={({ pressed }) => [
                          styles.slotCell,
                          lesson
                            ? {
                                backgroundColor: cellTone?.bg,
                                borderColor: cellTone?.border
                              }
                            : styles.slotCellEmpty,
                          lesson && pressed && styles.slotCellPressed,
                          lesson && editable && styles.slotCellEditable
                        ]}
                      >
                        {lesson ? (
                          <>
                            <Text style={[styles.slotSubject, { color: cellTone?.text }]} numberOfLines={2}>
                              {lesson.subjectName}
                            </Text>
                            <Text style={styles.slotTeacher} numberOfLines={1}>
                              {lesson.teacherName.split(" ")[0]}
                            </Text>
                            {lesson.room ? (
                              <Text style={styles.slotRoom} numberOfLines={1}>
                                {lesson.room}
                              </Text>
                            ) : null}
                          </>
                        ) : (
                          <Text style={styles.slotEmptyText}>—</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.calendarFootnote}>
            {editable ? "Ders hücresine dokunarak düzenleyebilirsiniz." : "Yayınlanmış program salt okunur."}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sınıf seçin</Text>
          <Text style={styles.emptyHint}>Haftalık ders programını görmek için yukarıdan bir sınıf/şube seçin.</Text>
        </View>
      )}
    </View>
  );
}

const DAY_COL = 72;
const SLOT_COL = 92;
const SLOT_H = 78;

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  selectorHead: { gap: 4 },
  selectorTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  selectorHint: { fontSize: 12, color: colors.textMuted },
  sectionRow: { gap: 8, paddingRight: 8 },
  sectionChip: {
    width: 108,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 10,
    gap: 8
  },
  sectionChipPressed: { opacity: 0.9 },
  sectionBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  sectionBadgeText: { fontSize: 12, fontWeight: "800" },
  sectionChipLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12
  },
  calendarHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  calendarBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  calendarBadgeText: { fontSize: 14, fontWeight: "800" },
  calendarHeadCopy: { flex: 1, gap: 2 },
  calendarTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  calendarMeta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  gridScroll: { paddingBottom: 4 },
  grid: { gap: 6 },
  gridRow: { flexDirection: "row", gap: 6 },
  cornerCell: { width: DAY_COL, minHeight: 44, justifyContent: "center" },
  headCell: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  timeHeadCell: { width: SLOT_COL },
  cornerText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  timeHeadLabel: { fontSize: 12, fontWeight: "800", color: colors.text },
  timeHeadMeta: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },
  dayCell: {
    width: DAY_COL,
    minHeight: SLOT_H,
    justifyContent: "center",
    paddingHorizontal: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  stickyDay: { alignItems: "flex-start" },
  dayShort: { fontSize: 13, fontWeight: "800", color: colors.text },
  dayFull: { fontSize: 9, color: colors.textMuted, fontWeight: "600" },
  slotCell: {
    width: SLOT_COL,
    minHeight: SLOT_H,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 8,
    justifyContent: "center",
    gap: 2
  },
  slotCellEmpty: {
    backgroundColor: "#fafafa",
    borderColor: "#eef2f7",
    borderStyle: "dashed"
  },
  slotCellPressed: { opacity: 0.88 },
  slotCellEditable: { borderWidth: 2 },
  slotSubject: { fontSize: 11, fontWeight: "800", lineHeight: 14 },
  slotTeacher: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },
  slotRoom: { fontSize: 9, color: colors.accent, fontWeight: "700" },
  slotEmptyText: { textAlign: "center", color: "#cbd5e1", fontSize: 16, fontWeight: "700" },
  calendarFootnote: { fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    padding: 24,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  emptyHint: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 18 }
});
