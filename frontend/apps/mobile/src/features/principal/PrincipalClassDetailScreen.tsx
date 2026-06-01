import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, DoorOpen, Search, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getClassTone, sortSections } from "@/features/principal/classUtils";
import { usePrincipalRoster } from "@/features/principal/usePrincipalRoster";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";

export function PrincipalClassDetailScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const query = usePrincipalRoster();
  const [search, setSearch] = useState("");

  const schoolClass = useMemo(
    () => (query.data?.classes ?? []).find((item) => item.id === classId) ?? null,
    [query.data?.classes, classId]
  );

  const tone = getClassTone(schoolClass?.name ?? "");

  const sections = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return sortSections((query.data?.sections ?? []).filter((item) => item.classId === classId)).filter(
      (item) => !q || item.name.toLocaleLowerCase("tr-TR").includes(q) || item.advisor.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [query.data?.sections, classId, search]);

  const studentCountBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of query.data?.students ?? []) {
      if (student.classId !== classId) continue;
      if (!student.sectionId) continue;
      map.set(student.sectionId, (map.get(student.sectionId) ?? 0) + 1);
    }
    return map;
  }, [query.data?.students, classId]);

  const classStudentCount = useMemo(
    () => (query.data?.students ?? []).filter((item) => item.classId === classId).length,
    [query.data?.students, classId]
  );

  const unassignedCount = useMemo(() => {
    return (query.data?.students ?? []).filter((item) => item.classId === classId && !item.sectionId).length;
  }, [query.data?.students, classId]);

  if (!schoolClass && !query.isLoading) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Sınıflar" />
        <ErrorState message="Sınıf kaydı bulunamadı." onRetry={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen layout="stack" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <DetailBackBar label="Sınıflar" />

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}

      {!query.isLoading && !query.isError && schoolClass ? (
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
              <View style={[styles.heroBadge, { backgroundColor: tone.badge }]}>
                <Text style={[styles.heroBadgeText, { color: tone.color }]}>{tone.label}</Text>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{schoolClass.name}</Text>
                <Text style={styles.heroSubtitle}>Şube listesi ve öğrenci dağılımı</Text>
              </View>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { color: tone.color }]}>{sections.length}</Text>
                  <Text style={styles.heroStatLabel}>şube</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { color: tone.color }]}>{classStudentCount}</Text>
                  <Text style={styles.heroStatLabel}>öğrenci</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <Search color={colors.textMuted} size={18} strokeWidth={2} />
              <TextInput
                onChangeText={setSearch}
                placeholder="Şube veya danışman ara..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                value={search}
              />
            </View>

            {unassignedCount > 0 ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{unassignedCount} öğrenci henüz şubeye atanmamış.</Text>
              </View>
            ) : null}

            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Şubeler</Text>
                <Text style={styles.listSubtitle}>{sections.length} kayıt</Text>
              </View>

              {sections.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <DoorOpen color={colors.accent} size={22} strokeWidth={2} />
                  </View>
                  <Text style={styles.emptyTitle}>Henüz şube yok</Text>
                  <Text style={styles.emptyHint}>Bu sınıfa bağlı şube tanımlandığında burada listelenir.</Text>
                </View>
              ) : (
                <View style={styles.rows}>
                  {sections.map((section) => {
                    const studentCount = studentCountBySection.get(section.id) ?? 0;
                    const fillRate = section.capacity > 0 ? Math.round((studentCount / section.capacity) * 100) : null;

                    return (
                      <Pressable
                        key={section.id}
                        onPress={() => router.push(`/(app)/principal/classes/${classId}/${section.id}`)}
                        style={({ pressed }) => [styles.sectionRow, pressed && styles.sectionRowPressed]}
                      >
                        <View style={styles.sectionIconWrap}>
                          <DoorOpen color={colors.accent} size={18} strokeWidth={2.2} />
                        </View>

                        <View style={styles.sectionMain}>
                          <Text style={styles.sectionName}>{section.name} şubesi</Text>
                          <Text numberOfLines={1} style={styles.sectionAdvisor}>
                            {section.advisor ? `Danışman: ${section.advisor}` : "Danışman atanmadı"}
                          </Text>
                          <View style={styles.sectionMetaRow}>
                            <View style={styles.metaChip}>
                              <Users color={colors.textMuted} size={12} strokeWidth={2.2} />
                              <Text style={styles.metaChipText}>
                                {studentCount}
                                {section.capacity > 0 ? ` / ${section.capacity}` : ""} öğrenci
                              </Text>
                            </View>
                            {fillRate !== null ? (
                              <View style={[styles.fillBadge, fillRate >= 90 && styles.fillBadgeWarn]}>
                                <Text style={[styles.fillBadgeText, fillRate >= 90 && styles.fillBadgeTextWarn]}>%{fillRate}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        <ChevronRight color={colors.accent} size={18} strokeWidth={2.4} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14
  },
  heroBadge: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  heroBadgeText: { fontSize: 14, fontWeight: "800" },
  heroCopy: { gap: 4 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
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
  notice: {
    backgroundColor: colors.accentLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  noticeText: { fontSize: 12, color: colors.primaryLight, fontWeight: "600" },
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
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  sectionRowPressed: { opacity: 0.9, backgroundColor: colors.accentLight },
  sectionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  sectionMain: { flex: 1, gap: 4, minWidth: 0 },
  sectionName: { fontSize: 15, fontWeight: "800", color: colors.text },
  sectionAdvisor: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  sectionMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 2 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaChipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  fillBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  fillBadgeWarn: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  fillBadgeText: { fontSize: 11, fontWeight: "800", color: colors.accent },
  fillBadgeTextWarn: { color: colors.warning },
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
