import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GuidancePlanCreateSheet } from "@/features/guidance/GuidancePlanCreateSheet";
import { supportStatusLabel } from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { GuidanceSupportPlan } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { formatDate } from "@/shared/utils/labels";

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: "", label: "Tüm durumlar" },
  { value: "open", label: "Açık" },
  { value: "monitoring", label: "İzleniyor" },
  { value: "closed", label: "Kapalı" }
] as const;

function formatDueDate(value?: string) {
  if (!value) return "—";
  return formatDate(value);
}

export function GuidancePlansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const plansQ = useQuery({ queryKey: queryKeys.guidanceSupportPlans, queryFn: () => api.guidanceSupportPlans() });
  const studentsQ = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });

  const plans = plansQ.data ?? [];

  const stats = useMemo(() => {
    const open = plans.filter((item) => item.status === "open").length;
    const monitoring = plans.filter((item) => item.status === "monitoring").length;
    const closed = plans.filter((item) => item.status === "closed").length;
    return { total: plans.length, open, monitoring, closed };
  }, [plans]);

  const classOptions = useMemo(() => {
    const names = new Set(plans.map((item) => item.className).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
  }, [plans]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...plans]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .filter((item) => {
        if (statusFilter && item.status !== statusFilter) return false;
        if (classFilter && item.className !== classFilter) return false;
        if (!q) return true;
        const blob = `${item.studentName} ${item.className} ${item.title} ${item.description} ${item.ownerName}`.toLowerCase();
        return blob.includes(q);
      });
  }, [plans, search, statusFilter, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activeFilterCount = Number(Boolean(statusFilter)) + Number(Boolean(classFilter));

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, classFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const createMut = useMutation({
    mutationFn: api.createGuidanceSupportPlan,
    onSuccess: () => {
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceSupportPlans });
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Plan kaydedilemedi.")
  });

  const updateMut = useMutation({
    mutationFn: ({ planId, status }: { planId: string; status: GuidanceSupportPlan["status"] }) =>
      api.updateGuidanceSupportPlan(planId, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceSupportPlans })
  });

  const deleteMut = useMutation({
    mutationFn: api.deleteGuidanceSupportPlan,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceSupportPlans })
  });

  function confirmDelete(plan: GuidanceSupportPlan) {
    Alert.alert("Planı sil", `"${plan.title}" planını silmek istediğinize emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteMut.mutate(plan.id) }
    ]);
  }

  if (plansQ.isLoading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <>
      <Screen refreshing={plansQ.isRefetching} topInsetExtra={6} onRefresh={() => void plansQ.refetch()}>
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
                <HeartHandshake color="#bfdbfe" size={22} strokeWidth={2.4} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Takip planları</Text>
                <Text style={styles.heroSubtitle}>Destek planları ve durum güncelleme</Text>
              </View>
              <Pressable onPress={() => setCreateOpen(true)} style={styles.addBtn}>
                <Plus color="#fff" size={18} strokeWidth={2.4} />
              </Pressable>
            </View>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaPill}>
                <Text style={styles.heroMetaValue}>{stats.total}</Text>
                <Text style={styles.heroMetaLabel}>toplam</Text>
              </View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaPill}>
                <Text style={styles.heroMetaValue}>{stats.open}</Text>
                <Text style={styles.heroMetaLabel}>açık</Text>
              </View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaPill}>
                <Text style={styles.heroMetaValue}>{stats.monitoring}</Text>
                <Text style={styles.heroMetaLabel}>izleniyor</Text>
              </View>
            </View>
          </View>
        </View>

        {plansQ.isError ? <ErrorState message={plansQ.error.message} onRetry={() => void plansQ.refetch()} /> : null}

        {!plansQ.isError ? (
          <>
            <View style={styles.filtersCard}>
              <View style={styles.searchFilterRow}>
                <View style={styles.searchWrap}>
                  <Search color="#2563eb" size={18} strokeWidth={2.2} />
                  <TextInput
                    onChangeText={setSearch}
                    placeholder="Öğrenci, plan, açıklama..."
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
                </Pressable>
              </View>

              {filtersOpen ? (
                <View style={styles.filtersPanel}>
                  <Text style={styles.filterLabel}>Durum</Text>
                  <View style={styles.chipRow}>
                    {STATUS_OPTIONS.map((item) => (
                      <FilterChip
                        key={item.value || "all"}
                        active={statusFilter === item.value}
                        label={item.label}
                        onPress={() => setStatusFilter(item.value)}
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
                </View>
              ) : null}
            </View>

            <View style={styles.listHead}>
              <Text style={styles.listTitle}>Plan listesi</Text>
              <Text style={styles.listCount}>{filtered.length} plan</Text>
            </View>

            {filtered.length === 0 ? (
              <EmptyState
                message={plans.length === 0 ? "Henüz takip planı yok. Yeni plan ekleyerek başlayın." : "Filtreye uyan plan bulunamadı."}
                title={plans.length === 0 ? "Plan yok" : "Sonuç bulunamadı"}
              />
            ) : (
              <>
                {paginated.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onDelete={() => confirmDelete(plan)}
                    onOpenStudent={() => router.push(`/(app)/guidance/students/${plan.studentId}`)}
                    onStatusChange={(status) => updateMut.mutate({ planId: plan.id, status })}
                    updating={updateMut.isPending}
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

      <GuidancePlanCreateSheet
        error={createError}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          await createMut.mutateAsync(payload);
        }}
        saving={createMut.isPending}
        students={studentsQ.data ?? []}
        visible={createOpen}
      />
    </>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PlanCard({
  plan,
  onOpenStudent,
  onStatusChange,
  onDelete,
  updating
}: {
  plan: GuidanceSupportPlan;
  onOpenStudent: () => void;
  onStatusChange: (status: GuidanceSupportPlan["status"]) => void;
  onDelete: () => void;
  updating: boolean;
}) {
  const statusTone =
    plan.status === "open"
      ? { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }
      : plan.status === "monitoring"
        ? { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" }
        : { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" };

  return (
    <View style={[styles.planCard, { borderColor: statusTone.border, backgroundColor: statusTone.bg }]}>
      <View style={styles.planHead}>
        <View style={styles.planMain}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Pressable onPress={onOpenStudent} style={styles.studentLink}>
            <UserRound color={statusTone.text} size={12} strokeWidth={2.2} />
            <Text style={[styles.studentLinkText, { color: statusTone.text }]}>
              {plan.studentName} · {plan.className}
            </Text>
          </Pressable>
          {plan.description ? (
            <Text numberOfLines={2} style={styles.planDescription}>
              {plan.description}
            </Text>
          ) : null}
          <View style={styles.planMetaRow}>
            <CalendarClock color={colors.textMuted} size={12} strokeWidth={2.2} />
            <Text style={styles.planMeta}>Hedef: {formatDueDate(plan.dueDate)} · {plan.ownerName}</Text>
          </View>
        </View>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Trash2 color={colors.danger} size={16} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={styles.statusRow}>
        {(["open", "monitoring", "closed"] as const).map((status) => (
          <Pressable
            key={status}
            disabled={updating || plan.status === status}
            onPress={() => onStatusChange(status)}
            style={[styles.statusChip, plan.status === status && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, plan.status === status && styles.statusChipTextActive]}>
              {supportStatusLabel(status)}
            </Text>
          </Pressable>
        ))}
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
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroSubtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "500" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
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
  filterBtnActive: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
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
  chipActive: { backgroundColor: "#eff6ff", borderColor: "#2563eb" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#1d4ed8" },
  listHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  listCount: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  planCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
  planHead: { flexDirection: "row", gap: 8 },
  planMain: { flex: 1, gap: 4 },
  planTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  studentLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  studentLinkText: { fontSize: 12, fontWeight: "700" },
  planDescription: { fontSize: 13, color: colors.text, lineHeight: 18, fontWeight: "500" },
  planMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  planMeta: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  deleteBtn: { padding: 4 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  statusChipActive: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  statusChipText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  statusChipTextActive: { color: "#fff" },
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
