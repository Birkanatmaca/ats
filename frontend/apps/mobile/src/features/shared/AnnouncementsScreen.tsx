import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, ChevronDown, ChevronUp, Megaphone, Plus, Search, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AnnouncementCreateSheet } from "@/features/shared/AnnouncementCreateSheet";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { Announcement } from "@/shared/api/types";
import { useAuth } from "@/shared/auth/AuthContext";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { announcementAudienceLabel, formatDate } from "@/shared/utils/labels";

type AudienceFilter = "every" | "teachers" | "guardians" | "class";

const AUDIENCE_TONES: Record<string, { bg: string; border: string; text: string }> = {
  all: { bg: "#faf5ff", border: "#ddd6fe", text: "#6d28d9" },
  teachers: { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" },
  guardians: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
  class: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" }
};

function audienceTone(audience: string) {
  if (audience.startsWith("class:")) return AUDIENCE_TONES.class;
  return AUDIENCE_TONES[audience] ?? AUDIENCE_TONES.all;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return `${diffDays} gün önce`;
  return formatDate(value);
}

function computeStats(announcements: Announcement[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = announcements.filter((item) => new Date(item.publishedAt).getTime() >= weekAgo).length;
  return { total: announcements.length, recent };
}

export function AnnouncementsScreen({ mode }: { mode: "user" | "guardian" | "principal" }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("every");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isPrincipal = mode === "principal" || session?.principal.role === "principal" || session?.principal.role === "system_admin";

  const query = useQuery({
    queryKey: queryKeys.announcements(mode),
    queryFn: () => (mode === "guardian" ? api.guardianAnnouncements() : api.announcements())
  });

  const createMut = useMutation({
    mutationFn: (payload: { title: string; body: string; audience: string }) => api.createAnnouncement(payload),
    onSuccess: () => {
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.announcements(mode) });
    },
    onError: (err) => {
      setCreateError(err instanceof Error ? err.message : "Duyuru oluşturulamadı.");
    }
  });

  const announcements = query.data ?? [];
  const stats = useMemo(() => computeStats(announcements), [announcements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements.filter((item) => {
      const audienceMatch =
        audienceFilter === "every" ||
        item.audience === audienceFilter ||
        (audienceFilter === "class" && item.audience.startsWith("class:"));
      if (!audienceMatch) return false;
      if (!q) return true;
      return `${item.title} ${item.body} ${announcementAudienceLabel(item.audience)}`.toLowerCase().includes(q);
    });
  }, [announcements, search, audienceFilter]);

  const audienceFilters: Array<{ key: AudienceFilter; label: string }> = [
    { key: "every", label: "Tümü" },
    { key: "teachers", label: "Öğretmenler" },
    { key: "guardians", label: "Veliler" }
  ];

  async function handleCreate(payload: { title: string; body: string; audience: string }) {
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
              platformShadow("0 14px 32px rgba(217,119,6,0.18)", {
                shadowColor: "#d97706",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.16,
                shadowRadius: 18,
                elevation: 8
              })
            ]}
          >
            <View style={[styles.heroBlob, styles.heroBlobWarm, { pointerEvents: "none" }]} />
            <View style={[styles.heroBlob, styles.heroBlobGold, { pointerEvents: "none" }]} />

            <View style={styles.heroTop}>
              <View style={styles.heroIconWrap}>
                <Megaphone color="#fff" size={22} strokeWidth={2.2} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Duyurular</Text>
                <Text style={styles.heroSubtitle}>
                  {isPrincipal ? "Kurum duyurularını yönetin" : "Okul duyurularını takip edin"}
                </Text>
              </View>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{stats.total}</Text>
                <Text style={styles.heroStatLabel}>toplam</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{stats.recent}</Text>
                <Text style={styles.heroStatLabel}>son 7 gün</Text>
              </View>
            </View>

            {isPrincipal ? (
              <Pressable
                onPress={() => {
                  setCreateError(null);
                  setCreateOpen(true);
                }}
                style={({ pressed }) => [styles.heroAddBtn, pressed && styles.heroAddBtnPressed]}
              >
                <Plus color="#fff" size={18} strokeWidth={2.4} />
                <Text style={styles.heroAddBtnText}>Yeni duyuru oluştur</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.filtersCard}>
          <View style={styles.searchWrap}>
            <Search color={colors.textMuted} size={18} strokeWidth={2} />
            <TextInput
              onChangeText={setSearch}
              placeholder="Başlık veya içerik ara..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              value={search}
            />
          </View>

          <View style={styles.filterRow}>
            {audienceFilters.map((item) => {
              const active = audienceFilter === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setAudienceFilter(item.key)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.listHead}>
          <Text style={styles.listTitle}>Yayınlanan duyurular</Text>
          <Text style={styles.listCount}>{filtered.length} kayıt</Text>
        </View>

        {filtered.length === 0 ? (
          <EmptyState
            message={
              announcements.length === 0
                ? "Henüz yayınlanmış bir duyuru bulunmuyor."
                : "Arama veya filtreye uyan duyuru bulunamadı."
            }
            title={announcements.length === 0 ? "Duyuru yok" : "Sonuç bulunamadı"}
          />
        ) : (
          filtered.map((item) => (
            <AnnouncementCard
              key={item.id}
              expanded={expandedId === item.id}
              item={item}
              onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
            />
          ))
        )}
      </Screen>

      {isPrincipal ? (
        <AnnouncementCreateSheet
          error={createError}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          saving={createMut.isPending}
          visible={createOpen}
        />
      ) : null}
    </>
  );
}

function AnnouncementCard({
  item,
  expanded,
  onToggle
}: {
  item: Announcement;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = audienceTone(item.audience);
  const preview = item.body.length > 120 && !expanded ? `${item.body.slice(0, 120)}…` : item.body;

  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={[styles.cardStripe, { backgroundColor: tone.text }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <Megaphone color={tone.text} size={16} strokeWidth={2.2} />
          </View>
          <View style={styles.cardHeadCopy}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.cardMetaRow}>
              <View style={[styles.audiencePill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                <Users color={tone.text} size={11} strokeWidth={2.2} />
                <Text style={[styles.audiencePillText, { color: tone.text }]}>{announcementAudienceLabel(item.audience)}</Text>
              </View>
              <View style={styles.datePill}>
                <BellRing color={colors.textMuted} size={11} strokeWidth={2.2} />
                <Text style={styles.datePillText}>{formatRelativeDate(item.publishedAt)}</Text>
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

        {!expanded && item.body.length > 120 ? <Text style={styles.readMore}>Devamını oku</Text> : null}
        {expanded ? <Text style={styles.fullDate}>{formatDate(item.publishedAt)}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginBottom: 12 },
  hero: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#ea580c",
    overflow: "hidden",
    gap: 14
  },
  heroBlob: { position: "absolute", borderRadius: 999 },
  heroBlobWarm: { width: 120, height: 120, backgroundColor: "rgba(255,255,255,0.14)", top: -28, right: -18 },
  heroBlobGold: { width: 88, height: 88, backgroundColor: "rgba(251,191,36,0.35)", bottom: -18, left: -8 },
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
  heroAddBtnPressed: { opacity: 0.92 },
  heroAddBtnText: { color: "#c2410c", fontWeight: "800", fontSize: 15 },
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
  filterChipActive: { backgroundColor: "#fff7ed", borderColor: "#d97706" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  filterChipTextActive: { color: "#c2410c" },
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
  cardPressed: { opacity: 0.94, backgroundColor: "#fffcf8" },
  cardStripe: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  cardHeadCopy: { flex: 1, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text, lineHeight: 21 },
  cardMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  audiencePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  audiencePillText: { fontSize: 11, fontWeight: "800" },
  datePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 2, paddingVertical: 4 },
  datePillText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  cardContent: { fontSize: 14, lineHeight: 21, color: colors.textMuted, fontWeight: "500" },
  cardContentExpanded: { color: colors.text },
  readMore: { fontSize: 12, fontWeight: "800", color: "#d97706" },
  fullDate: { fontSize: 11, color: colors.textMuted, fontWeight: "600" }
});
