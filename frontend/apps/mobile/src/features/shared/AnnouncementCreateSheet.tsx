import { Megaphone } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { announcementAudienceOptions } from "@/shared/utils/labels";

type Props = {
  visible: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: { title: string; body: string; audience: string }) => Promise<void>;
};

export function AnnouncementCreateSheet({ visible, saving, error, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle("");
    setBody("");
    setAudience("all");
    setLocalError(null);
  }, [visible]);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setLocalError("Başlık ve içerik zorunludur.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({ title: trimmedTitle, body: trimmedBody, audience });
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Duyuru oluşturulamadı.");
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
            disabled={saving || !title.trim() || !body.trim()}
            onPress={() => void handleSubmit()}
            style={({ pressed }) => [styles.primaryBtn, (saving || !title.trim() || !body.trim()) && styles.primaryBtnDisabled, pressed && styles.btnPressed]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Yayınla</Text>}
          </Pressable>
        </View>
      }
      headerAccessory={
        <View style={styles.headerIcon}>
          <Megaphone color="#d97706" size={22} strokeWidth={2.2} />
        </View>
      }
      onClose={onClose}
      subtitle="Kurum genelinde veya hedef kitleye duyuru gönderin"
      title="Yeni duyuru"
      visible={visible}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {displayError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Yayın bilgisi</Text>
          <Text style={styles.noteText}>Duyuru kaydedildiğinde seçilen hedef kitle anında görür. Metni kısa ve net tutun.</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Hedef kitle</Text>
          <View style={styles.audienceGrid}>
            {announcementAudienceOptions.map((option) => {
              const active = audience === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setAudience(option.value)}
                  style={({ pressed }) => [styles.audienceChip, active && styles.audienceChipActive, pressed && styles.btnPressed]}
                >
                  <Text style={[styles.audienceChipText, active && styles.audienceChipTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Duyuru içeriği</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Başlık</Text>
            <TextInput
              onChangeText={setTitle}
              placeholder="Örn. Veli toplantısı duyurusu"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={title}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mesaj</Text>
            <TextInput
              multiline
              onChangeText={setBody}
              placeholder="Duyuru metnini yazın…"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textArea]}
              textAlignVertical="top"
              value={body}
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
    backgroundColor: "#fff7ed",
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
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 14,
    gap: 6
  },
  noteTitle: { fontSize: 13, fontWeight: "800", color: "#9a3412" },
  noteText: { fontSize: 13, lineHeight: 19, color: "#c2410c", fontWeight: "500" },
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
  audienceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  audienceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border
  },
  audienceChipActive: {
    backgroundColor: "#fff7ed",
    borderColor: "#d97706"
  },
  audienceChipText: { fontSize: 13, fontWeight: "700", color: colors.text },
  audienceChipTextActive: { color: "#c2410c" },
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
    backgroundColor: "#d97706"
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  btnPressed: { opacity: 0.9 }
});
