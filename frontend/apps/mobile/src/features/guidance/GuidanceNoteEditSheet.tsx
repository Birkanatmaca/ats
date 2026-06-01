import { FileText } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { GuidanceNote } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";

const NOTE_TYPES = [
  { value: "meeting", label: "Görüşme" },
  { value: "follow_up", label: "Takip" },
  { value: "observation", label: "Gözlem" },
  { value: "parent_contact", label: "Veli görüşmesi" },
  { value: "report", label: "Rapor" }
] as const;

type Props = {
  visible: boolean;
  note: GuidanceNote | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: { noteType: string; title: string; body: string }) => Promise<void>;
};

export function GuidanceNoteEditSheet({ visible, note, saving, error, onClose, onSubmit }: Props) {
  const [noteType, setNoteType] = useState("meeting");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !note) return;
    setNoteType(note.noteType);
    setTitle(note.title);
    setBody(note.body);
    setLocalError(null);
  }, [visible, note]);

  async function handleSubmit() {
    if (!title.trim() || body.trim().length < 3) {
      setLocalError("Başlık ve en az 3 karakterlik not içeriği zorunludur.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({ noteType, title: title.trim(), body: body.trim() });
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Not güncellenemedi.");
    }
  }

  const displayError = localError ?? error;
  const canSubmit = Boolean(title.trim() && body.trim().length >= 3);

  return (
    <BottomSheet
      footer={
        <View style={styles.footerRow}>
          <Pressable disabled={saving} onPress={onClose} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
            <Text style={styles.secondaryBtnText}>Vazgeç</Text>
          </Pressable>
          <Pressable
            disabled={saving || !canSubmit}
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [styles.primaryBtn, (!canSubmit || saving) && styles.primaryBtnDisabled, pressed && styles.btnPressed]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Güncelle</Text>}
          </Pressable>
        </View>
      }
      headerAccessory={
        <View style={styles.headerIcon}>
          <FileText color="#7c3aed" size={22} strokeWidth={2.2} />
        </View>
      }
      onClose={onClose}
      subtitle={note ? `${note.studentName} · ${note.className}` : "Not düzenleme"}
      title="Notu düzenle"
      visible={visible}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {displayError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Not türü</Text>
          <View style={styles.chipRow}>
            {NOTE_TYPES.map((type) => (
              <Pressable
                key={type.value}
                onPress={() => setNoteType(type.value)}
                style={[styles.chip, noteType === type.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, noteType === type.value && styles.chipTextActive]}>{type.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Başlık</Text>
          <TextInput onChangeText={setTitle} placeholder="Görüşme özeti" style={styles.input} value={title} />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Not içeriği</Text>
          <TextInput
            multiline
            onChangeText={setBody}
            placeholder="Rehberlik notu..."
            style={[styles.input, styles.textArea]}
            value={body}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 16 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#faf5ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd6fe"
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  formSection: { gap: 8 },
  formLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background
  },
  chipActive: { backgroundColor: "#faf5ff", borderColor: "#7c3aed" },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: "#6d28d9" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background
  },
  textArea: { minHeight: 110, textAlignVertical: "top" },
  footerRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: colors.background
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: colors.text },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#7c3aed"
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  btnPressed: { opacity: 0.88 }
});
