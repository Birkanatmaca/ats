import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { ErrorState } from "@/shared/ui/ErrorState";
import { ListCard } from "@/shared/ui/ListCard";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { formatDate, supportTicketStatusLabel, supportTicketTypeLabel, supportTicketTypes } from "@/shared/utils/labels";
import { colors } from "@/shared/theme/colors";

export function SupportScreen() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState("support");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const query = useQuery({ queryKey: queryKeys.supportTickets, queryFn: () => api.supportTickets() });

  const createMut = useMutation({
    mutationFn: () => api.createSupportTicket({ type, subject: subject.trim(), message: message.trim() }),
    onSuccess: () => {
      setModalOpen(false);
      setSubject("");
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets });
    }
  });

  return (
    <Screen title="Destek" refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <Pressable onPress={() => setModalOpen(true)} style={styles.toggle}>
        <Text style={styles.toggleText}>+ Yeni talep</Text>
      </Pressable>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {(query.data ?? []).map((t) => (
        <ListCard
          key={t.id}
          meta={supportTicketStatusLabel(t.status)}
          subtitle={t.message.length > 100 ? `${t.message.slice(0, 100)}…` : t.message}
          title={`${t.subject} · ${supportTicketTypeLabel(t.type)} · ${formatDate(t.createdAt)}`}
        />
      ))}

      <Modal animationType="slide" transparent visible={modalOpen}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Yeni destek talebi</Text>
            {supportTicketTypes.map((t) => (
              <Pressable key={t.value} onPress={() => setType(t.value)} style={[styles.chip, type === t.value && styles.chipOn]}>
                <Text style={[styles.chipText, type === t.value && styles.chipTextOn]}>{t.label}</Text>
              </Pressable>
            ))}
            <TextInput onChangeText={setSubject} placeholder="Konu" style={styles.input} value={subject} />
            <TextInput multiline onChangeText={setMessage} placeholder="Mesaj" style={[styles.input, styles.area]} value={message} />
            <View style={styles.row}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.cancel}>
                <Text>İptal</Text>
              </Pressable>
              <Pressable disabled={createMut.isPending || !subject.trim() || !message.trim()} onPress={() => createMut.mutate()} style={styles.submit}>
                {createMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Gönder</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: "center", marginBottom: 8 },
  toggleText: { color: "#fff", fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 10, maxHeight: "85%" },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  chip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.text },
  chipTextOn: { color: "#fff" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text },
  area: { minHeight: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancel: { flex: 1, padding: 12, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  submit: { flex: 1, padding: 12, alignItems: "center", borderRadius: 10, backgroundColor: colors.accent },
  submitText: { color: "#fff", fontWeight: "700" }
});
