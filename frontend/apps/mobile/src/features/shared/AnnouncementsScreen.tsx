import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { useAuth } from "@/shared/auth/AuthContext";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { SearchBar } from "@/shared/ui/SearchBar";
import { announcementAudienceLabel, announcementAudienceOptions, formatDate } from "@/shared/utils/labels";
import { colors } from "@/shared/theme/colors";

export function AnnouncementsScreen({ mode }: { mode: "user" | "guardian" | "principal" }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");

  const isPrincipal = mode === "principal" || session?.principal.role === "principal" || session?.principal.role === "system_admin";

  const query = useQuery({
    queryKey: queryKeys.announcements(mode),
    queryFn: () => (mode === "guardian" ? api.guardianAnnouncements() : api.announcements())
  });

  const createMut = useMutation({
    mutationFn: () => api.createAnnouncement({ title: title.trim(), body: body.trim(), audience }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.announcements(mode) });
    }
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = query.data ?? [];
    if (!q) return list;
    return list.filter((a) => `${a.title} ${a.body}`.toLowerCase().includes(q));
  }, [query.data, search]);

  return (
    <Screen title="Duyurular" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <SearchBar onChangeText={setSearch} value={search} />
      {isPrincipal ? (
        <Pressable onPress={() => setFormOpen((v) => !v)} style={styles.toggle}>
          <Text style={styles.toggleText}>{formOpen ? "İptal" : "+ Duyuru oluştur"}</Text>
        </Pressable>
      ) : null}
      {formOpen ? (
        <View style={styles.form}>
          <TextInput onChangeText={setTitle} placeholder="Başlık" style={styles.input} value={title} />
          <TextInput multiline onChangeText={setBody} placeholder="İçerik" style={[styles.input, styles.area]} value={body} />
          <View style={styles.chips}>
            {announcementAudienceOptions.map((o) => (
              <Pressable key={o.value} onPress={() => setAudience(o.value)} style={[styles.chip, audience === o.value && styles.chipOn]}>
                <Text style={[styles.chipText, audience === o.value && styles.chipTextOn]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable disabled={createMut.isPending || !title.trim() || !body.trim()} onPress={() => createMut.mutate()} style={styles.submit}>
            {createMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Yayınla</Text>}
          </Pressable>
        </View>
      ) : null}
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {filtered.map((a) => (
        <ListCard
          key={a.id}
          meta={formatDate(a.publishedAt)}
          onPress={() => setExpandedId(expandedId === a.id ? null : a.id)}
          subtitle={expandedId === a.id ? a.body : `${a.body.slice(0, 80)}${a.body.length > 80 ? "…" : ""}`}
          title={`${a.title} · ${announcementAudienceLabel(a.audience)}`}
        />
      ))}
      {filtered.length === 0 && !query.isLoading ? <Text style={styles.empty}>Duyuru yok.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  toggleText: { color: "#fff", fontWeight: "700" },
  form: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text },
  area: { minHeight: 80, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.text },
  chipTextOn: { color: "#fff" },
  submit: { backgroundColor: colors.accent, borderRadius: 10, padding: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 16 }
});
