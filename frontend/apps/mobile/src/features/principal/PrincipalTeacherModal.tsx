import { GraduationCap, KeyRound, Mail, UserRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { UserAccount } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";

type Props = {
  visible: boolean;
  mode: "create" | "manage";
  teacher: UserAccount | null;
  onClose: () => void;
  onCreate: (payload: { email: string; firstName: string; lastName: string; title: string }) => Promise<{ email: string; temporaryPassword: string }>;
  onResetPassword: (teacherId: string) => Promise<{ temporaryPassword: string }>;
};

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function PrincipalTeacherModal({ visible, mode, teacher, onClose, onCreate, onResetPassword }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [teacherTitle, setTeacherTitle] = useState("Öğretmen");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFormError(null);
      setSubmitting(false);
      return;
    }
    if (mode === "create") {
      setFirstName("");
      setLastName("");
      setEmail("");
      setTeacherTitle("Öğretmen");
    }
  }, [visible, mode]);

  const isActive = teacher?.status === "active";
  const isCreate = mode === "create";

  const sheetTitle = isCreate ? "Öğretmen ekle" : (teacher?.fullName ?? "Öğretmen");
  const sheetSubtitle = isCreate ? "Yeni öğretmen hesabı oluşturun" : (teacher?.email ?? "");

  async function handleCreate() {
    setFormError(null);
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      title: teacherTitle.trim() || "Öğretmen"
    };
    if (!payload.firstName || !payload.lastName || !payload.email) {
      setFormError("Ad, soyad ve e-posta zorunludur.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await onCreate(payload);
      Alert.alert("Öğretmen oluşturuldu", `E-posta: ${result.email}\nGeçici şifre: ${result.temporaryPassword}`);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Öğretmen oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!teacher) return;
    setSubmitting(true);
    try {
      const result = await onResetPassword(teacher.id);
      Alert.alert("Şifre sıfırlandı", `Geçici şifre: ${result.temporaryPassword}`);
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Şifre sıfırlanamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  const footer = isCreate ? (
    <View style={styles.footerRow}>
      <Pressable disabled={submitting} onPress={onClose} style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>Vazgeç</Text>
      </Pressable>
      <Pressable disabled={submitting} onPress={() => void handleCreate()} style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Oluştur</Text>}
      </Pressable>
    </View>
  ) : (
    <View style={styles.footerRow}>
      <Pressable disabled={submitting} onPress={() => void handleResetPassword()} style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <KeyRound color="#fff" size={16} strokeWidth={2.2} />
            <Text style={styles.primaryBtnText}>Geçici şifre sıfırla</Text>
          </>
        )}
      </Pressable>
    </View>
  );

  return (
    <BottomSheet
      footer={footer}
      headerAccessory={
        isCreate ? (
          <View style={styles.createIconWrap}>
            <GraduationCap color={colors.accent} size={22} strokeWidth={2.2} />
          </View>
        ) : teacher ? (
          <View style={[styles.avatar, !isActive && styles.avatarPassive]}>
            <Text style={styles.avatarText}>{initials(teacher.fullName)}</Text>
          </View>
        ) : null
      }
      onClose={onClose}
      subtitle={sheetSubtitle}
      title={sheetTitle}
      visible={visible}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        {isCreate ? (
          <View style={styles.form}>
            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>Hesap bilgisi</Text>
              <Text style={styles.noteText}>
                Öğretmen oluşturulduktan sonra geçici şifre ekranda gösterilir. İlk girişte şifre değiştirmesi istenir.
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Kişisel bilgiler</Text>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Field label="Ad" onChangeText={setFirstName} placeholder="Ad" value={firstName} />
                </View>
                <View style={styles.fieldHalf}>
                  <Field label="Soyad" onChangeText={setLastName} placeholder="Soyad" value={lastName} />
                </View>
              </View>
              <Field label="Ünvan" onChangeText={setTeacherTitle} placeholder="Öğretmen" value={teacherTitle} />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Giriş bilgileri</Text>
              <Field
                autoCapitalize="none"
                keyboardType="email-address"
                label="E-posta"
                onChangeText={setEmail}
                placeholder="ornek@okul.k12.tr"
                value={email}
              />
            </View>
          </View>
        ) : teacher ? (
          <View style={styles.manage}>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillPassive]}>
                  <Text style={[styles.statusPillText, isActive ? styles.statusPillTextActive : styles.statusPillTextPassive]}>
                    {isActive ? "Aktif öğretmen" : "Pasif hesap"}
                  </Text>
                </View>
                <Text style={styles.heroRole}>Öğretmen</Text>
              </View>

              <View style={styles.infoGrid}>
                <InfoTile icon={Mail} label="E-posta" value={teacher.email} />
                <InfoTile icon={UserRound} label="Rol" value="Öğretmen" />
              </View>
            </View>

            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>Şifre yönetimi</Text>
              <Text style={styles.noteText}>
                Geçici şifre sıfırlandığında yeni şifre yalnızca bir kez gösterilir. Öğretmen ile güvenli kanaldan paylaşın.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function InfoTile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Mail }) {
  return (
    <View style={styles.infoTile}>
      <View style={styles.infoTileIcon}>
        <Icon color={colors.accent} size={15} strokeWidth={2.2} />
      </View>
      <Text style={styles.infoTileLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoTileValue}>
        {value}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 14
  },
  createIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarPassive: {
    backgroundColor: "#eef2f6"
  },
  avatarText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "800"
  },
  form: {
    gap: 14
  },
  manage: {
    gap: 14
  },
  noteCard: {
    backgroundColor: colors.accentLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cfe0f5",
    padding: 14,
    gap: 6
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryLight
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    fontWeight: "500"
  },
  formSection: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryLight,
    letterSpacing: 0.2
  },
  field: {
    gap: 6
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10
  },
  fieldHalf: {
    flex: 1
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.2
  },
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
  heroCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  statusPillActive: {
    backgroundColor: colors.accentLight
  },
  statusPillPassive: {
    backgroundColor: "#fdecec"
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "800"
  },
  statusPillTextActive: {
    color: colors.accent
  },
  statusPillTextPassive: {
    color: colors.danger
  },
  heroRole: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primaryLight
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  infoTile: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 6,
    minWidth: "46%"
  },
  infoTileIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center"
  },
  infoTileLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3
  },
  infoTileValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12
  },
  footerRow: {
    flexDirection: "row",
    gap: 10
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 15
  },
  primaryBtnDisabled: {
    opacity: 0.65
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15
  },
  secondaryBtn: {
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontWeight: "700"
  }
});
