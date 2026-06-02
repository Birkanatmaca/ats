import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { formatDate, notificationKindLabel } from "@/shared/utils/labels";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  kind: string;
  readAt: string | null;
  createdAt: string;
};

type FilterMode = "all" | "unread";

const KIND_TONES: Record<string, { bg: string; border: string; text: string }> = {
  absence: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  attendance: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  announcement: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  observation: { bg: "#faf5ff", border: "#ddd6fe", text: "#6d28d9" },
  default: { bg: "#fdf2f8", border: "#fbcfe8", text: "#db2777" }
};

function kindTone(kind: string) {
  const normalized = kind.toLowerCase();
  if (normalized.includes("absence") || normalized.includes("attendance")) return KIND_TONES.absence;
  if (normalized.includes("announcement")) return KIND_TONES.announcement;
  if (normalized.includes("observation")) return KIND_TONES.observation;
  return KIND_TONES.default;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "Az önce";
  if (diffMins < 60) return `${diffMins} dk önce`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return `${diffDays} gün önce`;
  return formatDate(value);
}

export function NotificationsScreen({ mode }: { mode: "user" | "guardian" }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

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

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      mode === "guardian" ? api.guardianNotificationDelete(id) : api.notificationDelete(id),
    onSuccess: (_data, id) => {
      setExpandedId((current) => (current === id ? null : current));
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(mode) });
    }
  });

  function confirmDelete(item: NotificationItem) {
    Alert.alert("Bildirimi sil", `"${item.title}" bildirimini silmek istediğinize emin misiniz?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => deleteMut.mutate(item.id)
      }
    ]);
  }

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((item) => {
      if (filter === "unread" && item.readAt) return false;
      if (!q) return true;
      return `${item.title} ${item.body} ${notificationKindLabel(item.kind)}`.toLowerCase().includes(q);
    });
  }, [notifications, filter, search]);

  async function markAll() {
    setMarkingAll(true);
    try {
      for (const n of notifications) {
        if (!n.readAt) {
          try {
            await (mode === "guardian" ? api.guardianNotificationMarkRead(n.id) : api.notificationMarkRead(n.id));
          } catch {
            /* skip */
          }
        }
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(mode) });
    } finally {
      setMarkingAll(false);
    }
  }

  if (query.isLoading) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Daha Fazla" />
        <LoadingBlock />
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Daha Fazla" />
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen layout="stack" refreshing={query.isRefetching} topInsetExtra={6} onRefresh={() => void query.refetch()}>
      <DetailBackBar label="Daha Fazla" />

      <View style={styles.heroShell}>
        <View
          style={[
            styles.hero,
            platformShadow("0 14px 32px rgba(219,39,119,0.18)", {
              shadowColor: "#db2777",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.16,
              shadowRadius: 18,
              elevation: 8
            })
          ]}
        >
          <View style={[styles.heroBlob, styles.heroBlobPink, { pointerEvents: "none" }]} />
          <View style={[styles.heroBlob, styles.heroBlobRose, { pointerEvents: "none" }]} />

          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <BellRing color="#fff" size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Bildirimler</Text>
              <Text style={styles.heroSubtitle}>Okul aktivitelerini ve uyarıları takip edin</Text>
            </View>
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{notifications.length}</Text>
              <Text style={styles.heroStatLabel}>toplam</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{unreadCount}</Text>
              <Text style={styles.heroStatLabel}>okunmamış</Text>
            </View>
          </View>

          <Pressable
            disabled={unreadCount === 0 || markingAll}
            onPress={() => void markAll()}
            style={({ pressed }) => [styles.heroActionBtn, (unreadCount === 0 || markingAll) && styles.heroActionBtnDisabled, pressed && styles.btnPressed]}
          >
            {markingAll ? (
              <ActivityIndicator color="#db2777" />
            ) : (
              <>
                <CheckCheck color="#db2777" size={18} strokeWidth={2.2} />
                <Text style={styles.heroActionBtnText}>Tümünü okundu işaretle</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.filtersCard}>
        <View style={styles.searchWrap}>
          <Search color={colors.textMuted} size={18} strokeWidth={2} />
          <TextInput
            onChangeText={setSearch}
            placeholder="Bildirim ara..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={search}
          />
        </View>

        <View style={styles.filterRow}>
          <Pressable onPress={() => setFilter("all")} style={[styles.filterChip, filter === "all" && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, filter === "all" && styles.filterChipTextActive]}>Tümü</Text>
          </Pressable>
          <Pressable onPress={() => setFilter("unread")} style={[styles.filterChip, filter === "unread" && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, filter === "unread" && styles.filterChipTextActive]}>Okunmamış</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.listHead}>
        <Text style={styles.listTitle}>Bildirim listesi</Text>
        <Text style={styles.listCount}>{filtered.length} kayıt</Text>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            notifications.length === 0
              ? "Henüz bir bildiriminiz bulunmuyor."
              : filter === "unread"
                ? "Okunmamış bildirim kalmadı."
                : "Aramaya uyan bildirim bulunamadı."
          }
          title={notifications.length === 0 ? "Bildirim yok" : "Sonuç bulunamadı"}
        />
      ) : (
        filtered.map((item) => (
          <NotificationCard
            key={item.id}
            deleting={deleteMut.isPending && deleteMut.variables === item.id}
            expanded={expandedId === item.id}
            item={item}
            marking={markMut.isPending && markMut.variables === item.id}
            onDelete={() => confirmDelete(item)}
            onMarkRead={() => {
              if (!item.readAt) markMut.mutate(item.id);
            }}
            onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
          />
        ))
      )}
    </Screen>
  );
}

function NotificationCard({
  item,
  expanded,
  marking,
  deleting,
  onToggle,
  onMarkRead,
  onDelete
}: {
  item: NotificationItem;
  expanded: boolean;
  marking: boolean;
  deleting: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const tone = kindTone(item.kind);
  const unread = !item.readAt;
  const preview = item.body.length > 120 && !expanded ? `${item.body.slice(0, 120)}…` : item.body;

  return (
    <View style={[styles.card, unread && styles.cardUnread]}>
      <View style={[styles.cardStripe, { backgroundColor: unread ? tone.text : colors.border }]} />

      <Pressable
        onPress={() => {
          onToggle();
          if (unread) onMarkRead();
        }}
        style={({ pressed }) => [styles.cardBody, pressed && styles.cardPressed]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <Bell color={tone.text} size={16} strokeWidth={2.2} />
          </View>
          <View style={styles.cardHeadCopy}>
            <View style={styles.titleRow}>
              <Text style={[styles.cardTitle, unread && styles.cardTitleUnread]} numberOfLines={expanded ? undefined : 2}>
                {item.title}
              </Text>
              {unread ? <View style={styles.newDot} /> : null}
            </View>
            <View style={styles.cardMetaRow}>
              <View style={[styles.kindPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                <Text style={[styles.kindPillText, { color: tone.text }]}>{notificationKindLabel(item.kind)}</Text>
              </View>
              <Text style={styles.dateText}>{formatRelativeDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <Pressable
              accessibilityLabel="Bildirimi sil"
              accessibilityRole="button"
              disabled={deleting}
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation?.();
                onDelete();
              }}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed, deleting && styles.deleteBtnDisabled]}
            >
              {deleting ? (
                <ActivityIndicator color="#dc2626" size="small" />
              ) : (
                <Trash2 color="#dc2626" size={16} strokeWidth={2.2} />
              )}
            </Pressable>
            {expanded ? (
              <ChevronUp color={colors.textMuted} size={18} strokeWidth={2.2} />
            ) : (
              <ChevronDown color={colors.textMuted} size={18} strokeWidth={2.2} />
            )}
          </View>
        </View>

        <Text style={[styles.cardContent, expanded && styles.cardContentExpanded]}>{preview}</Text>

        {!expanded && item.body.length > 120 ? <Text style={styles.readMore}>Devamını oku</Text> : null}
        {expanded ? (
          <View style={styles.expandedFooter}>
            <Text style={styles.fullDate}>{formatDate(item.createdAt)} · {item.readAt ? "Okundu" : "Yeni"}</Text>
            <Pressable
              disabled={deleting}
              onPress={(event) => {
                event.stopPropagation?.();
                onDelete();
              }}
              style={({ pressed }) => [styles.deleteTextBtn, pressed && styles.deleteBtnPressed, deleting && styles.deleteBtnDisabled]}
            >
              <Trash2 color="#dc2626" size={14} strokeWidth={2.2} />
              <Text style={styles.deleteTextBtnLabel}>Sil</Text>
            </Pressable>
          </View>
        ) : null}
        {marking ? <ActivityIndicator color={colors.accent} style={styles.marking} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginBottom: 12 },
  hero: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#db2777",
    overflow: "hidden",
    gap: 14
  },
  heroBlob: { position: "absolute", borderRadius: 999 },
  heroBlobPink: { width: 120, height: 120, backgroundColor: "rgba(255,255,255,0.14)", top: -28, right: -18 },
  heroBlobRose: { width: 88, height: 88, backgroundColor: "rgba(251,113,133,0.35)", bottom: -18, left: -8 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.86)", fontWeight: "500" },
  unreadBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  unreadBadgeText: { fontSize: 13, fontWeight: "800", color: "#db2777" },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.78)", fontWeight: "600" },
  heroStatDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.2)" },
  heroActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 13
  },
  heroActionBtnDisabled: { opacity: 0.55 },
  heroActionBtnText: { color: "#db2777", fontWeight: "800", fontSize: 15 },
  btnPressed: { opacity: 0.92 },
  filtersCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
    marginBottom: 12
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  filterChipActive: { backgroundColor: "#fdf2f8", borderColor: "#db2777" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  filterChipTextActive: { color: "#be185d" },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  listTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  listCount: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: "hidden"
  },
  cardUnread: { borderColor: "#fbcfe8", backgroundColor: "#fffbfd" },
  cardPressed: { opacity: 0.94 },
  cardStripe: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardActions: { alignItems: "center", gap: 8 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center"
  },
  deleteBtnPressed: { opacity: 0.82 },
  deleteBtnDisabled: { opacity: 0.55 },
  deleteTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2"
  },
  deleteTextBtnLabel: { fontSize: 12, fontWeight: "800", color: "#dc2626" },
  expandedFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  cardHeadCopy: { flex: 1, gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text, lineHeight: 20 },
  cardTitleUnread: { fontWeight: "800", color: colors.text },
  newDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: "#db2777", marginTop: 6 },
  cardMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  kindPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  kindPillText: { fontSize: 11, fontWeight: "800" },
  dateText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  cardContent: { fontSize: 14, lineHeight: 21, color: colors.textMuted, fontWeight: "500" },
  cardContentExpanded: { color: colors.text },
  readMore: { fontSize: 12, fontWeight: "800", color: "#db2777" },
  fullDate: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  marking: { alignSelf: "flex-start" }
});
