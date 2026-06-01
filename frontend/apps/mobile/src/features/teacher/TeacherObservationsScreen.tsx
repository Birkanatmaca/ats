import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { TeacherObservationCreateSheet } from "@/features/teacher/TeacherObservationCreateSheet";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { Observation } from "@/shared/api/types";
import { useAuth } from "@/shared/auth/AuthContext";
import { colors } from "@/shared/theme/colors";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { categoryLabel, formatDate, observationCategories } from "@/shared/utils/labels";

const PAGE_SIZE = 10;

const CATEGORY_TONES: Record<string, { accent: string; bg: string; border: string }> = {
  participation: { accent: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  attention: { accent: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  behavior: { accent: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  social: { accent: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
  absence_risk: { accent: "#b91c1c", bg: "#fff1f2", border: "#fecdd3" },
  academic_drop: { accent: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
  teacher_note: { accent: "#64748b", bg: "#f8fafc", border: "#e2e8f0" }
};

function categoryTone(value: string) {
  return CATEGORY_TONES[value] ?? CATEGORY_TONES.teacher_note;
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

function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function TeacherObservationsScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const obsQ = useQuery({ queryKey: queryKeys.teacherObservations, queryFn: () => api.observations() });
  const studentsQ = useQuery({ queryKey: queryKeys.teacherStudents, queryFn: () => api.teacherStudents() });

  const myObs = useMemo(
    () =>
      (obsQ.data ?? [])
        .filter((item) => item.authorId === session?.principal.userId || item.authorName === session?.principal.name)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [obsQ.data, session]
  );

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = myObs.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length;
    const students = new Set(myObs.map((item) => item.studentId)).size;
    return {
      total: myObs.length,
      recent,
      students,
      roster: studentsQ.data?.length ?? 0
    };
  }, [myObs, studentsQ.data]);

  const studentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of myObs) {
      map.set(item.studentId, item.studentName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [myObs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myObs.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (studentFilter && item.studentId !== studentFilter) return false;
      if (!q) return true;
      const blob = `${item.studentName} ${item.className} ${categoryLabel(item.category)} ${item.note}`.toLowerCase();
      return blob.includes(q);
    });
  }, [myObs, search, categoryFilter, studentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activeFilterCount = Number(Boolean(categoryFilter)) + Number(Boolean(studentFilter));

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, studentFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const createMut = useMutation({
    mutationFn: (payload: { studentId: string; category: string; note: string }) => api.createObservation(payload),
    onSuccess: () => {
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacherObservations });
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Gözlem kaydedilemedi.")
  });

  async function handleCreate(payload: { studentId: string; category: string; note: string }) {
    setCreateError(null);
    await createMut.mutateAsync(payload);
  }

  if (obsQ.isLoading) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <>
      <Screen layout="tab" refreshing={obsQ.isRefetching} topInsetExtra={6} onRefresh={() => void obsQ.refetch()}>
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
                <BookOpen color="#ddd6fe" size={22} strokeWidth={2.4} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Gözlemler</Text>
                <Text style={styles.heroSubtitle}>Öğrenci gözlem kayıtları ve notlar</Text>
              </View>
              <Pressable
                disabled={(studentsQ.data ?? []).length === 0}
                onPress={() => setCreateOpen(true)}
                style={[styles.addBtn, (studentsQ.data ?? []).length === 0 && styles.addBtnDisabled]}
              >
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
                <Text style={styles.heroMetaValue}>{stats.recent}</Text>
                <Text style={styles.heroMetaLabel}>son 7 gün</Text>
              </View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaPill}>
                <Text style={styles.heroMetaValue}>{stats.students}</Text>
                <Text style={styles.heroMetaLabel}>öğrenci</Text>
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
                  <Search color="#7c3aed" size={18} strokeWidth={2.2} />
                  <TextInput
                    onChangeText={setSearch}
                    placeholder="Öğrenci, sınıf veya not ara..."
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

                  {studentOptions.length > 0 ? (
                    <>
                      <Text style={styles.filterLabel}>Öğrenci</Text>
                      <View style={styles.chipRow}>
                        <FilterChip active={!studentFilter} label="Tümü" onPress={() => setStudentFilter("")} />
                        {studentOptions.slice(0, 8).map((student) => (
                          <FilterChip
                            key={student.id}
                            active={studentFilter === student.id}
                            label={student.name.split(" ")[0] ?? student.name}
                            onPress={() => setStudentFilter(student.id)}
                          />
                        ))}
                      </View>
                    </>
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
                  myObs.length === 0
                    ? "Henüz gözlem kaydınız yok. Sağ üstteki + ile yeni gözlem ekleyin."
                    : "Arama veya filtreye uyan gözlem bulunamadı."
                }
                title={myObs.length === 0 ? "Gözlem yok" : "Sonuç bulunamadı"}
              />
            ) : (
              <>
                {paginated.map((item) => (
                  <ObservationCard
                    key={item.id}
                    expanded={expandedId === item.id}
                    observation={item}
                    onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
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

      <TeacherObservationCreateSheet
        error={createError}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
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

function ObservationCard({
  observation,
  expanded,
  onToggle
}: {
  observation: Observation;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = categoryTone(observation.category);

  return (
    <View style={[styles.obsCard, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Pressable onPress={onToggle} style={styles.obsHead}>
        <View style={[styles.obsAvatar, { backgroundColor: `${tone.accent}18` }]}>
          <Text style={[styles.obsAvatarText, { color: tone.accent }]}>{studentInitials(observation.studentName)}</Text>
        </View>

        <View style={styles.obsMain}>
          <View style={styles.obsTitleRow}>
            <Text numberOfLines={expanded ? undefined : 1} style={styles.obsStudent}>
              {observation.studentName}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: `${tone.accent}20` }]}>
              <Text style={[styles.categoryBadgeText, { color: tone.accent }]}>{categoryLabel(observation.category)}</Text>
            </View>
          </View>

          <View style={styles.studentLink}>
            <UserRound color={tone.accent} size={12} strokeWidth={2.2} />
            <Text style={[styles.classText, { color: tone.accent }]}>{observation.className || "Sınıf yok"}</Text>
          </View>

          <Text numberOfLines={expanded ? undefined : 2} style={styles.obsPreview}>
            {observation.note?.trim() || "Not girilmemiş."}
          </Text>

          <Text style={styles.obsMeta}>{formatRelativeDate(observation.createdAt)}</Text>
        </View>

        {expanded ? (
          <ChevronUp color={tone.accent} size={18} strokeWidth={2.2} />
        ) : (
          <ChevronDown color={colors.textMuted} size={18} strokeWidth={2.2} />
        )}
      </Pressable>
    </View>
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
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  heroSubtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "500" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  addBtnDisabled: { opacity: 0.45 },
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
  filterBtnActive: { backgroundColor: "#faf5ff", borderColor: "#ddd6fe" },
  filterBtnPressed: { opacity: 0.88 },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#7c3aed",
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
  chipActive: { backgroundColor: "#faf5ff", borderColor: "#7c3aed" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#6d28d9" },
  listHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  listCount: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  obsCard: { borderRadius: 16, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  obsHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  obsAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  obsAvatarText: { fontSize: 14, fontWeight: "800" },
  obsMain: { flex: 1, gap: 6 },
  obsTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  obsStudent: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.text },
  categoryBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  categoryBadgeText: { fontSize: 10, fontWeight: "800" },
  studentLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  classText: { fontSize: 12, fontWeight: "700" },
  obsPreview: { fontSize: 13, color: colors.textMuted, lineHeight: 19, fontWeight: "500" },
  obsMeta: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
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
