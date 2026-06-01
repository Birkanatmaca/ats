import { useRouter } from "expo-router";
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, DoorOpen, Layers3, Search, UserX } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getClassTone, sortSections } from "@/features/principal/classUtils";
import { usePrincipalRoster } from "@/features/principal/usePrincipalRoster";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function isToday(iso: string) {
  return iso === todayIso();
}

export function PrincipalAttendanceScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [search, setSearch] = useState("");
  const rosterQ = usePrincipalRoster();
  const reportQ = useQuery({
    queryKey: queryKeys.principalAttendanceToday(date),
    queryFn: () => api.attendanceToday(date)
  });

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of rosterQ.data?.classes ?? []) {
      map.set(item.id, item.name);
    }
    return map;
  }, [rosterQ.data?.classes]);

  const sectionRows = useMemo(() => {
    const statusByStudent = new Map((reportQ.data?.records ?? []).map((r) => [r.studentId, r.status]));
    const studentsBySection = new Map<string, number>();
    const recordedBySection = new Map<string, number>();
    const absentBySection = new Map<string, number>();

    for (const student of rosterQ.data?.students ?? []) {
      if (!student.sectionId) continue;
      studentsBySection.set(student.sectionId, (studentsBySection.get(student.sectionId) ?? 0) + 1);
      const status = statusByStudent.get(student.id);
      if (!status || status === "unknown") continue;
      recordedBySection.set(student.sectionId, (recordedBySection.get(student.sectionId) ?? 0) + 1);
      if (status === "absent" || status === "late") {
        absentBySection.set(student.sectionId, (absentBySection.get(student.sectionId) ?? 0) + 1);
      }
    }

    const q = search.trim().toLocaleLowerCase("tr-TR");
    return sortSections(rosterQ.data?.sections ?? [])
      .map((section) => {
        const total = studentsBySection.get(section.id) ?? 0;
        const recorded = recordedBySection.get(section.id) ?? 0;
        const absent = absentBySection.get(section.id) ?? 0;
        const pct = total ? Math.round((recorded / total) * 100) : 0;
        const className = classNameById.get(section.classId) ?? section.gradeLevel;
        return { section, className, total, recorded, absent, pct };
      })
      .filter((row) => {
        if (!q) return true;
        return (
          row.className.toLocaleLowerCase("tr-TR").includes(q) ||
          row.section.name.toLocaleLowerCase("tr-TR").includes(q) ||
          row.section.gradeLevel.toLocaleLowerCase("tr-TR").includes(q)
        );
      });
  }, [rosterQ.data, reportQ.data, search, classNameById]);

  const stats = useMemo(() => {
    const totalStudents = sectionRows.reduce((sum, row) => sum + row.total, 0);
    const recorded = sectionRows.reduce((sum, row) => sum + row.recorded, 0);
    const absent = sectionRows.reduce((sum, row) => sum + row.absent, 0);
    const pct = totalStudents ? Math.round((recorded / totalStudents) * 100) : 0;
    const present = Math.max(recorded - absent, 0);
    return { sections: sectionRows.length, totalStudents, recorded, absent, present, pct };
  }, [sectionRows]);

  const refreshing = rosterQ.isRefetching || reportQ.isRefetching;
  const onRefresh = () => {
    void rosterQ.refetch();
    void reportQ.refetch();
  };

  if (rosterQ.isLoading || reportQ.isLoading) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Daha Fazla" />
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen layout="stack" refreshing={refreshing} topInsetExtra={6} onRefresh={onRefresh}>
      <DetailBackBar label="Daha Fazla" />
      <View style={styles.statsShell}>
        <View
          style={[
            styles.statsCard,
            platformShadow("0 16px 36px rgba(28,53,87,0.10)", {
              shadowColor: "#6366f1",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 6
            })
          ]}
        >
          <View pointerEvents="none" style={[styles.statsBlob, styles.statsBlobMint]} />
          <View pointerEvents="none" style={[styles.statsBlob, styles.statsBlobRose]} />
          <View pointerEvents="none" style={[styles.statsBlob, styles.statsBlobSky]} />

          <View style={styles.statsHeader}>
            <View style={styles.statsHeaderCopy}>
              <Text style={styles.statsEyebrow}>Günlük özet</Text>
              <Text style={styles.statsTitle}>Yoklama durumu</Text>
            </View>
            <View style={styles.statsRingWrap}>
              <View style={styles.statsRingTrack} />
              <View
                style={[
                  styles.statsRingArc,
                  {
                    borderTopColor: stats.pct > 0 ? "#22c55e" : "transparent",
                    borderRightColor: stats.pct > 24 ? "#22c55e" : "transparent",
                    borderBottomColor: stats.pct > 49 ? "#22c55e" : "transparent",
                    borderLeftColor: stats.pct > 74 ? "#22c55e" : "transparent"
                  }
                ]}
              />
              <View style={styles.statsRingCore}>
                <Text style={styles.statsRingValue}>{stats.pct}%</Text>
                <Text style={styles.statsRingLabel}>tamam</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsProgressTrack}>
            <View style={[styles.statsProgressFill, { width: `${stats.pct}%` }]} />
          </View>
          <Text style={styles.statsProgressCaption}>
            {stats.recorded}/{stats.totalStudents} öğrenci işaretlendi
          </Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statTile, styles.statTileGreen]}>
              <View style={[styles.statIconWrap, styles.statIconGreen]}>
                <CircleCheck color="#15803d" size={18} strokeWidth={2.4} />
              </View>
              <Text style={[styles.statValue, styles.statValueGreen]}>{stats.present}</Text>
              <Text style={styles.statLabel}>Geldi</Text>
            </View>

            <View style={[styles.statTile, styles.statTileRose]}>
              <View style={[styles.statIconWrap, styles.statIconRose]}>
                <UserX color="#be123c" size={18} strokeWidth={2.4} />
              </View>
              <Text style={[styles.statValue, styles.statValueRose]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Devamsız</Text>
            </View>

            <View style={[styles.statTile, styles.statTileIndigo]}>
              <View style={[styles.statIconWrap, styles.statIconIndigo]}>
                <Layers3 color="#4338ca" size={18} strokeWidth={2.4} />
              </View>
              <Text style={[styles.statValue, styles.statValueIndigo]}>{stats.sections}</Text>
              <Text style={styles.statLabel}>Şube</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.dateRow}>
        <Pressable onPress={() => setDate((current) => shiftDate(current, -1))} style={styles.dateNavBtn}>
          <ChevronLeft color={colors.primary} size={20} />
        </Pressable>
        <View style={styles.dateCenter}>
          <CalendarDays color={colors.primary} size={16} />
          <Text style={styles.dateLabel}>{formatDisplayDate(date)}</Text>
          {isToday(date) ? <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Bugün</Text></View> : null}
        </View>
        <Pressable onPress={() => setDate((current) => shiftDate(current, 1))} style={styles.dateNavBtn}>
          <ChevronRight color={colors.primary} size={20} />
        </Pressable>
      </View>

      {!isToday(date) ? (
        <Pressable onPress={() => setDate(todayIso())} style={styles.todayJump}>
          <Text style={styles.todayJumpText}>Bugüne dön</Text>
        </Pressable>
      ) : null}

      <View style={styles.searchWrap}>
        <Search color={colors.textMuted} size={18} />
        <TextInput
          onChangeText={setSearch}
          placeholder="Sınıf veya şube ara..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={search}
        />
      </View>

      {reportQ.isError ? <ErrorState message={reportQ.error.message} onRetry={onRefresh} /> : null}
      {rosterQ.isError ? <ErrorState message={rosterQ.error.message} onRetry={onRefresh} /> : null}

      <Text style={styles.sectionHeading}>Şube listesi</Text>

      {sectionRows.map(({ section, className, total, recorded, absent, pct }) => {
        const tone = getClassTone(className);
        return (
          <Pressable
            key={section.id}
            onPress={() =>
              router.push({
                pathname: "/(app)/principal/attendance/[classId]",
                params: { classId: section.classId, date, sectionName: section.name, className }
              })
            }
            style={({ pressed }) => [styles.sectionCard, pressed && styles.sectionCardPressed]}
          >
            <View style={[styles.sectionBadge, { backgroundColor: tone.badge }]}>
              <Text style={[styles.sectionBadgeText, { color: tone.color }]}>{section.name}</Text>
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.sectionTitle}>{className}</Text>
              <Text style={styles.sectionMeta}>
                {recorded}/{total} işaretlendi · {absent} devamsız
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: tone.color }]} />
              </View>
            </View>
            <DoorOpen color={colors.textMuted} size={18} />
          </Pressable>
        );
      })}

      {sectionRows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Şube bulunamadı</Text>
          <Text style={styles.emptyText}>Arama kriterlerinizi değiştirin veya sınıf kayıtlarını kontrol edin.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsShell: { marginBottom: 14 },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    overflow: "hidden"
  },
  statsBlob: {
    position: "absolute",
    borderRadius: 999
  },
  statsBlobMint: {
    width: 120,
    height: 120,
    top: -36,
    right: -24,
    backgroundColor: "rgba(34,197,94,0.10)"
  },
  statsBlobRose: {
    width: 88,
    height: 88,
    bottom: -18,
    left: -16,
    backgroundColor: "rgba(244,63,94,0.10)"
  },
  statsBlobSky: {
    width: 64,
    height: 64,
    top: 72,
    right: 48,
    backgroundColor: "rgba(99,102,241,0.08)"
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14
  },
  statsHeaderCopy: { flex: 1, gap: 2 },
  statsEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  statsTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  statsRingWrap: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center"
  },
  statsRingTrack: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    borderColor: "#e2e8f0"
  },
  statsRingArc: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    transform: [{ rotate: "-45deg" }]
  },
  statsRingCore: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center"
  },
  statsRingValue: { fontSize: 16, fontWeight: "800", color: "#15803d" },
  statsRingLabel: { fontSize: 9, fontWeight: "700", color: "#16a34a", marginTop: -1 },
  statsProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
    overflow: "hidden",
    marginBottom: 6
  },
  statsProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#22c55e"
  },
  statsProgressCaption: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 14
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10
  },
  statTile: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1
  },
  statTileGreen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0"
  },
  statTileRose: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3"
  },
  statTileIndigo: {
    backgroundColor: "#eef2ff",
    borderColor: "#c7d2fe"
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  statIconGreen: { backgroundColor: "#dcfce7" },
  statIconRose: { backgroundColor: "#ffe4e6" },
  statIconIndigo: { backgroundColor: "#e0e7ff" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statValueGreen: { color: "#15803d" },
  statValueRose: { color: "#be123c" },
  statValueIndigo: { color: "#4338ca" },
  statLabel: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10
  },
  dateNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  dateCenter: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  dateLabel: { fontSize: 13, fontWeight: "700", color: colors.text, flexShrink: 1 },
  todayBadge: {
    backgroundColor: colors.accentLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  todayBadgeText: { fontSize: 10, fontWeight: "700", color: colors.accent },
  todayJump: { alignSelf: "flex-start", marginBottom: 10 },
  todayJumpText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 46,
    marginBottom: 14
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: 10 },
  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10
  },
  sectionCardPressed: { opacity: 0.92 },
  sectionBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  sectionBadgeText: { fontSize: 16, fontWeight: "800" },
  sectionBody: { flex: 1, gap: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  sectionMeta: { fontSize: 12, color: colors.textMuted },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: 4
  },
  progressFill: { height: "100%", borderRadius: 999 },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginTop: 6, lineHeight: 18 }
});
