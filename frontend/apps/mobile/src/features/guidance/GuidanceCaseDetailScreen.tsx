import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Plus, RotateCcw, ShieldAlert } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { GuidanceCaseEventSheet } from "@/features/guidance/GuidanceCaseEventSheet";
import { casePriorityLabel, casePriorityTone, caseStatusLabel, caseTimelineTypeLabel } from "@/features/guidance/utils";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { useAuth } from "@/shared/auth/AuthContext";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { formatDate } from "@/shared/utils/labels";

export function GuidanceCaseDetailScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [eventOpen, setEventOpen] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const canEdit = session?.principal.role === "guidance";

  const caseQ = useQuery({
    queryKey: queryKeys.guidanceCase(caseId!),
    queryFn: () => api.guidanceCase(caseId!),
    enabled: Boolean(caseId)
  });
  const timelineQ = useQuery({
    queryKey: queryKeys.guidanceCaseTimeline(caseId!),
    queryFn: () => api.guidanceCaseTimeline(caseId!),
    enabled: Boolean(caseId)
  });

  const closeMut = useMutation({
    mutationFn: () => api.closeGuidanceCase(caseId!),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceCase(caseId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceCases });
      if (result.warnings?.length) {
        Alert.alert("Vaka kapatıldı", result.warnings.join("\n"));
      }
    }
  });

  const reopenMut = useMutation({
    mutationFn: () => api.reopenGuidanceCase(caseId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceCase(caseId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceCases });
    }
  });

  const createEventMut = useMutation({
    mutationFn: (payload: Parameters<typeof api.createGuidanceCaseEvent>[1]) =>
      api.createGuidanceCaseEvent(caseId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.guidanceCaseTimeline(caseId!) });
      setEventOpen(false);
      setEventError(null);
    },
    onError: (err) => setEventError(err instanceof Error ? err.message : "Kayıt eklenemedi.")
  });

  const onRefresh = () => {
    void caseQ.refetch();
    void timelineQ.refetch();
  };

  if (caseQ.isLoading) {
    return (
      <Screen layout="stack">
        <LoadingBlock />
      </Screen>
    );
  }

  const item = caseQ.data;
  if (caseQ.isError || !item) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Vaka dosyası" />
        <ErrorState message={caseQ.error?.message ?? "Vaka bulunamadı."} onRetry={onRefresh} />
      </Screen>
    );
  }

  const tone = casePriorityTone(item.priority);
  const isClosed = item.status === "closed";

  return (
    <Screen layout="stack" refreshing={caseQ.isRefetching || timelineQ.isRefetching} onRefresh={onRefresh}>
      <DetailBackBar label="Vaka dosyası" />

      <View style={styles.hero}>
        <View style={[styles.priorityBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <ShieldAlert color={tone.text} size={14} strokeWidth={2.2} />
          <Text style={[styles.priorityText, { color: tone.text }]}>{casePriorityLabel(item.priority)}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>
          {item.studentName} · {item.className} · {caseStatusLabel(item.status)}
        </Text>
        <Text style={styles.summary}>{item.masked ? "[Gizli özet — rehberlik görüşmesi gerekir]" : item.summary}</Text>
        <Text style={styles.owner}>Sorumlu: {item.ownerName}</Text>
      </View>

      {canEdit ? (
        <View style={styles.actions}>
          {!isClosed ? (
            <>
              <Pressable onPress={() => setEventOpen(true)} style={styles.primaryBtn}>
                <Plus color="#fff" size={16} strokeWidth={2.2} />
                <Text style={styles.primaryText}>Kayıt ekle</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert("Vakayı kapat", "Kapalı vakaya yeni kayıt eklenemez. Devam edilsin mi?", [
                    { text: "İptal", style: "cancel" },
                    { text: "Kapat", style: "destructive", onPress: () => closeMut.mutate() }
                  ])
                }
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryText}>Kapat</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => reopenMut.mutate()} style={styles.primaryBtn}>
              <RotateCcw color="#fff" size={16} strokeWidth={2.2} />
              <Text style={styles.primaryText}>Yeniden aç</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Zaman çizelgesi</Text>
      {(timelineQ.data ?? []).length === 0 ? (
        <EmptyState message="Henüz kayıt yok." title="Timeline boş" />
      ) : (
        (timelineQ.data ?? []).map((item) => (
          <View key={`${item.source}-${item.id}`} style={styles.eventCard}>
            <View style={styles.eventTop}>
              <Text style={styles.eventType}>{caseTimelineTypeLabel(item)}</Text>
              <Text style={styles.eventDate}>{formatDate(item.occurredAt)}</Text>
            </View>
            <Text style={styles.eventTitle}>{item.masked ? "[Gizli kayıt]" : item.title || "—"}</Text>
            {item.body ? <Text style={styles.eventBody}>{item.masked ? "" : item.body}</Text> : null}
            <Text style={styles.eventActor}>{item.actorName}</Text>
          </View>
        ))
      )}

      <GuidanceCaseEventSheet
        error={eventError}
        loading={createEventMut.isPending}
        onClose={() => {
          setEventOpen(false);
          setEventError(null);
        }}
        onSubmit={(payload) => createEventMut.mutate(payload)}
        open={eventOpen}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#f5f3ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    padding: 14,
    gap: 8
  },
  priorityBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  priorityText: { fontSize: 11, fontWeight: "800" },
  title: { fontSize: 20, fontWeight: "800", color: "#5b21b6" },
  meta: { fontSize: 13, color: "#6d28d9", fontWeight: "600" },
  summary: { fontSize: 14, lineHeight: 20, color: colors.text },
  owner: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 12
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "#f8fafc"
  },
  secondaryText: { color: colors.text, fontWeight: "700" },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase" },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4
  },
  eventTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eventType: { fontSize: 11, fontWeight: "800", color: "#7c3aed", textTransform: "uppercase" },
  eventDate: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  eventTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  eventBody: { fontSize: 13, lineHeight: 19, color: colors.text },
  eventActor: { fontSize: 11, color: colors.textMuted, fontWeight: "600", marginTop: 2 }
});
