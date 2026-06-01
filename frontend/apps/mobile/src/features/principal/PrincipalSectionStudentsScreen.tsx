import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, Search, UserRound, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PrincipalStudentModal } from "@/features/principal/PrincipalStudentModal";
import { getClassTone } from "@/features/principal/classUtils";
import { usePrincipalRoster } from "@/features/principal/usePrincipalRoster";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { PrincipalRosterStudent, StudentFormPayload } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";

type StatusFilter = "" | "active" | "passive";

export function PrincipalSectionStudentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { classId, sectionId } = useLocalSearchParams<{ classId: string; sectionId: string }>();
  const query = usePrincipalRoster();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<PrincipalRosterStudent | null>(null);

  const schoolClass = useMemo(
    () => (query.data?.classes ?? []).find((item) => item.id === classId) ?? null,
    [query.data?.classes, classId]
  );

  const section = useMemo(
    () => (query.data?.sections ?? []).find((item) => item.id === sectionId && item.classId === classId) ?? null,
    [query.data?.sections, classId, sectionId]
  );

  const tone = getClassTone(schoolClass?.name ?? "");

  const sectionLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of query.data?.sections ?? []) {
      const className = (query.data?.classes ?? []).find((c) => c.id === item.classId)?.name ?? "—";
      map.set(item.id, `${className} / ${item.name}`);
    }
    return map;
  }, [query.data?.sections, query.data?.classes]);

  const students = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return (query.data?.students ?? [])
      .filter((item) => item.classId === classId && item.sectionId === sectionId)
      .filter((item) => !statusFilter || item.status === statusFilter)
      .filter((item) => {
        if (!q) return true;
        const blob = `${item.schoolNumber} ${item.firstName} ${item.lastName} ${item.guardianName} ${item.guardianPhone}`.toLocaleLowerCase("tr-TR");
        return blob.includes(q);
      })
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr"));
  }, [query.data?.students, classId, sectionId, search, statusFilter]);

  const activeCount = useMemo(() => students.filter((item) => item.status === "active").length, [students]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: queryKeys.principalRoster });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StudentFormPayload }) => api.patchStudent(id, payload),
    onSuccess: invalidate
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => api.patchStudent(id, { status: "passive" }),
    onSuccess: invalidate
  });

  if (!schoolClass || (!section && !query.isLoading)) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Sınıflar" onPress={() => router.back()} />
        <ErrorState message="Sınıf veya şube bulunamadı." onRetry={() => router.back()} />
      </Screen>
    );
  }

  return (
    <>
      <Screen layout="stack" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
        <DetailBackBar label={schoolClass?.name ?? "Sınıf"} />

        {query.isLoading ? <LoadingBlock /> : null}
        {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}

        {!query.isLoading && !query.isError && schoolClass && section ? (
          <>
            <View
              style={[
                styles.hero,
                { backgroundColor: tone.bg, borderColor: tone.badge },
                platformShadow("0 10px 24px rgba(28,53,87,0.08)", {
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.08,
                  shadowRadius: 14,
                  elevation: 4
                })
              ]}
            >
              <View style={styles.heroTop}>
                <View style={[styles.heroBadge, { backgroundColor: tone.badge }]}>
                  <Text style={[styles.heroBadgeText, { color: tone.color }]}>{section.name}</Text>
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>
                    {schoolClass.name} / {section.name}
                  </Text>
                  <Text style={styles.heroSubtitle}>{section.advisor ? `Danışman: ${section.advisor}` : "Danışman atanmadı"}</Text>
                </View>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { color: tone.color }]}>{students.length}</Text>
                  <Text style={styles.heroStatLabel}>öğrenci</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { color: tone.color }]}>{activeCount}</Text>
                  <Text style={styles.heroStatLabel}>aktif</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { color: tone.color }]}>{section.capacity || "—"}</Text>
                  <Text style={styles.heroStatLabel}>kontenjan</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <Search color={colors.textMuted} size={18} strokeWidth={2} />
              <TextInput
                onChangeText={setSearch}
                placeholder="Ad, numara veya veli ara..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                value={search}
              />
            </View>

            <View style={styles.statusRow}>
              <FilterChip active={!statusFilter} label="Tümü" onPress={() => setStatusFilter("")} />
              <FilterChip active={statusFilter === "active"} label="Aktif" onPress={() => setStatusFilter("active")} />
              <FilterChip active={statusFilter === "passive"} label="Pasif" onPress={() => setStatusFilter("passive")} />
            </View>

            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Öğrenciler</Text>
                <Text style={styles.listSubtitle}>{students.length} kayıt</Text>
              </View>

              {students.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <Users color={colors.accent} size={22} strokeWidth={2} />
                  </View>
                  <Text style={styles.emptyTitle}>Öğrenci bulunamadı</Text>
                  <Text style={styles.emptyHint}>Bu şubede filtreye uyan öğrenci kaydı yok.</Text>
                </View>
              ) : (
                <View style={styles.rows}>
                  {students.map((student) => {
                    const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
                    const isActive = student.status === "active";

                    return (
                      <Pressable
                        key={student.id}
                        onPress={() => {
                          setSelectedStudent(student);
                          setModalOpen(true);
                        }}
                        style={({ pressed }) => [styles.studentRow, pressed && styles.studentRowPressed]}
                      >
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
                          {student.guardianName ? (
                            <View style={styles.guardianRow}>
                              <UserRound color={colors.textMuted} size={11} strokeWidth={2.2} />
                              <Text numberOfLines={1} style={styles.guardianText}>
                                {student.guardianName}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgePassive]}>
                          <Text style={[styles.statusBadgeText, isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextPassive]}>
                            {isActive ? "Aktif" : "Pasif"}
                          </Text>
                        </View>

                        <ChevronRight color={colors.accent} size={16} strokeWidth={2.4} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : null}
      </Screen>

      <PrincipalStudentModal
        classes={query.data?.classes ?? []}
        existingSchoolNumbers={(query.data?.students ?? []).map((item) => item.schoolNumber)}
        mode="manage"
        onClose={() => setModalOpen(false)}
        onCreate={async () => {}}
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

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  heroBadgeText: { fontSize: 14, fontWeight: "800" },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 20, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: colors.border },
  heroStatValue: { fontSize: 20, fontWeight: "800" },
  heroStatLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    minHeight: 48
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 },
  statusRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: colors.surface
  },
  chipActive: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: colors.accent },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    gap: 3
  },
  listTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  listSubtitle: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  rows: { padding: 10, gap: 8 },
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
  studentRowPressed: { opacity: 0.9, backgroundColor: colors.accentLight },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarPassive: { backgroundColor: "#f3f4f6" },
  avatarText: { color: colors.accent, fontSize: 14, fontWeight: "800" },
  studentMain: { flex: 1, gap: 2, minWidth: 0 },
  studentName: { fontSize: 14, fontWeight: "800", color: colors.text },
  studentMeta: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  guardianRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  guardianText: { fontSize: 11, color: colors.textMuted, flexShrink: 1 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeActive: { backgroundColor: colors.accentLight },
  statusBadgePassive: { backgroundColor: "#fdecec" },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  statusBadgeTextActive: { color: colors.accent },
  statusBadgeTextPassive: { color: colors.danger },
  emptyWrap: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 28, gap: 8 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  emptyHint: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 18 }
});
