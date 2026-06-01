import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  School,
  SlidersHorizontal,
  Users
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PrincipalStudentModal } from "@/features/principal/PrincipalStudentModal";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { PrincipalRosterStudent, StudentFormPayload } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";

const PAGE_SIZE = 12;

type StatusFilter = "" | "active" | "passive";

export function PrincipalStudentsScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "manage">("manage");
  const [selectedStudent, setSelectedStudent] = useState<PrincipalRosterStudent | null>(null);

  const query = useQuery({ queryKey: queryKeys.principalRoster, queryFn: () => api.principalRoster() });

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of query.data?.classes ?? []) {
      map.set(item.id, item.name);
    }
    return map;
  }, [query.data?.classes]);

  const sectionLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of query.data?.sections ?? []) {
      const className = classNameById.get(section.classId) ?? "—";
      map.set(section.id, `${className} / ${section.name}`);
    }
    return map;
  }, [query.data?.sections, classNameById]);

  const stats = useMemo(() => {
    const students = query.data?.students ?? [];
    const active = students.filter((item) => item.status === "active").length;
    return {
      total: students.length,
      active
    };
  }, [query.data?.students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const students = [...(query.data?.students ?? [])].sort((a, b) => {
      const classA = classNameById.get(a.classId) ?? "";
      const classB = classNameById.get(b.classId) ?? "";
      if (classA !== classB) return classA.localeCompare(classB, "tr");
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr");
    });

    return students.filter((item) => {
      if (filterClassId && item.classId !== filterClassId) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (!q) return true;

      const blob = `${item.schoolNumber} ${item.firstName} ${item.lastName} ${item.guardianName} ${item.guardianPhone} ${
        classNameById.get(item.classId) ?? ""
      } ${sectionLabelById.get(item.sectionId) ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query.data?.students, search, filterClassId, filterStatus, classNameById, sectionLabelById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const hasActiveFilters = Boolean(search.trim() || filterClassId || filterStatus);
  const activeFilterCount = Number(Boolean(filterClassId)) + Number(Boolean(filterStatus));
  const selectedClassLabel = filterClassId ? (classNameById.get(filterClassId) ?? "Sınıf") : "Tüm sınıflar";

  useEffect(() => {
    setPage(1);
  }, [search, filterClassId, filterStatus]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const existingSchoolNumbers = useMemo(
    () => (query.data?.students ?? []).map((item) => item.schoolNumber),
    [query.data?.students]
  );

  const activeRate = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: queryKeys.principalRoster });

  const createMut = useMutation({
    mutationFn: (payload: StudentFormPayload) => api.createStudent(payload),
    onSuccess: invalidate
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StudentFormPayload }) => api.patchStudent(id, payload),
    onSuccess: invalidate
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => api.patchStudent(id, { status: "passive" }),
    onSuccess: invalidate
  });

  function openCreate() {
    setModalMode("create");
    setSelectedStudent(null);
    setModalOpen(true);
  }

  function openManage(student: PrincipalRosterStudent) {
    setModalMode("manage");
    setSelectedStudent(student);
    setModalOpen(true);
  }

  function clearFilters() {
    setSearch("");
    setFilterClassId("");
    setFilterStatus("");
    setClassDropdownOpen(false);
  }

  function toggleFilters() {
    setFiltersOpen((current) => {
      if (current) setClassDropdownOpen(false);
      return !current;
    });
  }

  function selectClass(classId: string) {
    setFilterClassId(classId);
    setClassDropdownOpen(false);
  }

  return (
    <Screen refreshing={query.isRefetching} topInsetExtra={6} onRefresh={() => void query.refetch()}>
      <View style={styles.heroShell}>
        <View
          style={[
            styles.hero,
            platformShadow("0 14px 32px rgba(28,53,87,0.18)", {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.16,
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
              <Text style={styles.heroSubtitle}>Kayıt, sınıf ve devamsızlık yönetimi</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.total}</Text>
              <Text style={styles.heroMetaLabel}>toplam kayıt</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>%{activeRate}</Text>
              <Text style={styles.heroMetaLabel}>aktif oran</Text>
            </View>
          </View>

          <Pressable onPress={openCreate} style={({ pressed }) => [styles.heroAddBtn, pressed && styles.heroAddBtnPressed]}>
            <Plus color="#fff" size={18} strokeWidth={2.4} />
            <Text style={styles.heroAddBtnText}>Öğrenci ekle</Text>
          </Pressable>
        </View>
      </View>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}

      {!query.isLoading && !query.isError ? (
        <>
          <View style={styles.filtersCard}>
            <View style={styles.searchFilterRow}>
              <View style={styles.searchWrap}>
                <Search color={colors.textMuted} size={18} strokeWidth={2} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Ad, numara veya sınıf ara..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  value={search}
                />
              </View>

              <Pressable
                onPress={toggleFilters}
                style={({ pressed }) => [
                  styles.filterBtn,
                  filtersOpen && styles.filterBtnActive,
                  pressed && styles.filterBtnPressed
                ]}
              >
                <SlidersHorizontal color={filtersOpen || activeFilterCount > 0 ? colors.accent : colors.textMuted} size={18} strokeWidth={2.2} />
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
                <View style={styles.dropdownWrap}>
                  <Pressable
                    onPress={() => setClassDropdownOpen((current) => !current)}
                    style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.dropdownTriggerPressed]}
                  >
                    <Text numberOfLines={1} style={styles.dropdownTriggerText}>
                      {selectedClassLabel}
                    </Text>
                    <ChevronDown
                      color={colors.textMuted}
                      size={18}
                      strokeWidth={2.2}
                      style={classDropdownOpen ? { transform: [{ rotate: "180deg" }] } : undefined}
                    />
                  </Pressable>

                  {classDropdownOpen ? (
                    <View style={styles.dropdownMenu}>
                      <DropdownOption active={!filterClassId} isLast={!(query.data?.classes ?? []).length} label="Tüm sınıflar" onPress={() => selectClass("")} />
                      {(query.data?.classes ?? []).map((item, index, items) => (
                        <DropdownOption
                          key={item.id}
                          active={filterClassId === item.id}
                          isLast={index === items.length - 1}
                          label={item.name}
                          onPress={() => selectClass(item.id)}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>

                <Text style={styles.filterLabel}>Durum</Text>
                <View style={styles.statusRow}>
                  <FilterChip active={!filterStatus} label="Tümü" onPress={() => setFilterStatus("")} />
                  <FilterChip active={filterStatus === "active"} label="Aktif" onPress={() => setFilterStatus("active")} />
                  <FilterChip active={filterStatus === "passive"} label="Pasif" onPress={() => setFilterStatus("passive")} />
                </View>

                {hasActiveFilters ? (
                  <Pressable onPress={clearFilters} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Filtreleri temizle</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderCopy}>
                <Text style={styles.listTitle}>Öğrenci listesi</Text>
                <Text style={styles.listSubtitle}>
                  {filtered.length} sonuç · sayfa {page}/{totalPages}
                </Text>
              </View>
              <View style={styles.listCountBadge}>
                <Text style={styles.listCountText}>{paginated.length}</Text>
              </View>
            </View>

            {paginated.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Users color={colors.accent} size={22} strokeWidth={2} />
                </View>
                <Text style={styles.emptyTitle}>{stats.total === 0 ? "Henüz öğrenci yok" : "Öğrenci bulunamadı"}</Text>
                <Text style={styles.emptyHint}>
                  {stats.total === 0
                    ? "İlk öğrenciyi eklemek için yukarıdaki butonu kullanın."
                    : "Arama veya filtre kriterlerini değiştirin."}
                </Text>
              </View>
            ) : (
              <View style={styles.rows}>
                {paginated.map((student) => (
                  <StudentRow
                    key={student.id}
                    className={classNameById.get(student.classId) ?? "—"}
                    onOpen={() => openManage(student)}
                    student={student}
                  />
                ))}
              </View>
            )}

            {filtered.length > 0 ? (
              <View style={styles.pagination}>
                <Pressable
                  disabled={page <= 1}
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                >
                  <ChevronLeft color={page <= 1 ? colors.textMuted : colors.accent} size={18} strokeWidth={2.4} />
                </Pressable>
                <View style={styles.pageCenter}>
                  <Text style={styles.pageLabel}>
                    Sayfa {page} / {totalPages}
                  </Text>
                  <Text style={styles.pageMeta}>Her sayfada {PAGE_SIZE} öğrenci</Text>
                </View>
                <Pressable
                  disabled={page >= totalPages}
                  onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                >
                  <ChevronRight color={page >= totalPages ? colors.textMuted : colors.accent} size={18} strokeWidth={2.4} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <PrincipalStudentModal
        classes={query.data?.classes ?? []}
        existingSchoolNumbers={existingSchoolNumbers}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onCreate={async (payload) => {
          await createMut.mutateAsync(payload);
        }}
        onDeactivate={async (studentId) => {
          await deactivateMut.mutateAsync(studentId);
        }}
        onUpdate={async (studentId, payload) => {
          await updateMut.mutateAsync({ id: studentId, payload });
        }}
        sectionLabelById={sectionLabelById}
        student={selectedStudent}
        visible={modalOpen}
      />
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

function DropdownOption({
  label,
  active,
  isLast,
  onPress
}: {
  label: string;
  active: boolean;
  isLast?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.dropdownOption, !isLast && styles.dropdownOptionDivider, active && styles.dropdownOptionActive]}
    >
      <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StudentRow({
  student,
  className,
  onOpen
}: {
  student: PrincipalRosterStudent;
  className: string;
  onOpen: () => void;
}) {
  const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
  const isActive = student.status === "active";

  return (
    <View style={styles.studentRow}>
      <View style={[styles.avatar, !isActive && styles.avatarPassive]}>
        <Text style={styles.avatarText}>{initials || "?"}</Text>
      </View>

      <View style={styles.studentMain}>
        <Text numberOfLines={1} style={styles.studentName}>
          {student.firstName} {student.lastName}
        </Text>
        <Text numberOfLines={1} style={styles.studentMeta}>
          No {student.schoolNumber}
        </Text>
        <View style={styles.rowBadges}>
          <View style={styles.classBadge}>
            <School color={colors.accent} size={11} strokeWidth={2.2} />
            <Text numberOfLines={1} style={styles.classBadgeText}>
              {className}
            </Text>
          </View>
          <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgePassive]}>
            <Text style={[styles.statusBadgeText, isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextPassive]}>
              {isActive ? "Aktif" : "Pasif"}
            </Text>
          </View>
        </View>
      </View>

      <Pressable onPress={onOpen} style={({ pressed }) => [styles.openBtn, pressed && styles.openBtnPressed]}>
        <Text style={styles.openBtnText}>Aç</Text>
        <ChevronRight color={colors.accent} size={14} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    marginHorizontal: -4
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: {
    flex: 1,
    gap: 4
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  heroMetaPill: {
    flex: 1,
    alignItems: "center",
    gap: 2
  },
  heroMetaDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  heroMetaValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800"
  },
  heroMetaLabel: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontWeight: "600"
  },
  heroAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 14,
    paddingVertical: 13
  },
  heroAddBtnPressed: {
    opacity: 0.9,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  heroAddBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15
  },
  filtersCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  filtersPanel: {
    gap: 10,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  filterBtnActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent
  },
  filterBtnPressed: {
    opacity: 0.88
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800"
  },
  clearBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    minHeight: 48
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase"
  },
  dropdownWrap: {
    position: "relative",
    zIndex: 20
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 48
  },
  dropdownTriggerPressed: {
    backgroundColor: colors.accentLight
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  dropdownOptionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  dropdownOptionActive: {
    backgroundColor: colors.accentLight
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text
  },
  dropdownOptionTextActive: {
    color: colors.accent,
    fontWeight: "800"
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background
  },
  chipActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted
  },
  chipTextActive: {
    color: colors.accent
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background
  },
  listHeaderCopy: {
    flex: 1,
    gap: 3,
    paddingRight: 12
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text
  },
  listSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500"
  },
  listCountBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  listCountText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800"
  },
  rows: {
    padding: 10,
    gap: 8
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarPassive: {
    backgroundColor: "#f3f4f6"
  },
  avatarText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800"
  },
  studentMain: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  studentName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  studentMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600"
  },
  rowBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2
  },
  classBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryLight,
    flexShrink: 1
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  statusBadgeActive: {
    backgroundColor: colors.accentLight
  },
  statusBadgePassive: {
    backgroundColor: "#fdecec"
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  statusBadgeTextActive: {
    color: colors.accent
  },
  statusBadgeTextPassive: {
    color: colors.danger
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  openBtnPressed: {
    opacity: 0.85,
    backgroundColor: colors.accentLight
  },
  openBtnText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800"
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 8
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background
  },
  pageBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  pageBtnDisabled: {
    opacity: 0.45
  },
  pageCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2
  },
  pageLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text
  },
  pageMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500"
  }
});
