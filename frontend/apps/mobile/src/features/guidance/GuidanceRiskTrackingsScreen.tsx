import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  UserRound
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { buildGuidanceRiskSignals } from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { GuidanceRiskTracking } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { formatDate } from "@/shared/utils/labels";

const PAGE_SIZE = 10;

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return `${diffDays} gün önce`;
  return formatDate(value);
}

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function GuidanceRiskTrackingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const trackingsQ = useQuery({
    queryKey: queryKeys.guidanceRiskTrackings,
    queryFn: () => api.guidanceRiskTrackings()
  });
  const obsQ = useQuery({ queryKey: queryKeys.guidanceObservations, queryFn: () => api.observationsFiltered() });
  const notesQ = useQuery({ queryKey: queryKeys.guidanceNotes, queryFn: () => api.guidanceNotes() });

  const trackings = trackingsQ.data ?? [];
  const autoSignals = useMemo(() => buildGuidanceRiskSignals(obsQ.data ?? []), [obsQ.data]);

  const signalByStudent = useMemo(() => {
    const map = new Map<string, number>();
    for (const signal of autoSignals) {
      map.set(signal.studentId, (map.get(signal.studentId) ?? 0) + 1);
    }
    return map;
  }, [autoSignals]);

  const noteCountByStudent = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notesQ.data ?? []) {
      map.set(note.studentId, (map.get(note.studentId) ?? 0) + 1);
    }
    return map;
  }, [notesQ.data]);

  const obsCountByStudent = useMemo(() => {
    const map = new Map<string, number>();
    for (const obs of obsQ.data ?? []) {
      map.set(obs.studentId, (map.get(obs.studentId) ?? 0) + 1);
    }
    return map;
  }, [obsQ.data]);

  const classOptions = useMemo(() => {
    const names = new Set(trackings.map((item) => item.className).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
  }, [trackings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...trackings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((item) => {
        if (classFilter && item.className !== classFilter) return false;
        if (!q) return true;
        const blob = `${item.studentName} ${item.className} ${item.reason} ${item.counselorName}`.toLowerCase();
        return blob.includes(q);
      });
  }, [trackings, search, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, classFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const removeMut = useMutation({
    mutationFn: api.deleteGuidanceRiskTracking,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceRiskTrackings })
  });

  const refreshing = trackingsQ.isRefetching || obsQ.isRefetching || notesQ.isRefetching;
  const onRefresh = () => {
    void trackingsQ.refetch();
    void obsQ.refetch();
    void notesQ.refetch();
  };

  if (trackingsQ.isLoading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen layout="tab" refreshing={refreshing} topInsetExtra={6} onRefresh={onRefresh}>
      <View style={styles.heroShell}>
        <View
          style={[
            styles.hero,
            platformShadow("0 14px 32px rgba(127,29,29,0.32)", {
              shadowColor: "#7f1d1d",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.22,
              shadowRadius: 18,
              elevation: 8
            })
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <ShieldAlert color="#fecaca" size={22} strokeWidth={2.4} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Risk takibi</Text>
              <Text style={styles.heroSubtitle}>Rehberlikçi kararıyla takip edilen öğrenciler</Text>
            </View>
          </View>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{trackings.length}</Text>
              <Text style={styles.heroMetaLabel}>takipte</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{new Set(trackings.map((item) => item.className)).size}</Text>
              <Text style={styles.heroMetaLabel}>sınıf</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{autoSignals.length}</Text>
              <Text style={styles.heroMetaLabel}>otomatik uyarı</Text>
            </View>
          </View>
        </View>
      </View>

      {trackingsQ.isError ? <ErrorState message={trackingsQ.error.message} onRetry={onRefresh} /> : null}

      {!trackingsQ.isError ? (
        <>
          <View style={styles.filtersCard}>
            <View style={styles.searchFilterRow}>
              <View style={styles.searchWrap}>
                <Search color="#b91c1c" size={18} strokeWidth={2.2} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Öğrenci, sınıf veya gerekçe..."
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
                <SlidersHorizontal color={filtersOpen || classFilter ? "#b91c1c" : colors.textMuted} size={18} strokeWidth={2.2} />
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

          <View style={styles.listHead}>
            <Text style={styles.listTitle}>Takip listesi</Text>
            <Text style={styles.listCount}>{filtered.length} öğrenci</Text>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              message={
                trackings.length === 0
                  ? "Henüz risk takibine alınmış öğrenci yok. Öğrenci detayından «Risk takibine al» ile ekleyebilirsiniz."
                  : "Arama veya filtreye uyan kayıt bulunamadı."
              }
              title={trackings.length === 0 ? "Liste boş" : "Sonuç bulunamadı"}
            />
          ) : (
            <>
              {paginated.map((item) => (
                <TrackingCard
                  key={item.id}
                  item={item}
                  noteCount={noteCountByStudent.get(item.studentId) ?? 0}
                  obsCount={obsCountByStudent.get(item.studentId) ?? 0}
                  onOpenStudent={() => router.push(`/(app)/guidance/students/${item.studentId}`)}
                  onRemove={() => removeMut.mutate(item.id)}
                  removing={removeMut.isPending}
                  signalCount={signalByStudent.get(item.studentId) ?? 0}
                />
              ))}
              {totalPages > 1 ? (
                <View style={styles.pagination}>
                  <Pressable
                    disabled={page <= 1}
                    onPress={() => setPage((current) => Math.max(1, current - 1))}
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  >
                    <ChevronLeft color={page <= 1 ? colors.textMuted : "#b91c1c"} size={18} strokeWidth={2.4} />
                  </Pressable>
                  <Text style={styles.pageLabel}>
                    {page} / {totalPages}
                  </Text>
                  <Pressable
                    disabled={page >= totalPages}
                    onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  >
                    <ChevronRight color={page >= totalPages ? colors.textMuted : "#b91c1c"} size={18} strokeWidth={2.4} />
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

function TrackingCard({
  item,
  obsCount,
  noteCount,
  signalCount,
  onOpenStudent,
  onRemove,
  removing
}: {
  item: GuidanceRiskTracking;
  obsCount: number;
  noteCount: number;
  signalCount: number;
  onOpenStudent: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{studentInitials(item.studentName)}</Text>
        </View>
        <View style={styles.cardMain}>
          <Pressable onPress={onOpenStudent} style={styles.studentLink}>
            <UserRound color="#b91c1c" size={12} strokeWidth={2.2} />
            <Text style={styles.studentLinkText}>
              {item.studentName} · {item.className}
            </Text>
          </Pressable>
          {item.reason ? <Text style={styles.reasonText}>{item.reason}</Text> : null}
          <Text style={styles.metaText}>
            {item.counselorName} · {formatRelativeDate(item.createdAt)}
          </Text>
          <View style={styles.statsRow}>
            <StatPill icon={BookOpen} label={`${obsCount} gözlem`} />
            <StatPill icon={FileText} label={`${noteCount} not`} />
            {signalCount > 0 ? <StatPill icon={AlertTriangle} label={`${signalCount} uyarı`} warn /> : null}
          </View>
        </View>
      </View>
      <Pressable disabled={removing} onPress={onRemove} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>Takipten çıkar</Text>
      </Pressable>
    </View>
  );
}

function StatPill({
  icon: Icon,
  label,
  warn
}: {
  icon: typeof BookOpen;
  label: string;
  warn?: boolean;
}) {
  return (
    <View style={[styles.statPill, warn && styles.statPillWarn]}>
      <Icon color={warn ? "#b91c1c" : colors.textMuted} size={10} strokeWidth={2.4} />
      <Text style={[styles.statPillText, warn && styles.statPillTextWarn]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginHorizontal: -4, marginBottom: 12 },
  hero: { backgroundColor: "#7f1d1d", borderRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, gap: 14 },
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
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroSubtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "500", lineHeight: 18 },
  heroMetaRow: { flexDirection: "row", alignItems: "center" },
  heroMetaPill: { flex: 1, alignItems: "center", gap: 2 },
  heroMetaValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroMetaLabel: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "600" },
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
  filterBtnActive: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
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
  chipActive: { backgroundColor: "#fef2f2", borderColor: "#b91c1c" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#991b1b" },
  listHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  listCount: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  card: {
    backgroundColor: "#fffafa",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    marginBottom: 8,
    gap: 10
  },
  cardHead: { flexDirection: "row", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { fontSize: 12, fontWeight: "800", color: "#b91c1c" },
  cardMain: { flex: 1, gap: 4 },
  studentLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  studentLinkText: { fontSize: 13, fontWeight: "800", color: "#b91c1c" },
  reasonText: { fontSize: 13, color: colors.text, lineHeight: 18, fontWeight: "500" },
  metaText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border
  },
  statPillWarn: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  statPillText: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  statPillTextWarn: { color: "#b91c1c" },
  removeBtn: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fca5a5",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  removeBtnText: { fontSize: 12, fontWeight: "700", color: "#b91c1c" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8 },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageLabel: { fontSize: 13, fontWeight: "700", color: colors.text }
});
