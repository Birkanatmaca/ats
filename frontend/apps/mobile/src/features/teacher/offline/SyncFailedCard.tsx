import { RefreshCw, TriangleAlert } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { attendanceLabel } from "@/shared/utils/labels";
import { conflictReasonLabel } from "./conflict";
import type { OfflineAttendanceDraft } from "./types";

type Props = {
  draft: OfflineAttendanceDraft;
  onRetry: () => void;
};

export function SyncFailedCard({ draft, onRetry }: Props) {
  const reason = draft.conflictReason ? conflictReasonLabel(draft.conflictReason) : draft.lastError ?? "Senkron başarısız.";

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <TriangleAlert color="#b45309" size={18} strokeWidth={2.2} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {draft.className} · {draft.subjectName}
          </Text>
          <Text style={styles.reason}>{reason}</Text>
        </View>
      </View>
      {draft.records.slice(0, 3).map((record) => (
        <Text key={record.studentId} style={styles.recordLine}>
          {record.studentName ?? record.studentId}: {attendanceLabel(record.status)}
        </Text>
      ))}
      {draft.records.length > 3 ? (
        <Text style={styles.more}>+{draft.records.length - 3} öğrenci daha</Text>
      ) : null}
      <Pressable onPress={onRetry} style={styles.retryBtn}>
        <RefreshCw color="#fff" size={14} strokeWidth={2.2} />
        <Text style={styles.retryText}>Tekrar dene</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    padding: 12,
    gap: 8
  },
  top: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 13, fontWeight: "800", color: "#92400e" },
  reason: { fontSize: 12, lineHeight: 17, color: "#78350f", fontWeight: "600" },
  recordLine: { fontSize: 12, color: "#92400e" },
  more: { fontSize: 11, color: "#a16207", fontWeight: "600" },
  retryBtn: {
    marginTop: 2,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#b45309",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 12 }
});
