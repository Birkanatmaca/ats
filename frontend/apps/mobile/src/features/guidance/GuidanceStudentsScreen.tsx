import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  School,
  Search,
  SlidersHorizontal,
  Users
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  buildGuidanceRiskSignals,
  buildGuidanceStudentSupports,
  supportStatusLabel
} from "@/features/guidance/utils";
import { getClassTone, sortClasses } from "@/features/principal/classUtils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { GuidanceStudent } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";

const PAGE_SIZE = 12;

type StatusFilter = "" | "active" | "passive";

function studentInitials(student: GuidanceStudent) {
  const parts = student.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function levelRank(level: string) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

export function GuidanceStudentsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterClassName, setFilterClassName] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const studentsQ = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });
  const obsQ = useQuery({ queryKey: queryKeys.guidanceObservations, queryFn: () => api.observationsFiltered() });
  const trackingsQ = useQuery({ queryKey: queryKeys.guidanceRiskTrackings, queryFn: () => api.guidanceRiskTrackings() });

  const riskSignals = useMemo(() => buildGuidanceRiskSignals(obsQ.data ?? []), [obsQ.data]);

  const trackedStudentIds = useMemo(() => new Set((trackingsQ.data ?? []).map((item) => item.studentId)), [trackingsQ.data]);

  const riskByStudent = useMemo(() => {
    const map = new Map<string, { level: string; count: number }>();
    for (const signal of riskSignals) {
      const existing = map.get(signal.studentId);
      const count = (existing?.count ?? 0) + 1;
      if (!existing || levelRank(signal.level) >= levelRank(existing.level)) {
        map.set(signal.studentId, { level: signal.level, count });
      } else if (existing) {
        map.set(signal.studentId, { ...existing, count });
      }
    }
    return map;
  }, [riskSignals]);

  const supportByStudent = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildGuidanceStudentSupports>[number]>();
    for (const item of buildGuidanceStudentSupports(obsQ.data ?? [])) {
      map.set(item.studentId, item);
    }
    return map;
  }, [obsQ.data]);

  const classOptions = useMemo(() => {
    const names = new Set((studentsQ.data ?? []).map((item) => item.className));
    return sortClasses([...names].map((name) => ({ name }))).map((item) => item.name);
  }, [studentsQ.data]);

  const stats = useMemo(() => {
    const students = studentsQ.data ?? [];
    const active = students.filter((item) => item.status === "active").length;
    const withRisk = students.filter((item) => trackedStudentIds.has(item.id)).length;
    return { total: students.length, active, classes: classOptions.length, withRisk };
  }, [studentsQ.data, classOptions.length, trackedStudentIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const students = [...(studentsQ.data ?? [])].sort((a, b) => {
      const classCmp = a.className.localeCompare(b.className, "tr", { numeric: true });
      if (classCmp !== 0) return classCmp;
      return a.fullName.localeCompare(b.fullName, "tr");
    });

    return students.filter((item) => {
      if (filterClassName && item.className !== filterClassName) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (!q) return true;
      const blob = `${item.fullName} ${item.className} ${item.schoolNumber}`.toLowerCase();
      return blob.includes(q);
    });
  }, [studentsQ.data, search, filterClassName, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const hasActiveFilters = Boolean(search.trim() || filterClassName || filterStatus);
  const activeFilterCount = Number(Boolean(filterClassName)) + Number(Boolean(filterStatus));
  const activeRate = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  useEffect(() => {
    setPage(1);
  }, [search, filterClassName, filterStatus]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const refreshing = studentsQ.isRefetching || obsQ.isRefetching;
  const onRefresh = () => {
    void studentsQ.refetch();
    void obsQ.refetch();
  };

  function clearFilters() {
    setSearch("");
    setFilterClassName("");
    setFilterStatus("");
  }

  if (studentsQ.isLoading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} topInsetExtra={6} onRefresh={onRefresh}>
      <View style={styles.heroShell}>
        <View
          style={[
            styles.hero,
            platformShadow("0 14px 32px rgba(124,58,237,0.22)", {
              shadowColor: "#7c3aed",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              elevation: 8
            })
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <Users color="#fff" size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Öğrenciler</Text>
              <Text style={styles.heroSubtitle}>Ara, öğrenciyi aç ve rehberlik işlemlerini yönet</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.total}</Text>
              <Text style={styles.heroMetaLabel}>toplam</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>%{activeRate}</Text>
              <Text style={styles.heroMetaLabel}>aktif</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.withRisk}</Text>
              <Text style={styles.heroMetaLabel}>risk takibinde</Text>
            </View>
          </View>
        </View>
      </View>

      {studentsQ.isError ? <ErrorState message={studentsQ.error.message} onRetry={onRefresh} /> : null}

      {!studentsQ.isError ? (
        <>
          <View style={styles.filtersCard}>
            <View style={styles.searchFilterRow}>
              <View style={styles.searchWrap}>
                <Search color={colors.textMuted} size={18} strokeWidth={2} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Ad, sınıf veya numara ara..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  value={search}
                />
              </View>

              <Pressable
                onPress={() => setFiltersOpen((current) => !current)}
                style={({ pressed }) => [
                  styles.filterBtn,
                  filtersOpen && styles.filterBtnActive,
                  pressed && styles.filterBtnPressed
                ]}
              >
                <SlidersHorizontal
                  color={filtersOpen || activeFilterCount > 0 ? "#7c3aed" : colors.textMuted}
                  size={18}
                  strokeWidth={2.2}
                />
                {activeFilterCount > 0 ? (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {filtersOpen ? (
              <View style={styles.filtersPanel}>
                <Text style={styles.filterLabel}>Sınıf</Text>
                <View style={styles.chipRow}>
                  <FilterChip active={!filterClassName} label="Tümü" onPress={() => setFilterClassName("")} />
                  {classOptions.map((name) => (
                    <FilterChip
                      key={name}
                      active={filterClassName === name}
                      label={name}
                      onPress={() => setFilterClassName(name)}
                    />
                  ))}
                </View>

                <Text style={styles.filterLabel}>Durum</Text>
                <View style={styles.chipRow}>
                  <FilterChip active={!filterStatus} label="Tümü" onPress={() => setFilterStatus("")} />
                  <FilterChip active={filterStatus === "active"} label="Aktif" onPress={() => setFilterStatus("active")} />
                  <FilterChip active={filterStatus === "passive"} label="Pasif" onPress={() => setFilterStatus("passive")} />
                </View>

                {hasActiveFilters ? (
                  <Pressable onPress={clearFilters} style={styles.clearFiltersBtn}>
                    <Text style={styles.clearFiltersText}>Filtreleri temizle</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.listHead}>
            <Text style={styles.listTitle}>Öğrenci listesi</Text>
            <Text style={styles.listCount}>{filtered.length} kayıt</Text>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              message={
                (studentsQ.data?.length ?? 0) === 0
                  ? "Rehberlik kapsamında öğrenci bulunamadı."
                  : "Arama veya filtreye uyan öğrenci yok."
              }
              title={(studentsQ.data?.length ?? 0) === 0 ? "Öğrenci yok" : "Sonuç bulunamadı"}
            />
          ) : (
            <>
              {paginated.map((student) => (
                <StudentRow
                  key={student.id}
                  onOpen={() => router.push(`/(app)/guidance/students/${student.id}`)}
                  signal={riskByStudent.get(student.id)}
                  status={supportByStudent.get(student.id)?.status ?? "untracked"}
                  student={student}
                  tracked={trackedStudentIds.has(student.id)}
                />
              ))}

              {totalPages > 1 ? (
                <View style={styles.pagination}>
                  <Pressable
                    disabled={page <= 1}
                    onPress={() => setPage((current) => Math.max(1, current - 1))}
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  >
                    <ChevronLeft color={page <= 1 ? colors.textMuted : "#7c3aed"} size={18} strokeWidth={2.4} />
                  </Pressable>
                  <Text style={styles.pageLabel}>
                    {page} / {totalPages}
                  </Text>
                  <Pressable
                    disabled={page >= totalPages}
                    onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  >
                    <ChevronRight color={page >= totalPages ? colors.textMuted : "#7c3aed"} size={18} strokeWidth={2.4} />
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </>
      ) : null}
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

function StudentRow({
  student,
  signal,
  status,
  tracked,
  onOpen
}: {
  student: GuidanceStudent;
  signal?: { level: string; count: number };
  status: string;
  tracked: boolean;
  onOpen: () => void;
}) {
  const isActive = student.status === "active";
  const tone = getClassTone(student.className);
  const statusTone =
    status === "review"
      ? { bg: "#fef2f2", text: "#b91c1c" }
      : status === "monitoring"
        ? { bg: "#faf5ff", text: "#6d28d9" }
        : status === "stable"
          ? { bg: "#ecfdf5", text: "#047857" }
          : { bg: "#f8fafc", text: "#64748b" };

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.studentRow, pressed && styles.studentRowPressed]}>
      <View style={[styles.avatar, { backgroundColor: tone.badge }, !isActive && styles.avatarPassive]}>
        <Text style={[styles.avatarText, { color: tone.color }]}>{studentInitials(student)}</Text>
      </View>

      <View style={styles.studentMain}>
        <Text numberOfLines={1} style={styles.studentName}>
          {student.fullName}
        </Text>
        <Text numberOfLines={1} style={styles.studentMeta}>
          No {student.schoolNumber}
        </Text>
        <View style={styles.rowBadges}>
          <View style={[styles.classBadge, { backgroundColor: tone.bg, borderColor: tone.badge }]}>
            <School color={tone.color} size={11} strokeWidth={2.2} />
            <Text numberOfLines={1} style={[styles.classBadgeText, { color: tone.color }]}>
              {student.className}
            </Text>
          </View>
          <View style={[styles.supportBadge, { backgroundColor: statusTone.bg }]}>
            <Text style={[styles.supportBadgeText, { color: statusTone.text }]}>{supportStatusLabel(status)}</Text>
          </View>
          {tracked ? (
            <View style={[styles.riskBadge, styles.riskBadgeHigh]}>
              <AlertTriangle color="#b91c1c" size={10} strokeWidth={2.4} />
              <Text style={[styles.riskBadgeText, styles.riskBadgeTextHigh]}>Risk takibinde</Text>
            </View>
          ) : signal ? (
            <View style={styles.riskBadge}>
              <AlertTriangle color="#c2410c" size={10} strokeWidth={2.4} />
              <Text style={styles.riskBadgeText}>{signal.count} uyarı</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.openBtn}>
        <Text style={styles.openBtnText}>Aç</Text>
        <ChevronRight color="#7c3aed" size={14} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginHorizontal: -4, marginBottom: 12 },
  hero: {
    backgroundColor: "#7c3aed",
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
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  heroSubtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "500", lineHeight: 18 },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  heroMetaPill: { flex: 1, alignItems: "center", gap: 2 },
  heroMetaValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroMetaLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "600" },
  heroMetaDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.18)" },
  filtersCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
    marginBottom: 12
  },
  searchFilterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
    paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
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
  filterBtnActive: { backgroundColor: "#faf5ff", borderColor: "#ddd6fe" },
  filterBtnPressed: { opacity: 0.88 },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  filtersPanel: { gap: 10, paddingTop: 4 },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipActive: { backgroundColor: "#faf5ff", borderColor: "#7c3aed" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#6d28d9" },
  clearFiltersBtn: { alignSelf: "flex-start", paddingVertical: 4 },
  clearFiltersText: { fontSize: 13, fontWeight: "700", color: "#7c3aed" },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  listTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  listCount: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8
  },
  studentRowPressed: { backgroundColor: "#faf5ff", borderColor: "#ddd6fe" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarPassive: { opacity: 0.65 },
  avatarText: { fontSize: 15, fontWeight: "800" },
  studentMain: { flex: 1, gap: 4 },
  studentName: { fontSize: 15, fontWeight: "800", color: colors.text },
  studentMeta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  rowBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  classBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "70%"
  },
  classBadgeText: { fontSize: 11, fontWeight: "700" },
  supportBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  supportBadgeText: { fontSize: 10, fontWeight: "800" },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 4
  },
  openBtnText: { fontSize: 12, fontWeight: "800", color: "#7c3aed" },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa"
  },
  riskBadgeHigh: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  riskBadgeText: { fontSize: 10, fontWeight: "800", color: "#c2410c" },
  riskBadgeTextHigh: { color: "#b91c1c" },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    marginBottom: 8
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  pageBtnDisabled: { opacity: 0.45 },
  pageLabel: { fontSize: 14, fontWeight: "700", color: colors.text, minWidth: 64, textAlign: "center" }
});
