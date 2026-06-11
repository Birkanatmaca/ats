import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { AnnouncementAudienceTarget } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";

const roleOptions = [
  { value: "all", label: "Tüm kurum" },
  { value: "teacher", label: "Öğretmenler" },
  { value: "guardian", label: "Veliler" },
  { value: "guidance", label: "Rehberlik" },
  { value: "driver", label: "Servis şoförleri" }
] as const;

type Props = {
  visible: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    body: string;
    audiences: AnnouncementAudienceTarget[];
    publish: boolean;
  }) => Promise<void>;
};

function buildAudiences(roleTargets: string[], classTargets: string[], sectionTargets: string[], studentTargets: string[]): AnnouncementAudienceTarget[] {
  if (roleTargets.includes("all")) {
    return [{ type: "all" }];
  }
  return [
    ...roleTargets.map((role) => ({ type: "role" as const, role })),
    ...classTargets.map((id) => ({ type: "class" as const, id })),
    ...sectionTargets.map((id) => ({ type: "section" as const, id })),
    ...studentTargets.map((id) => ({ type: "student" as const, id }))
  ];
}

function toggleValue(value: string, selected: string[]) {
  return selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
}

export function AnnouncementCreateSheet({ visible, saving, error, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roleTargets, setRoleTargets] = useState<string[]>(["guardian"]);
  const [classTargets, setClassTargets] = useState<string[]>([]);
  const [sectionTargets, setSectionTargets] = useState<string[]>([]);
  const [studentTargets, setStudentTargets] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const rosterQ = useQuery({
    queryKey: queryKeys.principalRoster,
    queryFn: () => api.principalRoster(),
    enabled: visible
  });

  const classes = rosterQ.data?.classes ?? [];
  const sections = rosterQ.data?.sections ?? [];
  const students = rosterQ.data?.students ?? [];

  useEffect(() => {
    if (!visible) return;
    setTitle("");
    setBody("");
    setRoleTargets(["guardian"]);
    setClassTargets([]);
    setSectionTargets([]);
    setStudentTargets([]);
    setLocalError(null);
  }, [visible]);

  const previewAudience = useMemo(() => {
    const audiences = buildAudiences(roleTargets, classTargets, sectionTargets, studentTargets);
    if (audiences.length === 0) return "Hedef seçin";
    if (audiences.length === 1 && audiences[0].type === "all") return "Tüm kurum";
    return audiences
      .map((target) => {
        if (target.type === "role") return roleOptions.find((item) => item.value === target.role)?.label ?? target.role;
        if (target.type === "class") return `${classes.find((item) => item.id === target.id)?.name ?? "Sınıf"} velileri`;
        if (target.type === "section") {
          const section = sections.find((item) => item.id === target.id);
          const className = classes.find((item) => item.id === section?.classId)?.name ?? "";
          return section ? `${className} / ${section.name} velileri` : "Şube velileri";
        }
        if (target.type === "student") {
          const student = students.find((item) => item.id === target.id);
          return student ? `${student.firstName} ${student.lastName} velileri` : "Öğrenci velileri";
        }
        return "Hedef";
      })
      .join(", ");
  }, [roleTargets, classTargets, sectionTargets, studentTargets, classes, sections, students]);

  async function handleSubmit(publish: boolean) {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const audiences = buildAudiences(roleTargets, classTargets, sectionTargets, studentTargets);
    if (!trimmedTitle || !trimmedBody) {
      setLocalError("Başlık ve içerik zorunludur.");
      return;
    }
    if (audiences.length === 0) {
      setLocalError("Geçerli bir hedef kitle seçin.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({ title: trimmedTitle, body: trimmedBody, audiences, publish });
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Duyuru kaydedilemedi.");
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
            onPress={() => void handleSubmit(false)}
            style={({ pressed }) => [styles.secondaryBtn, styles.draftBtn, (saving || !title.trim() || !body.trim()) && styles.btnDisabled, pressed && styles.btnPressed]}
          >
            {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.secondaryBtnText}>Taslak</Text>}
          </Pressable>
          <Pressable
            disabled={saving || !title.trim() || !body.trim()}
            onPress={() => void handleSubmit(true)}
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
      subtitle="Hedef kitleyi seçin, taslak kaydedin veya yayınlayın"
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
          <Text style={styles.noteTitle}>Ön izleme</Text>
          <Text style={styles.noteText}>Hedef: {previewAudience}</Text>
          <Text style={styles.noteHint}>Taslak duyurular hedef kullanıcılara görünmez. Yayınlandığında push bildirimi gönderilir.</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Hedef kitle</Text>
          <View style={styles.audienceGrid}>
            {roleOptions.map((option) => {
              const active = roleTargets.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    if (option.value === "all") {
                      setRoleTargets(roleTargets.includes("all") ? [] : ["all"]);
                      return;
                    }
                    const withoutAll = roleTargets.filter((item) => item !== "all");
                    setRoleTargets(toggleValue(option.value, withoutAll));
                  }}
                  style={({ pressed }) => [styles.audienceChip, active && styles.audienceChipActive, pressed && styles.btnPressed]}
                >
                  <Text style={[styles.audienceChipText, active && styles.audienceChipTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.pickerList}>
            {classes.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setClassTargets((current) => toggleValue(item.id, current))}
                style={[styles.pickerItem, classTargets.includes(item.id) && styles.pickerItemActive]}
              >
                <Text style={[styles.pickerItemText, classTargets.includes(item.id) && styles.pickerItemTextActive]}>
                  Sınıf: {item.name}
                </Text>
              </Pressable>
            ))}
            {sections.map((item) => {
              const className = classes.find((c) => c.id === item.classId)?.name ?? "";
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSectionTargets((current) => toggleValue(item.id, current))}
                  style={[styles.pickerItem, sectionTargets.includes(item.id) && styles.pickerItemActive]}
                >
                  <Text style={[styles.pickerItemText, sectionTargets.includes(item.id) && styles.pickerItemTextActive]}>
                    Şube: {className} / {item.name}
                  </Text>
                </Pressable>
              );
            })}
            {students.slice(0, 40).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setStudentTargets((current) => toggleValue(item.id, current))}
                style={[styles.pickerItem, studentTargets.includes(item.id) && styles.pickerItemActive]}
              >
                <Text style={[styles.pickerItemText, studentTargets.includes(item.id) && styles.pickerItemTextActive]}>
                  Veli: {item.firstName} {item.lastName} · {classes.find((c) => c.id === item.classId)?.name ?? item.classId}
                </Text>
              </Pressable>
            ))}
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
  noteText: { fontSize: 14, fontWeight: "700", color: "#c2410c" },
  noteHint: { fontSize: 12, lineHeight: 18, color: "#9a3412", fontWeight: "500" },
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
  audienceChipActive: { backgroundColor: "#fff7ed", borderColor: "#d97706" },
  audienceChipText: { fontSize: 13, fontWeight: "700", color: colors.text },
  audienceChipTextActive: { color: "#c2410c" },
  pickerList: { gap: 6 },
  pickerItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface
  },
  pickerItemActive: { borderColor: "#d97706", backgroundColor: "#fff7ed" },
  pickerItemText: { fontSize: 13, fontWeight: "600", color: colors.text },
  pickerItemTextActive: { color: "#c2410c", fontWeight: "800" },
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
  footerRow: { flexDirection: "row", gap: 8 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  draftBtn: { flex: 1.1 },
  secondaryBtnText: { fontSize: 14, fontWeight: "800", color: colors.text },
  primaryBtn: {
    flex: 1.2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#d97706"
  },
  primaryBtnDisabled: { opacity: 0.55 },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  btnPressed: { opacity: 0.9 }
});
