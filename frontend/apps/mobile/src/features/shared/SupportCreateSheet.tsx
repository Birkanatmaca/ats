import { HelpCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { supportTicketTypes } from "@/shared/utils/labels";

type Props = {
  visible: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: { type: string; subject: string; message: string }) => Promise<void>;
};

export function SupportCreateSheet({ visible, saving, error, onClose, onSubmit }: Props) {
  const [type, setType] = useState("support");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setType("support");
    setSubject("");
    setMessage("");
    setLocalError(null);
  }, [visible]);

  async function handleSubmit() {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      setLocalError("Konu ve mesaj zorunludur.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({ type, subject: trimmedSubject, message: trimmedMessage });
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Talep gönderilemedi.");
    }
  }

  const displayError = localError ?? error;

  return (
    <BottomSheet
      footer={
        <View style={styles.footerRow}>
          <Pressable disabled={saving} onPress={onClose} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
            <Text style={styles.secondaryBtnText}>Vazgeç</Text>
          </Pressable>
          <Pressable
            disabled={saving || !subject.trim() || !message.trim()}
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [styles.primaryBtn, (saving || !subject.trim() || !message.trim()) && styles.primaryBtnDisabled, pressed && styles.btnPressed]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Gönder</Text>}
          </Pressable>
        </View>
      }
      headerAccessory={
        <View style={styles.headerIcon}>
          <HelpCircle color="#0d9488" size={22} strokeWidth={2.2} />
        </View>
      }
      onClose={onClose}
      subtitle="Sorun, öneri veya şikayetinizi iletin"
      title="Yeni destek talebi"
      visible={visible}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {displayError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Yanıt süresi</Text>
          <Text style={styles.noteText}>Talebiniz okul yönetimine iletilir. Acil durumlar için okul telefonunu da kullanabilirsiniz.</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Talep türü</Text>
          <View style={styles.typeGrid}>
            {supportTicketTypes.map((option) => {
              const active = type === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={({ pressed }) => [styles.typeChip, active && styles.typeChipActive, pressed && styles.btnPressed]}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Talep detayı</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Konu</Text>
            <TextInput
              onChangeText={setSubject}
              placeholder="Kısa bir özet yazın"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={subject}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj</Text>
            <TextInput
              multiline
              onChangeText={setMessage}
              placeholder="Detaylı açıklama yazın…"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textArea]}
              textAlignVertical="top"
              value={message}
            />
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center"
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12
  },
  errorText: { fontSize: 13, color: colors.danger, fontWeight: "700" },
  noteCard: {
    backgroundColor: "#f0fdfa",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#99f6e4",
    padding: 14,
    gap: 6
  },
  noteTitle: { fontSize: 13, fontWeight: "800", color: "#115e59" },
  noteText: { fontSize: 13, lineHeight: 19, color: "#0f766e", fontWeight: "500" },
  formSection: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryLight,
    letterSpacing: 0.2
  },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border
  },
  typeChipActive: { backgroundColor: "#f0fdfa", borderColor: "#0d9488" },
  typeChipText: { fontSize: 13, fontWeight: "700", color: colors.text },
  typeChipTextActive: { color: "#0f766e" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface
  },
  textArea: { minHeight: 120 },
  footerRow: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "800", color: colors.text },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#0d9488"
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  btnPressed: { opacity: 0.9 }
});
