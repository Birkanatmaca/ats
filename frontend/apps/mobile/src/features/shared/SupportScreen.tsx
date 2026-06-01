import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, HelpCircle, LifeBuoy, Plus, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SupportCreateSheet } from "@/features/shared/SupportCreateSheet";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { SupportTicket } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { formatDate, supportTicketStatusLabel, supportTicketTypeLabel } from "@/shared/utils/labels";

type StatusFilter = "all" | "open" | "resolved";

const STATUS_TONES: Record<string, { bg: string; border: string; text: string }> = {
  open: { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" },
  in_review: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  resolved: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
  closed: { bg: "#f8fafc", border: "#cbd5e1", text: "#64748b" }
};

const TYPE_TONES: Record<string, { bg: string; text: string }> = {
  support: { bg: "#f0fdfa", text: "#0f766e" },
  complaint: { bg: "#fef2f2", text: "#b91c1c" },
  suggestion: { bg: "#faf5ff", text: "#6d28d9" },
  report: { bg: "#fff7ed", text: "#c2410c" }
};

function statusTone(status: string) {
  return STATUS_TONES[status] ?? STATUS_TONES.open;
}

function typeTone(type: string) {
  return TYPE_TONES[type] ?? { bg: colors.accentLight, text: colors.accent };
}

function computeStats(tickets: SupportTicket[]) {
  const open = tickets.filter((t) => t.status === "open" || t.status === "in_review").length;
  const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  return { total: tickets.length, open, resolved };
}

export function SupportScreen() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery({ queryKey: queryKeys.supportTickets, queryFn: () => api.supportTickets() });

  const createMut = useMutation({
    mutationFn: (payload: { type: string; subject: string; message: string }) => api.createSupportTicket(payload),
    onSuccess: () => {
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets });
    },
    onError: (err) => {
      setCreateError(err instanceof Error ? err.message : "Talep gönderilemedi.");
    }
  });

  const tickets = query.data ?? [];
  const stats = useMemo(() => computeStats(tickets), [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((item) => {
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "open" && (item.status === "open" || item.status === "in_review")) ||
        (statusFilter === "resolved" && (item.status === "resolved" || item.status === "closed"));
      if (!statusMatch) return false;
      if (!q) return true;
      return `${item.subject} ${item.message} ${supportTicketTypeLabel(item.type)} ${supportTicketStatusLabel(item.status)}`
        .toLowerCase()
        .includes(q);
    });
  }, [tickets, search, statusFilter]);

  async function handleCreate(payload: { type: string; subject: string; message: string }) {
    setCreateError(null);
    await createMut.mutateAsync(payload);
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
    <>
      <Screen layout="stack" refreshing={query.isRefetching} topInsetExtra={6} onRefresh={() => void query.refetch()}>
        <DetailBackBar label="Daha Fazla" />

        <View style={styles.heroShell}>
          <View
            style={[
              styles.hero,
              platformShadow("0 14px 32px rgba(13,148,136,0.18)", {
                shadowColor: "#0d9488",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.16,
                shadowRadius: 18,
                elevation: 8
              })
            ]}
          >
            <View style={[styles.heroBlob, styles.heroBlobTeal, { pointerEvents: "none" }]} />
            <View style={[styles.heroBlob, styles.heroBlobMint, { pointerEvents: "none" }]} />

            <View style={styles.heroTop}>
              <View style={styles.heroIconWrap}>
                <LifeBuoy color="#fff" size={22} strokeWidth={2.2} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Destek</Text>
                <Text style={styles.heroSubtitle}>Talep oluşturun ve durumunu takip edin</Text>
              </View>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{stats.total}</Text>
                <Text style={styles.heroStatLabel}>toplam</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{stats.open}</Text>
                <Text style={styles.heroStatLabel}>açık</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{stats.resolved}</Text>
                <Text style={styles.heroStatLabel}>çözüldü</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
              style={({ pressed }) => [styles.heroAddBtn, pressed && styles.btnPressed]}
            >
              <Plus color="#fff" size={18} strokeWidth={2.4} />
              <Text style={styles.heroAddBtnText}>Yeni talep oluştur</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.searchWrap}>
            <Search color={colors.textMuted} size={18} strokeWidth={2} />
            <TextInput
              onChangeText={setSearch}
              placeholder="Konu veya mesaj ara..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              value={search}
            />
          </View>

          <View style={styles.filterRow}>
            {(
              [
                { key: "all", label: "Tümü" },
                { key: "open", label: "Açık" },
                { key: "resolved", label: "Çözüldü" }
              ] as const
            ).map((item) => {
              const active = statusFilter === item.key;
              return (
                <Pressable key={item.key} onPress={() => setStatusFilter(item.key)} style={[styles.filterChip, active && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.listHead}>
          <Text style={styles.listTitle}>Destek talepleri</Text>
          <Text style={styles.listCount}>{filtered.length} kayıt</Text>
        </View>

        {filtered.length === 0 ? (
          <EmptyState
            message={
              tickets.length === 0
                ? "Henüz bir destek talebiniz bulunmuyor. Yeni talep oluşturabilirsiniz."
                : "Arama veya filtreye uyan talep bulunamadı."
            }
            title={tickets.length === 0 ? "Talep yok" : "Sonuç bulunamadı"}
          />
        ) : (
          filtered.map((item) => (
            <TicketCard
              key={item.id}
              expanded={expandedId === item.id}
              item={item}
              onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
            />
          ))
        )}
      </Screen>

      <SupportCreateSheet
        error={createError}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        saving={createMut.isPending}
        visible={createOpen}
      />
    </>
  );
}

function TicketCard({ item, expanded, onToggle }: { item: SupportTicket; expanded: boolean; onToggle: () => void }) {
  const status = statusTone(item.status);
  const type = typeTone(item.type);
  const preview = item.message.length > 120 && !expanded ? `${item.message.slice(0, 120)}…` : item.message;

  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={[styles.cardStripe, { backgroundColor: status.text }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: type.bg }]}>
            <HelpCircle color={type.text} size={16} strokeWidth={2.2} />
          </View>
          <View style={styles.cardHeadCopy}>
            <Text style={styles.cardTitle}>{item.subject}</Text>
            <View style={styles.cardMetaRow}>
              <View style={[styles.typePill, { backgroundColor: type.bg }]}>
                <Text style={[styles.typePillText, { color: type.text }]}>{supportTicketTypeLabel(item.type)}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: status.bg, borderColor: status.border }]}>
                <Text style={[styles.statusPillText, { color: status.text }]}>{supportTicketStatusLabel(item.status)}</Text>
              </View>
            </View>
          </View>
          {expanded ? (
            <ChevronUp color={colors.textMuted} size={18} strokeWidth={2.2} />
          ) : (
            <ChevronDown color={colors.textMuted} size={18} strokeWidth={2.2} />
          )}
        </View>

        <Text style={[styles.cardContent, expanded && styles.cardContentExpanded]}>{preview}</Text>
        {!expanded && item.message.length > 120 ? <Text style={styles.readMore}>Devamını oku</Text> : null}
        {expanded ? <Text style={styles.fullDate}>{formatDate(item.createdAt)}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginBottom: 12 },
  hero: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#0d9488",
    overflow: "hidden",
    gap: 14
  },
  heroBlob: { position: "absolute", borderRadius: 999 },
  heroBlobTeal: { width: 120, height: 120, backgroundColor: "rgba(255,255,255,0.14)", top: -28, right: -18 },
  heroBlobMint: { width: 88, height: 88, backgroundColor: "rgba(45,212,191,0.35)", bottom: -18, left: -8 },
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
  heroAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 13
  },
  heroAddBtnText: { color: "#0f766e", fontWeight: "800", fontSize: 15 },
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
  filterChipActive: { backgroundColor: "#f0fdfa", borderColor: "#0d9488" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  filterChipTextActive: { color: "#0f766e" },
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
  cardPressed: { opacity: 0.94, backgroundColor: "#fafffe" },
  cardStripe: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  cardHeadCopy: { flex: 1, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text, lineHeight: 21 },
  cardMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  typePillText: { fontSize: 11, fontWeight: "800" },
  statusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: "800" },
  cardContent: { fontSize: 14, lineHeight: 21, color: colors.textMuted, fontWeight: "500" },
  cardContentExpanded: { color: colors.text },
  readMore: { fontSize: 12, fontWeight: "800", color: "#0d9488" },
  fullDate: { fontSize: 11, color: colors.textMuted, fontWeight: "600" }
});
