import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileSpreadsheet } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { StudentImportJob } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { formatDate } from "@/shared/utils/labels";

const STATUS_LABELS: Record<StudentImportJob["status"], string> = {
  draft: "Taslak",
  validating: "Doğrulanıyor",
  ready: "Onay bekliyor",
  importing: "Aktarılıyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal"
};

const STATUS_TONES: Record<StudentImportJob["status"], { bg: string; text: string }> = {
  draft: { bg: "#f1f5f9", text: "#475569" },
  validating: { bg: "#eff6ff", text: "#2563eb" },
  ready: { bg: "#fff7ed", text: "#c2410c" },
  importing: { bg: "#eff6ff", text: "#2563eb" },
  completed: { bg: "#ecfdf5", text: "#047857" },
  failed: { bg: "#fef2f2", text: "#dc2626" },
  cancelled: { bg: "#f1f5f9", text: "#64748b" }
};

export function PrincipalStudentImportsScreen() {
  const router = useRouter();
  const query = useQuery({
    queryKey: queryKeys.studentImportJobs,
    queryFn: () => api.listStudentImportJobs()
  });

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <DetailBackBar label="Öğrenci import geçmişi" />

      <View style={styles.hintCard}>
        <FileSpreadsheet color={colors.accent} size={18} strokeWidth={2.2} />
        <Text style={styles.hintText}>
          Excel/CSV yükleme web panelinden yapılır. Burada import işlerini inceleyip onaylayabilirsiniz.
        </Text>
      </View>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}

      {!query.isLoading && !query.isError && (query.data?.length ?? 0) === 0 ? (
        <EmptyState title="Import geçmişi yok" message="Web panelinden öğrenci listesi yüklediğinizde işlemler burada görünür." />
      ) : null}

      {!query.isLoading && !query.isError && (query.data?.length ?? 0) > 0 ? (
        <View style={styles.list}>
          {(query.data ?? []).map((job) => (
            <ImportJobRow key={job.id} job={job} onPress={() => router.push(`/(app)/principal/student-imports/${job.id}` as never)} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function ImportJobRow({ job, onPress }: { job: StudentImportJob; onPress: () => void }) {
  const tone = STATUS_TONES[job.status] ?? STATUS_TONES.draft;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowMain}>
        <Text numberOfLines={1} style={styles.fileName}>
          {job.fileName}
        </Text>
        <Text style={styles.meta}>
          {formatDate(job.createdAt)} · {job.totalRows} satır · {job.validRows} geçerli
        </Text>
        {job.errorRows > 0 ? <Text style={styles.errorMeta}>{job.errorRows} hatalı satır</Text> : null}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
        <Text style={[styles.statusText, { color: tone.text }]}>{STATUS_LABELS[job.status]}</Text>
      </View>
      <ChevronRight color={colors.textMuted} size={18} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.accentLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primaryLight,
    fontWeight: "500"
  },
  list: {
    gap: 8
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  rowPressed: {
    backgroundColor: colors.accentLight
  },
  rowMain: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  fileName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500"
  },
  errorMeta: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: "600"
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800"
  }
});
