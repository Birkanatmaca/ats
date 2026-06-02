import { Clock3, TriangleAlert } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { useOfflineAttendance } from "./OfflineAttendanceContext";
import { SyncFailedCard } from "./SyncFailedCard";

export function PendingAttendanceQueue() {
  const { drafts, retryFailedDraft } = useOfflineAttendance();
  const visible = drafts.filter(
    (draft) =>
      draft.syncStatus === "queued" ||
      draft.syncStatus === "syncing" ||
      draft.syncStatus === "failed" ||
      draft.syncStatus === "conflict"
  );

  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Clock3 color={colors.accent} size={16} strokeWidth={2.2} />
        <Text style={styles.title}>Bekleyen yoklamalar</Text>
      </View>
      {visible.map((draft) =>
        draft.syncStatus === "failed" || draft.syncStatus === "conflict" ? (
          <SyncFailedCard key={draft.id} draft={draft} onRetry={() => void retryFailedDraft(draft.id)} />
        ) : (
          <View key={draft.id} style={styles.item}>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>
                {draft.className} · {draft.subjectName}
              </Text>
              <Text style={styles.itemMeta}>
                {draft.finalizePending ? "Tamamlama bekliyor" : "Kayıt bekliyor"} ·{" "}
                {draft.syncStatus === "syncing" ? "Gönderiliyor…" : "Kuyrukta"}
              </Text>
            </View>
            {draft.syncStatus === "queued" ? (
              <View style={styles.badge}>
                <TriangleAlert color="#1d4ed8" size={12} strokeWidth={2.2} />
                <Text style={styles.badgeText}>BEKLEMEDE</Text>
              </View>
            ) : null}
          </View>
        )
      )}
      {visible.length > 1 ? (
        <Pressable disabled style={styles.note}>
          <Text style={styles.noteText}>En yeni kayıtlar önce gönderilir.</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 13, fontWeight: "800", color: colors.text },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  itemCopy: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#1d4ed8" },
  note: { paddingTop: 2 },
  noteText: { fontSize: 11, color: colors.textMuted }
});
