import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { UserAccount } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { SCHEDULE_TIME_SLOTS, SCHOOL_WEEK_DAYS, weekdayLabel } from "@/shared/utils/lessonSchedule";

function slotKey(day: number, start: string) {
  return `${day}-${start}`;
}

export function PrincipalTeacherAvailabilityPanel({ teachers }: { teachers: UserAccount[] }) {
  const queryClient = useQueryClient();
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const availQ = useQuery({
    queryKey: queryKeys.teacherAvailabilities,
    queryFn: () => api.listTeacherAvailabilities()
  });

  const activeTeacherId = selectedTeacherId || teachers[0]?.id || "";

  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of availQ.data ?? []) {
      if (item.teacherUserId !== activeTeacherId && item.teacherId !== activeTeacherId) continue;
      keys.add(slotKey(item.dayOfWeek, item.startTime.slice(0, 5)));
    }
    return keys;
  }, [availQ.data, activeTeacherId]);

  const [draftKeys, setDraftKeys] = useState<Set<string> | null>(null);

  const workingKeys = draftKeys ?? selectedKeys;

  const saveMut = useMutation({
    mutationFn: async () => {
      const allTeachers = teachers.filter((t) => t.id);
      const items: Array<{
        teacherId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        availabilityType: string;
      }> = [];

      for (const teacher of allTeachers) {
        const keysForTeacher = teacher.id === activeTeacherId ? workingKeys : new Set(
          (availQ.data ?? [])
            .filter((row) => row.teacherUserId === teacher.id || row.teacherId === teacher.id)
            .map((row) => slotKey(row.dayOfWeek, row.startTime.slice(0, 5)))
        );
        for (const key of keysForTeacher) {
          const [dayText, start] = key.split("-");
          const day = Number(dayText);
          const slot = SCHEDULE_TIME_SLOTS.find((s) => s.start === start);
          if (!slot) continue;
          items.push({
            teacherId: teacher.id,
            dayOfWeek: day,
            startTime: slot.start,
            endTime: slot.end,
            availabilityType: "available"
          });
        }
      }
      return api.saveTeacherAvailabilitiesBulk(items);
    },
    onSuccess: () => {
      setDraftKeys(null);
      setMessage("Müsaitlik kaydedildi.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacherAvailabilities });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Kayıt başarısız.")
  });

  function toggleSlot(day: number, start: string) {
    const key = slotKey(day, start);
    setDraftKeys((current) => {
      const base = current ? new Set(current) : new Set(selectedKeys);
      if (base.has(key)) base.delete(key);
      else base.add(key);
      return base;
    });
    setMessage(null);
  }

  function fillWeekdays() {
    const next = new Set<string>();
    for (const day of SCHOOL_WEEK_DAYS) {
      if (day > 5) continue;
      for (const slot of SCHEDULE_TIME_SLOTS) {
        next.add(slotKey(day, slot.start));
      }
    }
    setDraftKeys(next);
  }

  const teacherName = teachers.find((t) => t.id === activeTeacherId)?.fullName ?? "Öğretmen";

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Öğretmen müsaitlik</Text>
      <Text style={styles.hint}>Tablet/geniş ekranda hücrelere dokunarak müsait saatleri işaretleyin.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teacherRow}>
        {teachers.map((teacher) => {
          const active = teacher.id === activeTeacherId;
          return (
            <Pressable
              key={teacher.id}
              onPress={() => {
                setSelectedTeacherId(teacher.id);
                setDraftKeys(null);
              }}
              style={[styles.teacherChip, active && styles.teacherChipActive]}
            >
              <Text style={[styles.teacherChipText, active && styles.teacherChipTextActive]} numberOfLines={1}>
                {teacher.fullName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.toolbar}>
        <Pressable onPress={fillWeekdays} style={styles.toolBtn}>
          <Text style={styles.toolBtnText}>Hafta içi tümü</Text>
        </Pressable>
        <Pressable onPress={() => setDraftKeys(new Set())} style={styles.toolBtn}>
          <Text style={styles.toolBtnText}>Temizle</Text>
        </Pressable>
      </View>

      <Text style={styles.gridTitle}>{teacherName}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <View style={styles.corner} />
            {SCHEDULE_TIME_SLOTS.map((slot) => (
              <View key={slot.start} style={styles.timeHead}>
                <Text style={styles.timeHeadText}>{slot.label}</Text>
              </View>
            ))}
          </View>
          {SCHOOL_WEEK_DAYS.filter((d) => d <= 5).map((day) => (
            <View key={day} style={styles.gridRow}>
              <View style={styles.dayHead}>
                <Text style={styles.dayHeadText}>{weekdayLabel(day)}</Text>
              </View>
              {SCHEDULE_TIME_SLOTS.map((slot) => {
                const active = workingKeys.has(slotKey(day, slot.start));
                return (
                  <Pressable
                    key={`${day}-${slot.start}`}
                    onPress={() => toggleSlot(day, slot.start)}
                    style={[styles.cell, active && styles.cellActive]}
                  >
                    <Text style={[styles.cellText, active && styles.cellTextActive]}>{active ? "✓" : ""}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable
        disabled={saveMut.isPending || !activeTeacherId}
        onPress={() => saveMut.mutate()}
        style={[styles.saveBtn, saveMut.isPending && styles.saveBtnDisabled]}
      >
        {saveMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Müsaitliği kaydet</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: { fontSize: 16, fontWeight: "800", color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  teacherRow: { gap: 8 },
  teacherChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 140
  },
  teacherChipActive: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  teacherChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  teacherChipTextActive: { color: colors.accent, fontWeight: "800" },
  toolbar: { flexDirection: "row", gap: 8 },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  toolBtnText: { fontSize: 12, fontWeight: "700", color: colors.accent },
  gridTitle: { fontSize: 14, fontWeight: "700", color: colors.primaryLight },
  grid: { gap: 6 },
  gridRow: { flexDirection: "row", gap: 6 },
  corner: { width: 64, height: 40 },
  timeHead: {
    width: 52,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  timeHeadText: { fontSize: 10, fontWeight: "800", color: colors.text },
  dayHead: {
    width: 64,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  dayHeadText: { fontSize: 11, fontWeight: "700", color: colors.text },
  cell: {
    width: 52,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  cellActive: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  cellText: { fontSize: 14, fontWeight: "800", color: colors.textMuted },
  cellTextActive: { color: colors.accent },
  message: { fontSize: 13, fontWeight: "600", color: colors.accent },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 }
});
