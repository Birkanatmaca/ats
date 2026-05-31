import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { formatDate, notificationKindLabel } from "@/shared/utils/labels";
import { colors } from "@/shared/theme/colors";

export function NotificationsScreen({ mode }: { mode: "user" | "guardian" }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const query = useQuery({
    queryKey: queryKeys.notifications(mode),
    queryFn: async () => {
      const items = mode === "guardian" ? await api.guardianNotifications() : await api.notifications();
      return (items ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        kind: n.kind,
        readAt: n.readAt ?? null,
        createdAt: n.createdAt
      }));
    }
  });

  const markMut = useMutation({
    mutationFn: (id: string) =>
      mode === "guardian" ? api.guardianNotificationMarkRead(id) : api.notificationMarkRead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(mode) })
  });

  const filtered = useMemo(() => {
    const list = query.data ?? [];
    if (filter === "unread") return list.filter((n) => !n.readAt);
    return list;
  }, [query.data, filter]);

  const unread = (query.data ?? []).filter((n) => !n.readAt).length;

  async function markAll() {
    for (const n of query.data ?? []) {
      if (!n.readAt) {
        try {
          await (mode === "guardian" ? api.guardianNotificationMarkRead(n.id) : api.notificationMarkRead(n.id));
        } catch {
          /* skip */
        }
      }
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(mode) });
  }

  return (
    <Screen title="Bildirimler" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <Pressable disabled={unread === 0} onPress={() => void markAll()} style={styles.markAll}>
        <Text style={styles.markAllText}>Tümünü okundu işaretle ({unread})</Text>
      </Pressable>
      <Pressable onPress={() => setFilter("all")} style={[styles.filter, filter === "all" && styles.filterOn]}>
        <Text style={[styles.filterText, filter === "all" && styles.filterTextOn]}>Tümü</Text>
      </Pressable>
      <Pressable onPress={() => setFilter("unread")} style={[styles.filter, filter === "unread" && styles.filterOn]}>
        <Text style={[styles.filterText, filter === "unread" && styles.filterTextOn]}>Okunmamış</Text>
      </Pressable>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {filtered.map((n) => (
        <ListCard
          key={n.id}
          meta={n.readAt ? "Okundu" : "Yeni"}
          onPress={!n.readAt ? () => markMut.mutate(n.id) : undefined}
          subtitle={n.body}
          title={`${n.title} · ${notificationKindLabel(n.kind)} · ${formatDate(n.createdAt)}`}
        />
      ))}
      {filtered.length === 0 && !query.isLoading ? <Text style={styles.empty}>Bildirim yok.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: { padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  markAllText: { fontWeight: "600", color: colors.accent, textAlign: "center" },
  filter: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  filterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: "600", color: colors.text },
  filterTextOn: { color: "#fff" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 16 }
});
