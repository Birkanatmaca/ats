import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Observation } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { categoryLabel, formatDate } from "@/shared/utils/labels";

type Props = {
  observations: Observation[];
};

export function TeacherRecentObservationsPanel({ observations }: Props) {
  const router = useRouter();
  const recent = observations.slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Son gözlemler</Text>
        <Pressable onPress={() => router.push("/(app)/teacher/(tabs)/observations")} style={styles.link}>
          <Text style={styles.linkText}>Tümü</Text>
          <ChevronRight color="#7c3aed" size={14} strokeWidth={2.4} />
        </Pressable>
      </View>

      {recent.length === 0 ? (
        <Text style={styles.empty}>Henüz gözlem kaydınız yok.</Text>
      ) : (
        recent.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.dot} />
            <View style={styles.main}>
              <Text numberOfLines={1} style={styles.student}>
                {item.studentName}
              </Text>
              <Text numberOfLines={1} style={styles.meta}>
                {categoryLabel(item.category)} · {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
    marginBottom: 12
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 14, fontWeight: "800", color: colors.text },
  link: { flexDirection: "row", alignItems: "center", gap: 2 },
  linkText: { fontSize: 12, fontWeight: "700", color: "#7c3aed" },
  empty: { fontSize: 13, color: colors.textMuted, fontWeight: "500", paddingVertical: 4 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: "#7c3aed", marginTop: 5 },
  main: { flex: 1, gap: 2 },
  student: { fontSize: 13, fontWeight: "700", color: colors.text },
  meta: { fontSize: 11, color: colors.textMuted, fontWeight: "600" }
});
