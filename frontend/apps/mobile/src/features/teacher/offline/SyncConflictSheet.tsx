import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { attendanceLabel } from "@/shared/utils/labels";
import { conflictReasonLabel, draftHasLocalChanges } from "./conflict";
import { useOfflineAttendance } from "./OfflineAttendanceContext";

export function SyncConflictSheet() {
  const {
    activeConflict,
    resolveConflictKeepLocal,
    resolveConflictKeepServer,
    dismissConflict
  } = useOfflineAttendance();

  if (!activeConflict) return null;

  const { draft, serverSession, reason, removedStudentIds } = activeConflict;
  const diffs = draft.records.filter((record) => {
    const serverRecord = serverSession.records.find((item) => item.studentId === record.studentId);
    return serverRecord && serverRecord.status !== record.status;
  });

  return (
    <Modal animationType="slide" transparent visible onRequestClose={() => void dismissConflict()}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Senkron çakışması</Text>
          <Text style={styles.subtitle}>{conflictReasonLabel(reason)}</Text>

          {removedStudentIds && removedStudentIds.length > 0 ? (
            <Text style={styles.warning}>
              {removedStudentIds.length} öğrenci artık listede yok; bu kayıtlar yok sayılabilir.
            </Text>
          ) : null}

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionTitle}>Yerel kayıtlarınız</Text>
            {draftHasLocalChanges(draft, serverSession) ? (
              diffs.map((record) => (
                <Text key={`local-${record.studentId}`} style={styles.line}>
                  {record.studentName ?? record.studentId}: {attendanceLabel(record.status)}
                </Text>
              ))
            ) : (
              <Text style={styles.lineMuted}>Fark bulunamadı.</Text>
            )}

            <Text style={[styles.sectionTitle, styles.sectionGap]}>Sunucu kayıtları</Text>
            {diffs.map((record) => {
              const serverRecord = serverSession.records.find((item) => item.studentId === record.studentId);
              if (!serverRecord) return null;
              return (
                <Text key={`server-${record.studentId}`} style={styles.line}>
                  {serverRecord.studentName}: {attendanceLabel(serverRecord.status)}
                </Text>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={() => void resolveConflictKeepServer()} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Sunucuyu kullan</Text>
            </Pressable>
            <Pressable onPress={() => void resolveConflictKeepLocal()} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Yerel kaydı gönder</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => void dismissConflict()} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Şimdilik beklet</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end"
  },
  sheet: {
    maxHeight: "78%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    gap: 10
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, lineHeight: 19, color: colors.textMuted, fontWeight: "600" },
  warning: { fontSize: 12, color: "#b45309", fontWeight: "700" },
  scroll: { maxHeight: 260 },
  scrollContent: { gap: 4, paddingBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase" },
  sectionGap: { marginTop: 10 },
  line: { fontSize: 13, color: colors.text, fontWeight: "600" },
  lineMuted: { fontSize: 13, color: colors.textMuted },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f8fafc"
  },
  secondaryText: { color: colors.text, fontWeight: "700", fontSize: 14 },
  dismissBtn: { alignItems: "center", paddingVertical: 8 },
  dismissText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 }
});
