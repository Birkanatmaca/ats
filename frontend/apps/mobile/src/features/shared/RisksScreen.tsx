import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  School,
  Search,
  ShieldAlert,
  SlidersHorizontal
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { buildGuidanceRiskSignals, riskCategories, type GuidanceRiskSignal } from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { categoryLabel, formatDate, riskLevelLabel } from "@/shared/utils/labels";

const PAGE_SIZE = 10;

type LevelFilter = "" | "high" | "medium" | "low";
type CategoryFilter = "" | (typeof riskCategories)[number];

type Props = {
  mode: "guidance" | "principal";
};

const RISK_THEME = {
  heroBg: "#7f1d1d",
  shadow: "0 14px 32px rgba(127,29,29,0.32)",
  shadowColor: "#7f1d1d",
  accent: "#b91c1c",
  accentDark: "#991b1b",
  chipActiveBg: "#fef2f2",
  chipActiveBorder: "#fca5a5",
  chipActiveText: "#991b1b",
  filterActiveBg: "#fef2f2",
  filterActiveBorder: "#fecaca",
  surfaceTint: "#fffafa",
  surfaceBorder: "#fecaca"
} as const;

const LEVEL_TONES: Record<
  string,
  { bg: string; border: string; text: string; dot: string; cardBg: string; cardBorder: string; accent: string }
> = {
  high: {
    bg: "#7f1d1d",
    border: "#991b1b",
    text: "#fecaca",
    dot: "#ef4444",
    cardBg: "#fff5f5",
    cardBorder: "#fecaca",
    accent: "#dc2626"
  },
  medium: {
    bg: "#fef2f2",
    border: "#fca5a5",
    text: "#b91c1c",
    dot: "#ef4444",
    cardBg: "#fffafa",
    cardBorder: "#fed7d7",
    accent: "#dc2626"
  },
  low: {
    bg: "#fff1f2",
    border: "#fecdd3",
    text: "#be123c",
    dot: "#f43f5e",
    cardBg: colors.surface,
    cardBorder: colors.border,
    accent: "#e11d48"
  }
};

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

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

export function RisksScreen({ mode }: Props) {
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<LevelFilter>("");
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>("");
  const [filterClassName, setFilterClassName] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["observations.risks", mode] as const,
    queryFn: () => api.observationsFiltered()
  });

  const risks = useMemo(() => buildGuidanceRiskSignals(query.data ?? []), [query.data]);

  const classOptions = useMemo(() => {
    const names = new Set(risks.map((item) => item.className));
    return [...names].sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
  }, [risks]);

  const stats = useMemo(() => {
    const high = risks.filter((item) => item.level === "high").length;
    const medium = risks.filter((item) => item.level === "medium").length;
    const students = new Set(risks.map((item) => item.studentId)).size;
    return { total: risks.length, high, medium, students };
  }, [risks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return risks.filter((item) => {
      if (filterLevel && item.level !== filterLevel) return false;
      if (filterCategory && item.category !== filterCategory) return false;
      if (filterClassName && item.className !== filterClassName) return false;
      if (!q) return true;
      const blob = `${item.studentName} ${item.className} ${categoryLabel(item.category)} ${riskLevelLabel(item.level)}`.toLowerCase();
      return blob.includes(q);
    });
  }, [risks, search, filterLevel, filterCategory, filterClassName]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const hasActiveFilters = Boolean(search.trim() || filterLevel || filterCategory || filterClassName);
  const activeFilterCount =
    Number(Boolean(filterLevel)) + Number(Boolean(filterCategory)) + Number(Boolean(filterClassName));

  useEffect(() => {
    setPage(1);
  }, [search, filterLevel, filterCategory, filterClassName]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function clearFilters() {
    setSearch("");
    setFilterLevel("");
    setFilterCategory("");
    setFilterClassName("");
  }

  const subtitle =
    mode === "principal"
      ? "Okul genelindeki öğrenci risk sinyalleri"
      : "Rehberlik kapsamındaki risk sinyalleri";

  if (query.isLoading) {
    return (
      <Screen layout={mode === "principal" ? "stack" : "tab"}>
        {mode === "principal" ? <DetailBackBar label="Daha Fazla" /> : null}
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen
      layout={mode === "principal" ? "stack" : "tab"}
      refreshing={query.isRefetching}
      topInsetExtra={mode === "principal" ? 0 : 6}
      onRefresh={() => void query.refetch()}
    >
      {mode === "principal" ? <DetailBackBar label="Daha Fazla" /> : null}

      <View style={styles.heroShell}>
        <View
          style={[
            styles.hero,
            { backgroundColor: RISK_THEME.heroBg },
            platformShadow(RISK_THEME.shadow, {
              shadowColor: RISK_THEME.shadowColor,
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
              <Text style={styles.heroTitle}>Riskler</Text>
              <Text style={styles.heroSubtitle}>{subtitle}</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.total}</Text>
              <Text style={styles.heroMetaLabel}>sinyal</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={[styles.heroMetaValue, stats.high > 0 && styles.heroMetaDanger]}>{stats.high}</Text>
              <Text style={styles.heroMetaLabel}>yüksek risk</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.students}</Text>
              <Text style={styles.heroMetaLabel}>öğrenci</Text>
            </View>
          </View>
        </View>
      </View>

      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}

      {!query.isError ? (
        <>
          <View style={styles.filtersCard}>
            <View style={styles.searchFilterRow}>
              <View style={styles.searchWrap}>
                <Search color="#b91c1c" size={18} strokeWidth={2.2} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Öğrenci, sınıf veya kategori ara..."
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
                  color={filtersOpen || activeFilterCount > 0 ? RISK_THEME.accent : colors.textMuted}
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
                <Text style={styles.filterLabel}>Risk seviyesi</Text>
                <View style={styles.chipRow}>
                  <FilterChip active={!filterLevel} label="Tümü" onPress={() => setFilterLevel("")} />
                  <FilterChip active={filterLevel === "high"} label="Yüksek" onPress={() => setFilterLevel("high")} />
                  <FilterChip active={filterLevel === "medium"} label="Orta" onPress={() => setFilterLevel("medium")} />
                  <FilterChip active={filterLevel === "low"} label="Düşük" onPress={() => setFilterLevel("low")} />
                </View>

                <Text style={styles.filterLabel}>Kategori</Text>
                <View style={styles.chipRow}>
                  <FilterChip active={!filterCategory} label="Tümü" onPress={() => setFilterCategory("")} />
                  {riskCategories.map((category) => (
                    <FilterChip
                      key={category}
                      active={filterCategory === category}
                      label={categoryLabel(category)}
                      onPress={() => setFilterCategory(category)}
                    />
                  ))}
                </View>

                {classOptions.length > 0 ? (
                  <>
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
                  </>
                ) : null}

                {hasActiveFilters ? (
                  <Pressable onPress={clearFilters} style={styles.clearFiltersBtn}>
                    <Text style={styles.clearFiltersText}>Filtreleri temizle</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.listHead}>
            <View style={styles.listTitleRow}>
              <View style={styles.listTitleAccent} />
              <Text style={styles.listTitle}>Risk sinyalleri</Text>
            </View>
            <Text style={styles.listCount}>{filtered.length} kayıt</Text>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              message={
                risks.length === 0
                  ? "Şu an değerlendirme bekleyen risk sinyali bulunmuyor."
                  : "Arama veya filtreye uyan risk sinyali yok."
              }
              title={risks.length === 0 ? "Risk sinyali yok" : "Sonuç bulunamadı"}
            />
          ) : (
            <>
              {paginated.map((risk) => (
                <RiskCard key={risk.id} risk={risk} />
              ))}

              {totalPages > 1 ? (
                <View style={styles.pagination}>
                  <Pressable
                    disabled={page <= 1}
                    onPress={() => setPage((current) => Math.max(1, current - 1))}
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  >
                    <ChevronLeft color={page <= 1 ? colors.textMuted : RISK_THEME.accent} size={18} strokeWidth={2.4} />
                  </Pressable>
                  <Text style={styles.pageLabel}>
                    {page} / {totalPages}
                  </Text>
                  <Pressable
                    disabled={page >= totalPages}
                    onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  >
                    <ChevronRight color={page >= totalPages ? colors.textMuted : RISK_THEME.accent} size={18} strokeWidth={2.4} />
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
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RiskCard({ risk }: { risk: GuidanceRiskSignal }) {
  const levelTone = LEVEL_TONES[risk.level] ?? LEVEL_TONES.medium;

  return (
    <View
      style={[
        styles.riskCard,
        {
          backgroundColor: levelTone.cardBg,
          borderColor: levelTone.cardBorder,
          borderLeftColor: levelTone.accent
        }
      ]}
    >
      <View style={styles.riskTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{studentInitials(risk.studentName)}</Text>
        </View>
        <View style={styles.riskMain}>
          <Text numberOfLines={1} style={styles.studentName}>
            {risk.studentName}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.classBadge}>
              <School color="#991b1b" size={10} strokeWidth={2.2} />
              <Text numberOfLines={1} style={styles.classBadgeText}>
                {risk.className}
              </Text>
            </View>
            <Text style={styles.dateText}>{formatRelativeDate(risk.lastSeenAt)}</Text>
          </View>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: levelTone.bg, borderColor: levelTone.border }]}>
          <View style={[styles.levelDot, { backgroundColor: levelTone.dot }]} />
          <Text style={[styles.levelText, { color: levelTone.text }]}>{riskLevelLabel(risk.level)}</Text>
        </View>
      </View>

      <View style={[styles.riskBody, { borderTopColor: levelTone.cardBorder }]}>
        <View style={styles.categoryRow}>
          <AlertTriangle color={levelTone.accent} size={14} strokeWidth={2.4} />
          <Text style={styles.categoryText}>{categoryLabel(risk.category)}</Text>
          <Text style={styles.sourceCount}>{risk.sourceCount} gözlem</Text>
        </View>
        <Text style={styles.summaryText}>{risk.summary}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginHorizontal: -4, marginBottom: 12 },
  hero: { borderRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, gap: 14 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(254,202,202,0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  heroSubtitle: { color: "rgba(254,226,226,0.88)", fontSize: 13, fontWeight: "500", lineHeight: 18 },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(254,202,202,0.16)"
  },
  heroMetaPill: { flex: 1, alignItems: "center", gap: 2 },
  heroMetaValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroMetaDanger: { color: "#fca5a5" },
  heroMetaLabel: { color: "rgba(254,226,226,0.78)", fontSize: 10, fontWeight: "600" },
  heroMetaDivider: { width: 1, height: 28, backgroundColor: "rgba(254,202,202,0.22)" },
  filtersCard: {
    backgroundColor: RISK_THEME.surfaceTint,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RISK_THEME.surfaceBorder,
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
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  filterBtnActive: { backgroundColor: RISK_THEME.filterActiveBg, borderColor: RISK_THEME.filterActiveBorder },
  filterBtnPressed: { opacity: 0.88 },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: RISK_THEME.heroBg,
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  chipActive: { backgroundColor: RISK_THEME.chipActiveBg, borderColor: RISK_THEME.chipActiveBorder },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: RISK_THEME.chipActiveText },
  clearFiltersBtn: { alignSelf: "flex-start", paddingVertical: 4 },
  clearFiltersText: { fontSize: 13, fontWeight: "700", color: RISK_THEME.accent },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  listTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  listTitleAccent: { width: 4, height: 18, borderRadius: 999, backgroundColor: RISK_THEME.accent },
  listTitle: { fontSize: 15, fontWeight: "800", color: "#7f1d1d" },
  listCount: { fontSize: 12, fontWeight: "700", color: "#b91c1c" },
  riskCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 8,
    gap: 12
  },
  riskTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: "#991b1b" },
  riskMain: { flex: 1, gap: 4, minWidth: 0 },
  studentName: { fontSize: 15, fontWeight: "800", color: "#450a0a" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  classBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "60%"
  },
  classBadgeText: { fontSize: 10, fontWeight: "700", color: "#991b1b" },
  dateText: { fontSize: 11, fontWeight: "600", color: "#991b1b", opacity: 0.72 },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  levelDot: { width: 6, height: 6, borderRadius: 999 },
  levelText: { fontSize: 10, fontWeight: "800" },
  riskBody: { gap: 6, paddingTop: 2, borderTopWidth: 1, borderTopColor: colors.border },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  categoryText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#7f1d1d" },
  sourceCount: { fontSize: 11, fontWeight: "700", color: "#b91c1c" },
  summaryText: { fontSize: 13, color: "#7f1d1d", lineHeight: 18, fontWeight: "500", opacity: 0.78 },
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
