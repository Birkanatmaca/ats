import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { GuidanceCaseEvent } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";

type Props = {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    eventType: GuidanceCaseEvent["eventType"];
    title: string;
    body: string;
    visibility: GuidanceCaseEvent["visibility"];
  }) => void;
};

const EVENT_TYPES: Array<{ value: GuidanceCaseEvent["eventType"]; label: string }> = [
  { value: "meeting", label: "Veli görüşmesi" },
  { value: "note", label: "Not" },
  { value: "follow_up", label: "Takip adımı" },
  { value: "plan", label: "Plan" },
  { value: "risk", label: "Risk" }
];

export function GuidanceCaseEventSheet({ open, loading, error, onClose, onSubmit }: Props) {
  const [eventType, setEventType] = useState<GuidanceCaseEvent["eventType"]>("meeting");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  if (!open) return null;

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Zaman çizelgesine ekle</Text>
          <View style={styles.chips}>
            {EVENT_TYPES.map((item) => {
              const active = eventType === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setEventType(item.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput onChangeText={setTitle} placeholder="Başlık" style={styles.input} value={title} />
          <TextInput
            multiline
            onChangeText={setBody}
            placeholder="Detay / görüşme notu"
            style={[styles.input, styles.textArea]}
            value={body}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>İptal</Text>
            </Pressable>
            <Pressable
              disabled={loading || (!title.trim() && !body.trim())}
              onPress={() =>
                onSubmit({
                  eventType,
                  title: title.trim(),
                  body: body.trim(),
                  visibility: "guidance_only"
                })
              }
              style={[styles.primaryBtn, (loading || (!title.trim() && !body.trim())) && styles.disabled]}
            >
              <Text style={styles.primaryText}>{loading ? "Kaydediliyor…" : "Ekle"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    gap: 10
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc"
  },
  chipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.text },
  chipTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#f8fafc"
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  error: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#f8fafc"
  },
  secondaryText: { color: colors.text, fontWeight: "700" },
  disabled: { opacity: 0.55 }
});
