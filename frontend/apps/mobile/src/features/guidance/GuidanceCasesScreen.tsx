import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AlertTriangle, FolderOpen, Plus, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GuidanceCaseCreateSheet } from "@/features/guidance/GuidanceCaseCreateSheet";
import { casePriorityLabel, casePriorityTone, caseStatusLabel } from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { GuidanceCase } from "@/shared/api/types";
import { useAuth } from "@/shared/auth/AuthContext";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { formatDate } from "@/shared/utils/labels";

const STATUS_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "open", label: "Açık" },
  { value: "monitoring", label: "İzleniyor" },
  { value: "closed", label: "Kapalı" }
] as const;

function CaseCard({ item, onPress }: { item: GuidanceCase; onPress: () => void }) {
  const tone = casePriorityTone(item.priority);
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.priorityBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text style={[styles.priorityText, { color: tone.text }]}>{casePriorityLabel(item.priority)}</Text>
        </View>
        <Text style={styles.statusText}>{caseStatusLabel(item.status)}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMeta}>
        {item.studentName} · {item.className}
      </Text>
      <Text numberOfLines={2} style={styles.cardSummary}>
        {item.masked ? "[Gizli özet]" : item.summary || "Özet girilmemiş."}
      </Text>
      <Text style={styles.cardFoot}>Sorumlu: {item.ownerName} · {formatDate(item.updatedAt)}</Text>
    </Pressable>
  );
}

export function GuidanceCasesScreen({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { session } = useAuth();
  const canCreate = session?.principal.role === "guidance";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const casesQ = useQuery({
    queryKey: [...queryKeys.guidanceCases, statusFilter],
    queryFn: () => api.guidanceCases(statusFilter ? { status: statusFilter } : undefined)
  });
  const statsQ = useQuery({ queryKey: queryKeys.guidanceCaseStats, queryFn: () => api.guidanceCaseStats() });
  const studentsQ = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return (casesQ.data ?? []).filter((item) => {
      if (!q) return true;
      return `${item.title} ${item.studentName} ${item.className} ${item.summary}`.toLocaleLowerCase("tr-TR").includes(q);
    });
  }, [casesQ.data, search]);

  const createMut = useMutation({
    mutationFn: api.createGuidanceCase,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceCases });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceCaseStats });
      setCreateOpen(false);
      setCreateError(null);
      router.push(`/(app)/guidance/cases/${created.id}`);
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Vaka oluşturulamadı.")
  });

  const onRefresh = () => {
    void casesQ.refetch();
    void statsQ.refetch();
  };

  if (casesQ.isLoading) {
    return (
      <Screen layout={embedded ? "tab" : "stack"}>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen layout={embedded ? "tab" : "stack"} refreshing={casesQ.isRefetching} onRefresh={onRefresh}>
      {!embedded ? <DetailBackBar label="Vaka dosyaları" /> : null}

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <FolderOpen color="#7c3aed" size={22} strokeWidth={2.2} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Vaka inbox</Text>
          <Text style={styles.heroSub}>Öğrenci bazlı rehberlik vaka dosyaları</Text>
        </View>
        {canCreate ? (
          <Pressable onPress={() => setCreateOpen(true)} style={styles.createBtn}>
            <Plus color="#fff" size={18} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      {statsQ.data ? (
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{statsQ.data.openCount}</Text>
            <Text style={styles.statLabel}>açık</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{statsQ.data.monitoringCount}</Text>
            <Text style={styles.statLabel}>izleniyor</Text>
          </View>
          <View style={[styles.statPill, styles.statPillDanger]}>
            <AlertTriangle color="#b91c1c" size={14} strokeWidth={2.2} />
            <Text style={[styles.statValue, styles.statValueDanger]}>{statsQ.data.criticalCount}</Text>
            <Text style={[styles.statLabel, styles.statLabelDanger]}>kritik</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <Search color={colors.textMuted} size={18} strokeWidth={2.2} />
        <TextInput
          onChangeText={setSearch}
          placeholder="Öğrenci veya vaka ara…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={search}
        />
      </View>

      <View style={styles.filters}>
        {STATUS_FILTERS.map((item) => {
          const active = statusFilter === item.value;
          return (
            <Pressable
              key={item.value || "all"}
              onPress={() => setStatusFilter(item.value)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {casesQ.isError ? <ErrorState message={casesQ.error.message} onRetry={onRefresh} /> : null}
      {!casesQ.isError && filtered.length === 0 ? (
        <EmptyState message="Henüz vaka dosyası yok. Sağ üstten yeni vaka açabilirsiniz." title="Vaka yok" />
      ) : null}

      {filtered.map((item) => (
        <CaseCard key={item.id} item={item} onPress={() => router.push(`/(app)/guidance/cases/${item.id}`)} />
      ))}

      <GuidanceCaseCreateSheet
        error={createError}
        loading={createMut.isPending}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSubmit={(payload) => createMut.mutate(payload)}
        open={createOpen && canCreate}
        students={studentsQ.data ?? []}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f5f3ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    padding: 14
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#5b21b6" },
  heroSub: { fontSize: 12, color: "#6d28d9", fontWeight: "600" },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center"
  },
  statsRow: { flexDirection: "row", gap: 8 },
  statPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2
  },
  statPillDanger: { backgroundColor: "#fef2f2", borderColor: "#fecaca", flexDirection: "row", justifyContent: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  statValueDanger: { color: "#b91c1c", fontSize: 16 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  statLabelDanger: { color: "#b91c1c" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#f8fafc"
  },
  filterChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: colors.text },
  filterChipTextActive: { color: "#fff" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priorityBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  priorityText: { fontSize: 11, fontWeight: "800" },
  statusText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  cardMeta: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  cardSummary: { fontSize: 13, lineHeight: 19, color: colors.text },
  cardFoot: { fontSize: 11, color: colors.textMuted, fontWeight: "600", marginTop: 2 }
});
