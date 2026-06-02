import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Users } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { StudentImportRow } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";

export function PrincipalStudentImportDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const jobQuery = useQuery({
    queryKey: queryKeys.studentImportJob(jobId ?? ""),
    queryFn: () => api.getStudentImportJob(jobId ?? ""),
    enabled: Boolean(jobId)
  });

  const rowsQuery = useQuery({
    queryKey: [...queryKeys.studentImportJob(jobId ?? ""), "rows"],
    queryFn: () => api.listStudentImportRows(jobId ?? ""),
    enabled: Boolean(jobId)
  });

  const previewQuery = useQuery({
    queryKey: [...queryKeys.studentImportJob(jobId ?? ""), "preview"],
    queryFn: () => api.previewStudentImportJob(jobId ?? ""),
    enabled: Boolean(jobId) && jobQuery.data?.status === "ready"
  });

  const problemRows = useMemo(
    () => (rowsQuery.data ?? []).filter((row) => row.status === "error" || row.status === "warning"),
    [rowsQuery.data]
  );

  const commitMut = useMutation({
    mutationFn: () => api.commitStudentImportJob(jobId ?? ""),
    onSuccess: async (result) => {
      setActionSuccess(`${result.createdStudents} öğrenci eklendi.`);
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.studentImportJobs }),
        queryClient.invalidateQueries({ queryKey: queryKeys.studentImportJob(jobId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.principalRoster })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Commit başarısız.");
      setActionSuccess(null);
    }
  });

  const rollbackMut = useMutation({
    mutationFn: () => api.rollbackStudentImportJob(jobId ?? ""),
    onSuccess: async () => {
      setActionSuccess("Import geri alındı; eklenen öğrenciler pasifleştirildi.");
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.studentImportJobs }),
        queryClient.invalidateQueries({ queryKey: queryKeys.studentImportJob(jobId ?? "") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.principalRoster })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Geri alma başarısız.");
      setActionSuccess(null);
    }
  });

  const loading = jobQuery.isLoading || rowsQuery.isLoading;
  const error = jobQuery.error ?? rowsQuery.error;

  return (
    <Screen refreshing={jobQuery.isRefetching || rowsQuery.isRefetching} onRefresh={() => void Promise.all([jobQuery.refetch(), rowsQuery.refetch()])}>
      <DetailBackBar label="Import detayı" />

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorState message={error.message} onRetry={() => void Promise.all([jobQuery.refetch(), rowsQuery.refetch()])} /> : null}

      {!loading && !error && jobQuery.data ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.fileName}>{jobQuery.data.fileName}</Text>
            <Text style={styles.summaryMeta}>
              {jobQuery.data.validRows} geçerli · {jobQuery.data.warningRows} uyarı · {jobQuery.data.errorRows} hata
            </Text>
            {previewQuery.data ? (
              <Text style={styles.previewLine}>
                Onay sonrası {previewQuery.data.studentsToCreate} öğrenci
                {previewQuery.data.guardiansToInvite > 0 ? `, ${previewQuery.data.guardiansToInvite} veli daveti` : ""} oluşturulacak.
              </Text>
            ) : null}
          </View>

          {actionError ? (
            <View style={styles.bannerError}>
              <AlertTriangle color={colors.danger} size={16} />
              <Text style={styles.bannerErrorText}>{actionError}</Text>
            </View>
          ) : null}
          {actionSuccess ? (
            <View style={styles.bannerSuccess}>
              <CheckCircle2 color="#047857" size={16} />
              <Text style={styles.bannerSuccessText}>{actionSuccess}</Text>
            </View>
          ) : null}

          {jobQuery.data.status === "ready" ? (
            <Pressable
              disabled={commitMut.isPending}
              onPress={() => commitMut.mutate()}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, commitMut.isPending && styles.btnDisabled]}
            >
              <Users color="#fff" size={18} strokeWidth={2.2} />
              <Text style={styles.primaryBtnText}>{commitMut.isPending ? "Aktarılıyor..." : "Onayla ve aktar"}</Text>
            </Pressable>
          ) : null}

          {jobQuery.data.status === "completed" ? (
            <Pressable
              disabled={rollbackMut.isPending}
              onPress={() => rollbackMut.mutate()}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed, rollbackMut.isPending && styles.btnDisabled]}
            >
              <Text style={styles.secondaryBtnText}>{rollbackMut.isPending ? "Geri alınıyor..." : "Importu geri al"}</Text>
            </Pressable>
          ) : null}

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Hata ve uyarı satırları</Text>
            <Text style={styles.sectionMeta}>{problemRows.length} kayıt</Text>
          </View>

          {problemRows.length === 0 ? (
            <Text style={styles.emptyHint}>Hata veya uyarılı satır yok.</Text>
          ) : (
            <View style={styles.rowList}>
              {problemRows.map((row) => (
                <ImportRowCard key={row.id} row={row} />
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function ImportRowCard({ row }: { row: StudentImportRow }) {
  const isError = row.status === "error";
  return (
    <View style={[styles.rowCard, isError ? styles.rowCardError : styles.rowCardWarning]}>
      <View style={styles.rowCardHead}>
        <Text style={styles.rowNumber}>Satır {row.rowNumber}</Text>
        <Text style={[styles.rowStatus, isError ? styles.rowStatusError : styles.rowStatusWarning]}>{isError ? "Hata" : "Uyarı"}</Text>
      </View>
      <Text style={styles.rowStudent}>
        {row.normalizedData.firstName} {row.normalizedData.lastName} · No {row.normalizedData.schoolNumber || "—"}
      </Text>
      {row.normalizedData.className ? <Text style={styles.rowClass}>{row.normalizedData.className}</Text> : null}
      {row.errorMessages.length > 0 ? (
        <Text style={styles.rowMessages}>{row.errorMessages.join(" · ")}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6
  },
  fileName: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text
  },
  summaryMeta: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500"
  },
  previewLine: {
    marginTop: 4,
    fontSize: 13,
    color: colors.primaryLight,
    fontWeight: "600",
    lineHeight: 18
  },
  bannerError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  bannerErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600"
  },
  bannerSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0"
  },
  bannerSuccessText: {
    flex: 1,
    color: "#047857",
    fontSize: 13,
    fontWeight: "600"
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14
  },
  primaryBtnPressed: {
    opacity: 0.92
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13
  },
  secondaryBtnPressed: {
    backgroundColor: colors.accentLight
  },
  secondaryBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800"
  },
  btnDisabled: {
    opacity: 0.6
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600"
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500"
  },
  rowList: {
    gap: 8
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4
  },
  rowCardError: {
    backgroundColor: "#fff5f5",
    borderColor: "#fecaca"
  },
  rowCardWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a"
  },
  rowCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  rowNumber: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted
  },
  rowStatus: {
    fontSize: 11,
    fontWeight: "800",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden"
  },
  rowStatusError: {
    color: colors.danger,
    backgroundColor: "#fee2e2"
  },
  rowStatusWarning: {
    color: "#b45309",
    backgroundColor: "#fef3c7"
  },
  rowStudent: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text
  },
  rowClass: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500"
  },
  rowMessages: {
    fontSize: 12,
    color: colors.danger,
    lineHeight: 17,
    fontWeight: "500"
  }
});
