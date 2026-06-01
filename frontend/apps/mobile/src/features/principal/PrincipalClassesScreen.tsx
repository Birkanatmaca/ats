import { useRouter } from "expo-router";
import { ChevronRight, LayoutGrid, Search, Users, UsersRound } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getClassTone, sortClasses } from "@/features/principal/classUtils";
import { usePrincipalRoster } from "@/features/principal/usePrincipalRoster";
import { colors } from "@/shared/theme/colors";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";

export function PrincipalClassesScreen() {
  const router = useRouter();
  const query = usePrincipalRoster();
  const [search, setSearch] = useState("");

  const sectionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const section of query.data?.sections ?? []) {
      map.set(section.classId, (map.get(section.classId) ?? 0) + 1);
    }
    return map;
  }, [query.data?.sections]);

  const studentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of query.data?.students ?? []) {
      map.set(student.classId, (map.get(student.classId) ?? 0) + 1);
    }
    return map;
  }, [query.data?.students]);

  const stats = useMemo(
    () => ({
      classes: query.data?.classes.length ?? 0,
      sections: query.data?.sections.length ?? 0,
      students: query.data?.students.length ?? 0
    }),
    [query.data]
  );

  const filteredClasses = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return sortClasses(query.data?.classes ?? []).filter((item) => !q || item.name.toLocaleLowerCase("tr-TR").includes(q));
  }, [query.data?.classes, search]);

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
              <LayoutGrid color="#fff" size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Sınıflar</Text>
              <Text style={styles.heroSubtitle}>Sınıf ve şube yapısını yönetin</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.classes}</Text>
              <Text style={styles.heroMetaLabel}>sınıf</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.sections}</Text>
              <Text style={styles.heroMetaLabel}>şube</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{stats.students}</Text>
              <Text style={styles.heroMetaLabel}>öğrenci</Text>
            </View>
          </View>
        </View>
      </View>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}

      {!query.isLoading && !query.isError ? (
        <>
          <View style={styles.searchWrap}>
            <Search color={colors.textMuted} size={18} strokeWidth={2} />
            <TextInput
              onChangeText={setSearch}
              placeholder="Sınıf ara..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              value={search}
            />
          </View>

          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Sınıf listesi</Text>
              <Text style={styles.listSubtitle}>{filteredClasses.length} sınıf</Text>
            </View>

            {filteredClasses.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <LayoutGrid color={colors.accent} size={22} strokeWidth={2} />
                </View>
                <Text style={styles.emptyTitle}>{stats.classes === 0 ? "Henüz sınıf yok" : "Sınıf bulunamadı"}</Text>
                <Text style={styles.emptyHint}>
                  {stats.classes === 0 ? "Okul yapılandırması tamamlandığında sınıflar burada görünür." : "Arama kriterini değiştirin."}
                </Text>
              </View>
            ) : (
              <View style={styles.rows}>
                {filteredClasses.map((item) => {
                  const tone = getClassTone(item.name);
                  const sectionCount = sectionCounts.get(item.id) ?? 0;
                  const studentCount = studentCounts.get(item.id) ?? 0;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push(`/(app)/principal/classes/${item.id}`)}
                      style={({ pressed }) => [styles.classRow, pressed && styles.classRowPressed]}
                    >
                      <View style={[styles.classBadge, { backgroundColor: tone.badge }]}>
                        <Text style={[styles.classBadgeText, { color: tone.color }]}>{tone.label}</Text>
                      </View>

                      <View style={styles.classMain}>
                        <Text numberOfLines={1} style={styles.className}>
                          {item.name}
                        </Text>
                        <View style={styles.classMetaRow}>
                          <View style={styles.metaChip}>
                            <UsersRound color={colors.textMuted} size={12} strokeWidth={2.2} />
                            <Text style={styles.metaChipText}>{sectionCount} şube</Text>
                          </View>
                          <View style={styles.metaChip}>
                            <Users color={colors.textMuted} size={12} strokeWidth={2.2} />
                            <Text style={styles.metaChipText}>{studentCount} öğrenci</Text>
                          </View>
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
  heroShell: { marginHorizontal: -4 },
  hero: {
    backgroundColor: colors.primary,
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
  heroSubtitle: { color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "500", lineHeight: 18 },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  heroMetaPill: { flex: 1, alignItems: "center", gap: 2 },
  heroMetaDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.16)" },
  heroMetaValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  heroMetaLabel: { color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: "600" },
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
  classRow: {
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
  classRowPressed: { opacity: 0.9, backgroundColor: colors.accentLight },
  classBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  classBadgeText: { fontSize: 16, fontWeight: "800" },
  classMain: { flex: 1, gap: 6, minWidth: 0 },
  className: { fontSize: 16, fontWeight: "800", color: colors.text },
  classMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaChipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
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
