import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getClassTone } from "@/features/principal/classUtils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { AttendanceRecord, ClassAttendanceStudent } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { SearchBar } from "@/shared/ui/SearchBar";
import { platformShadow } from "@/shared/ui/platformShadow";
import { attendanceLabel } from "@/shared/utils/labels";

type Status = AttendanceRecord["status"];
const statuses: Status[] = ["present", "absent", "late", "excused"];

const statusColors: Record<Status, string> = {
  present: "#16a34a",
  absent: "#dc2626",
  late: "#d97706",
  excused: colors.accent,
  unknown: "#94a3b8"
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function studentName(student: ClassAttendanceStudent) {
  return `${student.firstName} ${student.lastName}`.trim();
}

export function PrincipalClassAttendanceScreen() {
  const { classId, date: dateParam, sectionName, className: classNameParam } = useLocalSearchParams<{
    classId: string;
    date?: string;
    sectionName?: string;
    className?: string;
  }>();
  const date = dateParam && dateParam.length >= 10 ? dateParam.slice(0, 10) : todayIso();
  const queryClient = useQueryClient();
  const [records, setRecords] = useState<ClassAttendanceStudent[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "error" | null>(null);
  const [dirty, setDirty] = useState(false);

  const sheetQ = useQuery({
    queryKey: queryKeys.principalClassAttendance(classId, date),
    queryFn: () => api.principalClassAttendance(classId, date),
    enabled: Boolean(classId)
  });

  useEffect(() => {
    if (sheetQ.data?.students) {
      setRecords(sheetQ.data.students);
      setDirty(false);
    }
  }, [sheetQ.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.savePrincipalClassAttendance(
        classId,
        date,
        records.map((r) => ({ studentId: r.studentId, status: r.status }))
      ),
    onSuccess: (saved) => {
      setRecords(saved.students);
      setDirty(false);
      setMessage("Yoklama kaydedildi.");
      setMessageTone("ok");
      void queryClient.invalidateQueries({ queryKey: queryKeys.principalAttendanceToday(date) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.principalClassAttendance(classId, date) });
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : "Kayıt başarısız.");
      setMessageTone("error");
    }
  });

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    if (!q) return records;
    return records.filter(
      (r) =>
        studentName(r).toLocaleLowerCase("tr-TR").includes(q) ||
        r.schoolNumber.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [records, search]);

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unset = 0;
    for (const record of records) {
      if (record.status === "present") present++;
      else if (record.status === "absent" || record.status === "late") absent++;
      else if (record.status === "unknown") unset++;
    }
    return { present, absent, unset, total: records.length };
  }, [records]);

  const updateStatus = useCallback((studentId: string, status: Status) => {
    setRecords((current) =>
      current.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
    setDirty(true);
    setMessage(null);
    setMessageTone(null);
  }, []);

  const markAllPresent = () => {
    setRecords((current) => current.map((r) => ({ ...r, status: "present" as const })));
    setDirty(true);
    setMessage(null);
    setMessageTone(null);
  };

  const displayClassName = sheetQ.data?.className ?? classNameParam ?? "Sınıf";
  const displaySection = sectionName ? `Şube ${sectionName}` : "Yoklama";
  const tone = getClassTone(displayClassName);
  const canEdit = sheetQ.data?.canEdit ?? false;

  if (sheetQ.isLoading) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Yoklama" />
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen layout="stack" refreshing={sheetQ.isRefetching} onRefresh={() => void sheetQ.refetch()}>
      <DetailBackBar label="Yoklama" />

      {sheetQ.isError ? <ErrorState message={sheetQ.error.message} onRetry={() => void sheetQ.refetch()} /> : null}

      {!sheetQ.isError ? (
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
              <Text style={[styles.heroBadgeText, { color: tone.color }]}>{sectionName ?? "•"}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{displayClassName}</Text>
              <Text style={styles.heroSubtitle}>{displaySection} · {date}</Text>
              <Text style={styles.heroMeta}>
                {stats.present} geldi · {stats.absent} devamsız · {stats.unset} işaretlenmedi
              </Text>
            </View>
          </View>

          {sheetQ.data?.message ? <Text style={styles.info}>{sheetQ.data.message}</Text> : null}
          {message ? <Text style={messageTone === "error" ? styles.error : styles.ok}>{message}</Text> : null}

          <SearchBar onChangeText={setSearch} placeholder="Öğrenci ara..." value={search} />

          {canEdit ? (
            <View style={styles.actions}>
              <Pressable onPress={markAllPresent} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Hepsi geldi</Text>
              </Pressable>
              <Pressable
                disabled={saveMutation.isPending || !dirty}
                onPress={() => saveMutation.mutate()}
                style={[styles.primaryBtn, (!dirty || saveMutation.isPending) && styles.primaryBtnDisabled]}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Kaydet</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Text style={styles.readonly}>Bu sınıf için yoklama düzenleme kullanılamıyor.</Text>
          )}

          {filteredRecords.map((record) => (
            <View key={record.studentId} style={styles.studentRow}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{studentName(record)}</Text>
                <Text style={styles.studentNo}>No {record.schoolNumber || "—"}</Text>
              </View>
              <View style={styles.statusRow}>
                {statuses.map((status) => (
                  <Pressable
                    key={status}
                    disabled={!canEdit}
                    onPress={() => updateStatus(record.studentId, status)}
                    style={[
                      styles.statusBtn,
                      record.status === status && {
                        backgroundColor: statusColors[status],
                        borderColor: statusColors[status]
                      },
                      !canEdit && styles.statusBtnDisabled
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        record.status === status && styles.statusBtnTextActive
                      ]}
                    >
                      {attendanceLabel(status).slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          {filteredRecords.length === 0 ? (
            <Text style={styles.empty}>Bu sınıfta öğrenci bulunamadı.</Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    marginBottom: 12
  },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  heroBadgeText: { fontSize: 18, fontWeight: "800" },
  heroCopy: { flex: 1, gap: 3 },
  heroTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  heroSubtitle: { fontSize: 13, color: colors.textMuted },
  heroMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  info: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  ok: { fontSize: 13, color: "#16a34a", marginBottom: 8 },
  error: { fontSize: 13, color: "#dc2626", marginBottom: 8 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryBtnText: { fontWeight: "700", color: colors.text },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { fontWeight: "700", color: "#fff" },
  readonly: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  studentRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 10
  },
  studentInfo: { gap: 2 },
  studentName: { fontSize: 15, fontWeight: "700", color: colors.text },
  studentNo: { fontSize: 12, color: colors.textMuted },
  statusRow: { flexDirection: "row", gap: 6 },
  statusBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: colors.background
  },
  statusBtnDisabled: { opacity: 0.5 },
  statusBtnText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  statusBtnTextActive: { color: "#fff" },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 20 }
});
