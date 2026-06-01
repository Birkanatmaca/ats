import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  UserRound
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { riskCategories } from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { Observation } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { categoryLabel, formatDate, observationCategories, sensitivityLabel } from "@/shared/utils/labels";

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

export function GuidanceObservationsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const obsQ = useQuery({
    queryKey: queryKeys.guidanceObservations,
    queryFn: () => api.observationsFiltered()
  });

  const observations = obsQ.data ?? [];

  const stats = useMemo(() => {
    const students = new Set(observations.map((item) => item.studentId)).size;
    const riskCount = observations.filter((item) => riskCategories.includes(item.category)).length;
    const sensitiveCount = observations.filter((item) => item.sensitivity === "sensitive_student").length;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = observations.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length;
    return { total: observations.length, students, riskCount, sensitiveCount, recent };
  }, [observations]);

  const classOptions = useMemo(() => {
    const names = new Set(observations.map((item) => item.className).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
  }, [observations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...observations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((item) => {
        if (categoryFilter && item.category !== categoryFilter) return false;
        if (classFilter && item.className !== classFilter) return false;
        if (!q) return true;
        const blob = `${item.studentName} ${item.className} ${item.authorName} ${categoryLabel(item.category)} ${item.note}`.toLowerCase();
        return blob.includes(q);
      });
  }, [observations, search, categoryFilter, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activeFilterCount = Number(Boolean(categoryFilter)) + Number(Boolean(classFilter));
  const hasActiveFilters = Boolean(search.trim() || categoryFilter || classFilter);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, classFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  if (obsQ.isLoading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen refreshing={obsQ.isRefetching} topInsetExtra={6} onRefresh={() => void obsQ.refetch()}>
      <View style={styles.heroShell}>
        <View
          style={[
            styles.hero,
            platformShadow("0 14px 32px rgba(37,99,235,0.22)", {
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              elevation: 8
            })
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <BookOpen color="#bfdbfe" size={22} strokeWidth={2.4} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Öğretmen gözlemleri</Text>
              <Text style={styles.heroSubtitle}>Kategori, sınıf ve hassasiyet filtreleri</Text>
            </View>
          </View>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.total}</Text>
              <Text style={styles.heroMetaLabel}>kayıt</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.recent}</Text>
              <Text style={styles.heroMetaLabel}>son 7 gün</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={[styles.heroMetaValue, stats.riskCount > 0 && styles.heroMetaWarn]}>{stats.riskCount}</Text>
              <Text style={styles.heroMetaLabel}>risk kategorisi</Text>
            </View>
          </View>
        </View>
      </View>

      {obsQ.isError ? <ErrorState message={obsQ.error.message} onRetry={() => void obsQ.refetch()} /> : null}

      {!obsQ.isError ? (
        <>
          <View style={styles.filtersCard}>
            <View style={styles.searchFilterRow}>
              <View style={styles.searchWrap}>
                <Search color="#2563eb" size={18} strokeWidth={2.2} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Öğrenci, sınıf, öğretmen..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  value={search}
                />
              </View>
              <Pressable
                onPress={() => setFiltersOpen((current) => !current)}
                style={({ pressed }) => [
                  styles.filterBtn,
                  (filtersOpen || activeFilterCount > 0) && styles.filterBtnActive,
                  pressed && styles.filterBtnPressed
                ]}
              >
                <SlidersHorizontal
                  color={filtersOpen || activeFilterCount > 0 ? "#2563eb" : colors.textMuted}
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
                <Text style={styles.filterLabel}>Kategori</Text>
                <View style={styles.chipRow}>
                  <FilterChip active={!categoryFilter} label="Tümü" onPress={() => setCategoryFilter("")} />
                  {observationCategories.map((item) => (
                    <FilterChip
                      key={item.value}
                      active={categoryFilter === item.value}
                      label={item.label}
                      onPress={() => setCategoryFilter(item.value)}
                    />
                  ))}
                </View>
                {classOptions.length > 0 ? (
                  <>
                    <Text style={styles.filterLabel}>Sınıf</Text>
                    <View style={styles.chipRow}>
                      <FilterChip active={!classFilter} label="Tümü" onPress={() => setClassFilter("")} />
                      {classOptions.map((name) => (
                        <FilterChip key={name} active={classFilter === name} label={name} onPress={() => setClassFilter(name)} />
                      ))}
                    </View>
                  </>
                ) : null}
                {hasActiveFilters ? (
                  <Pressable
                    onPress={() => {
                      setSearch("");
                      setCategoryFilter("");
                      setClassFilter("");
                    }}
                    style={styles.clearFiltersBtn}
                  >
                    <Text style={styles.clearFiltersText}>Filtreleri temizle</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.listHead}>
            <Text style={styles.listTitle}>Gözlem listesi</Text>
            <Text style={styles.listCount}>{filtered.length} kayıt</Text>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              message={
                observations.length === 0
                  ? "Henüz öğretmen gözlemi yok."
                  : "Arama veya filtreye uyan gözlem bulunamadı."
              }
              title={observations.length === 0 ? "Gözlem yok" : "Sonuç bulunamadı"}
            />
          ) : (
            <>
              {paginated.map((item) => (
                <ObservationCard
                  key={item.id}
                  item={item}
                  onOpenStudent={() => router.push(`/(app)/guidance/students/${item.studentId}`)}
                />
              ))}
              {totalPages > 1 ? (
                <View style={styles.pagination}>
                  <Pressable
                    disabled={page <= 1}
                    onPress={() => setPage((current) => Math.max(1, current - 1))}
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  >
                    <ChevronLeft color={page <= 1 ? colors.textMuted : "#2563eb"} size={18} strokeWidth={2.4} />
                  </Pressable>
                  <Text style={styles.pageLabel}>
                    {page} / {totalPages}
                  </Text>
                  <Pressable
                    disabled={page >= totalPages}
                    onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  >
                    <ChevronRight color={page >= totalPages ? colors.textMuted : "#2563eb"} size={18} strokeWidth={2.4} />
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

function ObservationCard({ item, onOpenStudent }: { item: Observation; onOpenStudent: () => void }) {
  const isRisk = riskCategories.includes(item.category);
  const isSensitive = item.sensitivity === "sensitive_student";

  return (
    <View style={[styles.card, isRisk && styles.cardRisk]}>
      <View style={styles.cardHead}>
        <View style={[styles.avatar, isRisk && styles.avatarRisk]}>
          <Text style={[styles.avatarText, isRisk && styles.avatarTextRisk]}>{studentInitials(item.studentName)}</Text>
        </View>
        <View style={styles.cardMain}>
          <Pressable onPress={onOpenStudent} style={styles.studentLink}>
            <UserRound color="#2563eb" size={12} strokeWidth={2.2} />
            <Text style={styles.studentLinkText}>
              {item.studentName} · {item.className}
            </Text>
          </Pressable>
          <Text style={styles.categoryText}>{categoryLabel(item.category)}</Text>
          <Text numberOfLines={3} style={styles.noteText}>
            {item.note?.trim() || "Not girilmemiş."}
          </Text>
          <Text style={styles.metaText}>
            {item.authorName} · {formatRelativeDate(item.createdAt)}
          </Text>
          <View style={styles.badgeRow}>
            {isRisk ? (
              <View style={styles.riskBadge}>
                <ShieldAlert color="#b91c1c" size={10} strokeWidth={2.4} />
                <Text style={styles.riskBadgeText}>Risk kategorisi</Text>
              </View>
            ) : null}
            {isSensitive ? (
              <View style={styles.sensitiveBadge}>
                <Text style={styles.sensitiveBadgeText}>{sensitivityLabel(item.sensitivity)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginHorizontal: -4, marginBottom: 12 },
  hero: { backgroundColor: "#2563eb", borderRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, gap: 14 },
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
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  heroSubtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "500" },
  heroMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroMetaPill: { flex: 1, alignItems: "center", gap: 2 },
  heroMetaValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroMetaWarn: { color: "#fecaca" },
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
  filterBtnActive: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  filterBtnPressed: { opacity: 0.88 },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
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
  chipActive: { backgroundColor: "#eff6ff", borderColor: "#2563eb" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#1d4ed8" },
  clearFiltersBtn: { alignSelf: "flex-start", paddingVertical: 4 },
  clearFiltersText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
  listHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  listCount: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8
  },
  cardRisk: { backgroundColor: "#fffafa", borderColor: "#fecaca" },
  cardHead: { flexDirection: "row", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarRisk: { backgroundColor: "#fef2f2" },
  avatarText: { fontSize: 12, fontWeight: "800", color: "#2563eb" },
  avatarTextRisk: { color: "#b91c1c" },
  cardMain: { flex: 1, gap: 4 },
  studentLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  studentLinkText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
  categoryText: { fontSize: 13, fontWeight: "800", color: colors.text },
  noteText: { fontSize: 13, color: colors.text, lineHeight: 18, fontWeight: "500" },
  metaText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  riskBadgeText: { fontSize: 10, fontWeight: "700", color: "#b91c1c" },
  sensitiveBadge: {
    backgroundColor: "#fff7ed",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#fed7aa"
  },
  sensitiveBadgeText: { fontSize: 10, fontWeight: "700", color: "#c2410c" },
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
