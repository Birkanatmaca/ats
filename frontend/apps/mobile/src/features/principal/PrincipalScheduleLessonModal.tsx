import { BookOpen, CalendarDays, Clock3, DoorOpen, MapPin, UserRound } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getClassTone } from "@/features/principal/classUtils";
import type { Lesson, UserAccount } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { SCHEDULE_TIME_SLOTS, SCHOOL_WEEK_DAYS, weekdayLabel } from "@/shared/utils/lessonSchedule";

type Props = {
  visible: boolean;
  lesson: Lesson | null;
  teachers: UserAccount[];
  editable: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    teacherId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string;
  }) => Promise<void>;
};

function teacherInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function PrincipalScheduleLessonModal({ visible, lesson, teachers, editable, saving, onClose, onSave }: Props) {
  const [teacherId, setTeacherId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:40");
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeTeachers = useMemo(
    () => teachers.filter((item) => item.status === "active").sort((a, b) => a.fullName.localeCompare(b.fullName, "tr")),
    [teachers]
  );

  const selectedTeacher = activeTeachers.find((item) => item.id === teacherId);

  useEffect(() => {
    if (!visible || !lesson) return;
    setTeacherId(lesson.teacherId);
    setDayOfWeek(lesson.dayOfWeek);
    setStartTime(lesson.startTime.slice(0, 5));
    setEndTime(lesson.endTime.slice(0, 5));
    setRoom(lesson.room ?? "");
    setError(null);
  }, [visible, lesson]);

  function pickSlot(start: string, end: string) {
    setStartTime(start);
    setEndTime(end);
  }

  async function handleSave() {
    if (!lesson || !editable) return;
    if (!teacherId) {
      setError("Öğretmen seçin.");
      return;
    }
    setError(null);
    try {
      await onSave({ teacherId, dayOfWeek, startTime, endTime, room: room.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ders güncellenemedi.");
    }
  }

  const tone = lesson ? getClassTone(lesson.className) : getClassTone("");
  const sheetTitle = editable ? "Ders düzenle" : "Ders detayı";
  const sheetSubtitle = lesson ? `${lesson.className} · ${lesson.subjectName}` : "";

  return (
    <BottomSheet
      footer={
        editable ? (
          <View style={styles.footerRow}>
            <Pressable disabled={saving} onPress={onClose} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
              <Text style={styles.secondaryBtnText}>Vazgeç</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => void handleSave()}
              style={({ pressed }) => [styles.primaryBtn, saving && styles.primaryBtnDisabled, pressed && styles.btnPressed]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Kaydet</Text>}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={onClose} style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}>
            <Text style={styles.primaryBtnText}>Kapat</Text>
          </Pressable>
        )
      }
      headerAccessory={
        lesson ? (
          <View style={[styles.headerIcon, { backgroundColor: tone.bg }]}>
            <BookOpen color={tone.color} size={22} strokeWidth={2.2} />
          </View>
        ) : null
      }
      onClose={onClose}
      subtitle={sheetSubtitle}
      title={sheetTitle}
      visible={visible}
    >
      {!lesson ? null : (
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!editable ? (
            <View style={styles.readOnlyBanner}>
              <Text style={styles.readOnlyTitle}>Salt okunur</Text>
              <Text style={styles.readOnlyText}>Yayınlanmış program düzenlenemez. Değişiklik için yeni taslak oluşturun.</Text>
            </View>
          ) : null}

          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={[styles.summaryBadge, { backgroundColor: tone.badge }]}>
                <Text style={[styles.summaryBadgeText, { color: tone.color }]}>{lesson.subjectName.slice(0, 1)}</Text>
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summarySubject}>{lesson.subjectName}</Text>
                <Text style={styles.summaryClass}>{lesson.className}</Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryPill icon={CalendarDays} label="Gün" value={weekdayLabel(dayOfWeek)} />
              <SummaryPill icon={Clock3} label="Saat" value={`${startTime} – ${endTime}`} />
              <SummaryPill icon={UserRound} label="Öğretmen" value={selectedTeacher?.fullName ?? lesson.teacherName} />
              <SummaryPill icon={MapPin} label="Oda" value={room.trim() || "Belirtilmedi"} />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Gün seçimi</Text>
            <View style={styles.dayGrid}>
              {SCHOOL_WEEK_DAYS.map((day) => {
                const active = dayOfWeek === day;
                return (
                  <Pressable
                    key={day}
                    disabled={!editable}
                    onPress={() => setDayOfWeek(day)}
                    style={({ pressed }) => [
                      styles.dayCell,
                      active && styles.dayCellActive,
                      !editable && styles.cellDisabled,
                      pressed && editable && styles.cellPressed
                    ]}
                  >
                    <Text style={[styles.dayCellShort, active && styles.dayCellTextActive]}>{weekdayLabel(day).slice(0, 3)}</Text>
                    <Text style={[styles.dayCellFull, active && styles.dayCellSubActive]} numberOfLines={1}>
                      {weekdayLabel(day)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.formSectionTitle}>Ders saati</Text>
              <View style={styles.timeBadge}>
                <Clock3 color={colors.accent} size={12} strokeWidth={2.4} />
                <Text style={styles.timeBadgeText}>
                  {startTime} – {endTime}
                </Text>
              </View>
            </View>
            <View style={styles.timeGrid}>
              {SCHEDULE_TIME_SLOTS.map((slot) => {
                const active = startTime === slot.start;
                return (
                  <Pressable
                    key={slot.start}
                    disabled={!editable}
                    onPress={() => pickSlot(slot.start, slot.end)}
                    style={({ pressed }) => [
                      styles.timeCell,
                      active && styles.timeCellActive,
                      !editable && styles.cellDisabled,
                      pressed && editable && styles.cellPressed
                    ]}
                  >
                    <Text style={[styles.timeCellStart, active && styles.timeCellTextActive]}>{slot.label}</Text>
                    <Text style={[styles.timeCellEnd, active && styles.timeCellSubActive]}>{slot.end}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Öğretmen</Text>
            <View style={styles.teacherList}>
              {activeTeachers.map((teacher) => {
                const active = teacherId === teacher.id;
                return (
                  <Pressable
                    key={teacher.id}
                    disabled={!editable}
                    onPress={() => setTeacherId(teacher.id)}
                    style={({ pressed }) => [
                      styles.teacherRow,
                      active && styles.teacherRowActive,
                      !editable && styles.cellDisabled,
                      pressed && editable && styles.cellPressed
                    ]}
                  >
                    <View style={[styles.teacherAvatar, active && styles.teacherAvatarActive]}>
                      <Text style={[styles.teacherAvatarText, active && styles.teacherAvatarTextActive]}>
                        {teacherInitials(teacher.fullName)}
                      </Text>
                    </View>
                    <View style={styles.teacherCopy}>
                      <Text style={[styles.teacherName, active && styles.teacherNameActive]} numberOfLines={1}>
                        {teacher.fullName}
                      </Text>
                      <Text style={styles.teacherEmail} numberOfLines={1}>
                        {teacher.email}
                      </Text>
                    </View>
                    {active ? <View style={styles.checkDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Oda / salon</Text>
            <View style={styles.roomField}>
              <DoorOpen color={colors.textMuted} size={18} strokeWidth={2.2} />
              <TextInput
                editable={editable}
                onChangeText={setRoom}
                placeholder="Örn. 201, Fen laboratuvarı"
                placeholderTextColor={colors.textMuted}
                style={[styles.roomInput, !editable && styles.roomInputDisabled]}
                value={room}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </BottomSheet>
  );
}

function SummaryPill({
  icon: Icon,
  label,
  value
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryPill}>
      <View style={styles.summaryPillIcon}>
        <Icon color={colors.accent} size={14} strokeWidth={2.2} />
      </View>
      <Text style={styles.summaryPillLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.summaryPillValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 14
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12
  },
  errorText: { fontSize: 13, color: colors.danger, fontWeight: "700", lineHeight: 18 },
  readOnlyBanner: {
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 14,
    gap: 4
  },
  readOnlyTitle: { fontSize: 13, fontWeight: "800", color: "#9a3412" },
  readOnlyText: { fontSize: 13, color: "#c2410c", lineHeight: 18, fontWeight: "500" },
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14
  },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  summaryBadgeText: { fontSize: 20, fontWeight: "800" },
  summaryCopy: { flex: 1, gap: 2 },
  summarySubject: { fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.2 },
  summaryClass: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryPill: {
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 4
  },
  summaryPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  summaryPillLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.3 },
  summaryPillValue: { fontSize: 13, fontWeight: "700", color: colors.text, lineHeight: 17 },
  formSection: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryLight,
    letterSpacing: 0.2
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  timeBadgeText: { fontSize: 11, fontWeight: "800", color: colors.accent },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  dayCell: {
    width: "31%",
    flexGrow: 1,
    minWidth: "30%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2
  },
  dayCellActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  dayCellShort: { fontSize: 14, fontWeight: "800", color: colors.text },
  dayCellFull: { fontSize: 10, fontWeight: "600", color: colors.textMuted },
  dayCellTextActive: { color: "#fff" },
  dayCellSubActive: { color: "rgba(255,255,255,0.78)" },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  timeCell: {
    width: "23%",
    flexGrow: 1,
    minWidth: "22%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 2
  },
  timeCellActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent
  },
  timeCellStart: { fontSize: 13, fontWeight: "800", color: colors.text },
  timeCellEnd: { fontSize: 9, fontWeight: "600", color: colors.textMuted },
  timeCellTextActive: { color: colors.accent },
  timeCellSubActive: { color: colors.primaryLight },
  teacherList: { gap: 8 },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12
  },
  teacherRowActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent
  },
  teacherAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  teacherAvatarActive: { backgroundColor: "#fff" },
  teacherAvatarText: { fontSize: 14, fontWeight: "800", color: colors.textMuted },
  teacherAvatarTextActive: { color: colors.accent },
  teacherCopy: { flex: 1, gap: 2 },
  teacherName: { fontSize: 14, fontWeight: "700", color: colors.text },
  teacherNameActive: { color: colors.primaryLight },
  teacherEmail: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accent
  },
  roomField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4
  },
  roomInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
    fontWeight: "500"
  },
  roomInputDisabled: { color: colors.textMuted },
  cellDisabled: { opacity: 0.72 },
  cellPressed: { opacity: 0.88 },
  footerRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "800", color: colors.text },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    flexDirection: "row",
    gap: 8
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  btnPressed: { opacity: 0.9 }
});
