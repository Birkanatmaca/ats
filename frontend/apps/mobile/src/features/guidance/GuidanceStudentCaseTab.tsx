import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FolderOpen, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GuidanceCaseCreateSheet } from "@/features/guidance/GuidanceCaseCreateSheet";
import { casePriorityLabel, casePriorityTone, caseStatusLabel } from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { useAuth } from "@/shared/auth/AuthContext";
import { colors } from "@/shared/theme/colors";
import { EmptyState } from "@/shared/ui/EmptyState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";

type Props = {
  studentId: string;
};

export function GuidanceStudentCaseTab({ studentId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canEdit = session?.principal.role === "guidance";
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const summaryQ = useQuery({
    queryKey: queryKeys.guidanceStudentCaseSummary(studentId),
    queryFn: () => api.guidanceStudentCaseSummary(studentId)
  });
  const studentsQ = useQuery({ queryKey: queryKeys.guidanceStudents, queryFn: () => api.guidanceStudents() });

  const createMut = useMutation({
    mutationFn: api.createGuidanceCase,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceStudentCaseSummary(studentId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceCases });
      setCreateOpen(false);
      router.push(`/(app)/guidance/cases/${created.id}`);
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Vaka oluşturulamadı.")
  });

  if (summaryQ.isLoading) return <LoadingBlock />;

  const summary = summaryQ.data;
  const cases = summary?.cases ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <FolderOpen color="#7c3aed" size={18} strokeWidth={2.2} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>Aktif vaka: {summary?.activeCaseCount ?? 0}</Text>
          <Text style={styles.summaryMeta}>
            Kritik: {summary?.criticalCount ?? 0} · Açık plan: {summary?.openPlanCount ?? 0}
          </Text>
        </View>
        {canEdit ? (
          <Pressable onPress={() => setCreateOpen(true)} style={styles.addBtn}>
            <Plus color="#fff" size={16} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      {cases.length === 0 ? (
        <EmptyState
          message={canEdit ? "Bu öğrenci için vaka açarak süreci tek dosyada yönetebilirsiniz." : "Bu öğrenci için aktif vaka yok."}
          title="Vaka dosyası yok"
        />
      ) : (
        cases.map((item) => {
          const tone = casePriorityTone(item.priority);
          return (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/(app)/guidance/cases/${item.id}`)}
              style={styles.caseCard}
            >
              <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                <Text style={[styles.badgeText, { color: tone.text }]}>{casePriorityLabel(item.priority)}</Text>
              </View>
              <Text style={styles.caseTitle}>{item.title}</Text>
              <Text style={styles.caseMeta}>{caseStatusLabel(item.status)} · {item.ownerName}</Text>
              <Text numberOfLines={2} style={styles.caseSummary}>
                {item.masked ? "[Gizli özet]" : item.summary}
              </Text>
            </Pressable>
          );
        })
      )}

      <GuidanceCaseCreateSheet
        error={createError}
        initialStudentId={studentId}
        loading={createMut.isPending}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSubmit={(payload) => createMut.mutate(payload)}
        open={createOpen}
        students={studentsQ.data ?? []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f5f3ff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    padding: 12
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center"
  },
  summaryCopy: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 14, fontWeight: "800", color: "#5b21b6" },
  summaryMeta: { fontSize: 12, color: "#6d28d9", fontWeight: "600" },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center"
  },
  caseCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4
  },
  badge: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "800" },
  caseTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  caseMeta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  caseSummary: { fontSize: 13, lineHeight: 18, color: colors.text }
});
