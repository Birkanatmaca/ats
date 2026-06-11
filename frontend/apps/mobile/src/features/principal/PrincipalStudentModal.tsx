import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, CreditCard, Pencil, ReceiptText, UserX } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { PrincipalRosterStudent, StudentFormPayload } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { attendanceLabel } from "@/shared/utils/labels";

const emptyForm = (classId = ""): StudentFormPayload => ({
  schoolNumber: "",
  firstName: "",
  lastName: "",
  classId,
  gender: "",
  birthDate: "",
  guardianName: "",
  guardianPhone: "",
  status: "active"
});

type ModalMode = "create" | "manage" | "edit";

type Props = {
  visible: boolean;
  mode: ModalMode;
  student: PrincipalRosterStudent | null;
  classes: Array<{ id: string; name: string }>;
  sectionLabelById: Map<string, string>;
  existingSchoolNumbers: string[];
  onClose: () => void;
  onCreate: (payload: StudentFormPayload) => Promise<void>;
  onUpdate: (studentId: string, payload: StudentFormPayload) => Promise<void>;
  onDeactivate: (studentId: string) => Promise<void>;
};

export function PrincipalStudentModal({
  visible,
  mode,
  student,
  classes,
  sectionLabelById,
  existingSchoolNumbers,
  onClose,
  onCreate,
  onUpdate,
  onDeactivate
}: Props) {
  const [view, setView] = useState<"manage" | "edit" | "form">("manage");
  const [form, setForm] = useState<StudentFormPayload>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  const attendanceQ = useQuery({
    queryKey: ["student.attendanceSummary", student?.id],
    queryFn: () => api.studentAttendanceSummary(student!.id),
    enabled: visible && mode !== "create" && view === "manage" && Boolean(student?.id)
  });

  useEffect(() => {
    if (!visible) {
      setView("manage");
      setFormError(null);
      setClassDropdownOpen(false);
      return;
    }

    if (mode === "create") {
      setView("form");
      setForm(emptyForm(classes[0]?.id ?? ""));
      return;
    }

    if (student) {
      setView(mode === "edit" ? "edit" : "manage");
      setForm({
        schoolNumber: student.schoolNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        classId: student.classId,
        gender: student.gender,
        birthDate: student.birthDate,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        status: student.status
      });
    }
  }, [visible, mode, student, classes]);

  const className = useMemo(() => {
    if (!student) return "—";
    return classes.find((item) => item.id === student.classId)?.name ?? "—";
  }, [classes, student]);

  const selectedClassLabel = useMemo(() => {
    return classes.find((item) => item.id === form.classId)?.name ?? "Sınıf seçin";
  }, [classes, form.classId]);

  const sectionLabel = student ? (sectionLabelById.get(student.sectionId) ?? "—") : "—";
  const initials = student ? `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase() : "?";
  const isActive = student?.status === "active";

  function updateField<K extends keyof StudentFormPayload>(key: K, value: StudentFormPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setFormError(null);
    const no = form.schoolNumber.trim();
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();

    if (!no || !fn || !ln) {
      setFormError("Okul no, ad ve soyad zorunludur.");
      return;
    }
    if (!form.classId) {
      setFormError("Sınıf seçilmelidir.");
      return;
    }

    const others = existingSchoolNumbers.filter((item) => item !== (student?.schoolNumber ?? ""));
    if (others.includes(no)) {
      setFormError("Bu okul numarası zaten kullanılıyor.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        await onCreate(form);
      } else if (student) {
        await onUpdate(student.id, form);
      }
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDeactivate() {
    if (!student) return;
    Alert.alert(
      "Öğrenciyi pasifleştir",
      `${student.firstName} ${student.lastName} kaydını pasif yapmak istediğinize emin misiniz?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Pasifleştir",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setSubmitting(true);
              try {
                await onDeactivate(student.id);
                onClose();
              } catch (error) {
                Alert.alert("Hata", error instanceof Error ? error.message : "Pasifleştirilemedi.");
              } finally {
                setSubmitting(false);
              }
            })();
          }
        }
      ]
    );
  }

  const title =
    mode === "create" ? "Öğrenci ekle" : view === "edit" ? "Öğrenciyi düzenle" : student ? `${student.firstName} ${student.lastName}` : "Öğrenci";

  const subtitle =
    mode === "create"
      ? "Yeni kayıt bilgilerini girin"
      : view === "edit"
        ? "Öğrenci bilgilerini güncelleyin"
        : student
          ? `No ${student.schoolNumber} · ${className}`
          : undefined;

  const footer =
    mode === "create" || view === "edit" ? (
      <View style={styles.footerRow}>
        {mode !== "create" ? (
          <Pressable disabled={submitting} onPress={() => setView("manage")} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Geri</Text>
          </Pressable>
        ) : null}
        <Pressable
          disabled={submitting || classes.length === 0}
          onPress={() => void handleSubmit()}
          style={[styles.primaryBtn, (submitting || classes.length === 0) && styles.primaryBtnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>{mode === "create" ? "Kaydet" : "Güncelle"}</Text>
          )}
        </Pressable>
      </View>
    ) : undefined;

  return (
    <BottomSheet
      footer={footer}
      headerAccessory={
        mode !== "create" && view === "manage" && student ? (
          <View style={[styles.avatar, !isActive && styles.avatarPassive]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        ) : undefined
      }
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      visible={visible}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        {mode !== "create" && view === "manage" && student ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillPassive]}>
                  <Text style={[styles.statusPillText, isActive ? styles.statusPillTextActive : styles.statusPillTextPassive]}>
                    {isActive ? "Aktif öğrenci" : "Pasif kayıt"}
                  </Text>
                </View>
                <Text style={styles.heroClass}>{className}</Text>
              </View>
              <View style={styles.infoGrid}>
                <InfoTile label="Okul no" value={student.schoolNumber} />
                <InfoTile label="Şube" value={sectionLabel} />
                <InfoTile label="Veli" value={student.guardianName || "—"} />
                <InfoTile label="Telefon" value={student.guardianPhone || "—"} />
                {student.gender ? <InfoTile label="Cinsiyet" value={student.gender} /> : null}
                {student.birthDate ? <InfoTile label="Doğum" value={student.birthDate} /> : null}
              </View>
            </View>

            <View style={styles.actionGrid}>
              <ActionTile icon={Pencil} label="Düzenle" onPress={() => setView("edit")} tone="primary" />
              {student.status === "active" ? (
                <ActionTile danger icon={UserX} label="Pasifleştir" onPress={confirmDeactivate} tone="danger" />
              ) : null}
            </View>

            <BillingStudentPanel student={student} />

            <View style={styles.attendanceCard}>
              {attendanceQ.isLoading ? <ActivityIndicator color={colors.accent} /> : null}
              {attendanceQ.isError ? <Text style={styles.error}>Devamsızlık özeti alınamadı.</Text> : null}
              {attendanceQ.data ? (
                <>
                  <Text style={styles.sectionTitle}>Devamsızlık özeti</Text>
                  <View style={styles.summaryGrid}>
                    <SummaryPill label="Geldi" value={attendanceQ.data.present} />
                    <SummaryPill label="Gelmedi" value={attendanceQ.data.absent} tone="danger" />
                    <SummaryPill label="Geç" value={attendanceQ.data.late} />
                    <SummaryPill label="İzinli" value={attendanceQ.data.excused} />
                  </View>
                  {attendanceQ.data.records.slice(0, 8).map((record, index) => (
                    <View key={`${record.date}-${index}`} style={styles.recordRow}>
                      <View style={styles.recordCopy}>
                        <Text style={styles.recordTitle}>{record.subjectName}</Text>
                        <Text style={styles.recordMeta}>
                          {record.date} · {record.className}
                        </Text>
                      </View>
                      <Text style={styles.recordStatus}>{attendanceLabel(record.status)}</Text>
                    </View>
                  ))}
                  {attendanceQ.data.records.length === 0 ? <Text style={styles.emptyHint}>Kayıt bulunamadı.</Text> : null}
                </>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.form}>
            {classes.length === 0 ? (
              <Text style={styles.error}>Öğrenci eklemek için önce sınıf oluşturmalısınız.</Text>
            ) : null}

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Kimlik bilgileri</Text>
              <Field label="Okul no" onChangeText={(value) => updateField("schoolNumber", value)} value={form.schoolNumber} />
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Field label="Ad" onChangeText={(value) => updateField("firstName", value)} value={form.firstName} />
                </View>
                <View style={styles.fieldHalf}>
                  <Field label="Soyad" onChangeText={(value) => updateField("lastName", value)} value={form.lastName} />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Sınıf ve durum</Text>
              <Text style={styles.fieldLabel}>Sınıf</Text>
              <View style={styles.dropdownWrap}>
                <Pressable
                  onPress={() => setClassDropdownOpen((current) => !current)}
                  style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.dropdownTriggerPressed]}
                >
                  <Text numberOfLines={1} style={styles.dropdownTriggerText}>
                    {selectedClassLabel}
                  </Text>
                  <ChevronDown
                    color={colors.textMuted}
                    size={18}
                    strokeWidth={2.2}
                    style={classDropdownOpen ? { transform: [{ rotate: "180deg" }] } : undefined}
                  />
                </Pressable>
                {classDropdownOpen ? (
                  <View style={styles.dropdownMenu}>
                    {classes.map((item, index) => {
                      const selected = form.classId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            updateField("classId", item.id);
                            setClassDropdownOpen(false);
                          }}
                          style={[
                            styles.dropdownOption,
                            index < classes.length - 1 && styles.dropdownOptionDivider,
                            selected && styles.dropdownOptionActive
                          ]}
                        >
                          <Text style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextActive]}>{item.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>Durum</Text>
              <View style={styles.statusRow}>
                {(["active", "passive"] as const).map((status) => {
                  const selected = form.status === status;
                  return (
                    <Pressable
                      key={status}
                      onPress={() => updateField("status", status)}
                      style={[styles.statusChip, selected && styles.statusChipActive]}
                    >
                      <Text style={[styles.statusChipText, selected && styles.statusChipTextActive]}>
                        {status === "active" ? "Aktif" : "Pasif"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Veli bilgileri</Text>
              <Field label="Veli adı" onChangeText={(value) => updateField("guardianName", value)} value={form.guardianName} />
              <Field
                keyboardType="phone-pad"
                label="Veli telefonu"
                onChangeText={(value) => updateField("guardianPhone", value)}
                value={form.guardianPhone}
              />
              <Field label="Cinsiyet" onChangeText={(value) => updateField("gender", value)} placeholder="Opsiyonel" value={form.gender} />
              <Field label="Doğum tarihi" onChangeText={(value) => updateField("birthDate", value)} placeholder="YYYY-MM-DD" value={form.birthDate} />
            </View>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

function BillingStudentPanel({ student }: { student: PrincipalRosterStudent }) {
  const queryClient = useQueryClient();
  const [planName, setPlanName] = useState("Eğitim ücreti");
  const [planAmount, setPlanAmount] = useState("30000");
  const [installmentCount, setInstallmentCount] = useState("3");
  const [startDate, setStartDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  const accountQ = useQuery({
    queryKey: queryKeys.billingStudentAccount(student.id),
    queryFn: () => api.billingStudentAccount(student.id),
    enabled: Boolean(student.id)
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.billingStudentAccount(student.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.billingDashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.billingOverdueReport });
  };

  const createPlanMut = useMutation({
    mutationFn: () => {
      const amount = Number(planAmount.replace(",", "."));
      const count = Number.parseInt(installmentCount, 10);
      if (!planName.trim() || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(count) || count <= 0 || !startDate.trim()) {
        throw new Error("Plan adı, tutar, taksit ve başlangıç tarihi zorunludur.");
      }
      return api.createBillingPlan(student.id, {
        name: planName.trim(),
        totalAmount: amount,
        currency: "TRY",
        startDate: startDate.trim(),
        installmentCount: count
      });
    },
    onSuccess: invalidate
  });

  const paymentMut = useMutation({
    mutationFn: (installmentId: string) => {
      const item = installments.find((candidate) => candidate.id === installmentId);
      if (!item || item.remainingAmount <= 0) throw new Error("Tahsil edilecek taksit bulunamadı.");
      return api.createBillingPayment(item.id, {
        amount: item.remainingAmount,
        method: "cash",
        note: "Mobil tahsilat"
      });
    },
    onSuccess: invalidate
  });

  const notFound = accountQ.isError && (accountQ.error as { status?: number })?.status === 404;
  const account = accountQ.data;
  const installments =
    account?.plans.flatMap((plan) => plan.installments.map((installment) => ({ ...installment, planName: installment.planName ?? plan.name }))) ?? [];
  const openInstallments = installments.filter((item) => item.remainingAmount > 0 && item.status !== "cancelled");
  const overdueAmount = openInstallments
    .filter((item) => item.status === "overdue")
    .reduce((total, item) => total + item.remainingAmount, 0);
  const outstanding = openInstallments.reduce((total, item) => total + item.remainingAmount, 0);

  async function createPlan() {
    setError(null);
    try {
      await createPlanMut.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan oluşturulamadı.");
    }
  }

  async function recordPayment(installmentId: string) {
    setError(null);
    try {
      await paymentMut.mutateAsync(installmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ödeme kaydedilemedi.");
    }
  }

  return (
    <View style={styles.billingCard}>
      <View style={styles.billingHead}>
        <View style={styles.billingIconWrap}>
          <CreditCard color={colors.success} size={18} strokeWidth={2.3} />
        </View>
        <View style={styles.recordCopy}>
          <Text style={styles.sectionTitle}>Tahsilat</Text>
          <Text style={styles.recordMeta}>
            {accountQ.isLoading ? "Yükleniyor" : notFound ? "Plan bulunmuyor" : `${account?.plans.length ?? 0} ödeme planı`}
          </Text>
        </View>
        <Text style={styles.billingAmount}>{money(outstanding)}</Text>
      </View>

      {accountQ.isError && !notFound ? <Text style={styles.error}>Tahsilat hesabı alınamadı.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {account || notFound ? (
        <>
          <View style={styles.summaryGrid}>
            <SummaryPill label="Bekleyen" value={Math.round(outstanding)} />
            <SummaryPill label="Gecikmiş" value={Math.round(overdueAmount)} tone={overdueAmount > 0 ? "danger" : undefined} />
          </View>

          {openInstallments.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.recordRow}>
              <ReceiptText color={item.status === "overdue" ? colors.danger : colors.accent} size={15} strokeWidth={2.3} />
              <View style={styles.recordCopy}>
                <Text style={styles.recordTitle}>{item.planName ?? "Ödeme planı"}</Text>
                <Text style={styles.recordMeta}>
                  {item.dueDate} · {money(item.remainingAmount)}
                </Text>
              </View>
              <Pressable
                disabled={paymentMut.isPending}
                onPress={() => void recordPayment(item.id)}
                style={[styles.payBtn, paymentMut.isPending && styles.primaryBtnDisabled]}
              >
                <Text style={styles.payBtnText}>Tahsil et</Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.planForm}>
            <Text style={styles.formSectionTitle}>Yeni ödeme planı</Text>
            <Field label="Plan adı" onChangeText={setPlanName} value={planName} />
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Field keyboardType="numeric" label="Tutar" onChangeText={setPlanAmount} value={planAmount} />
              </View>
              <View style={styles.fieldHalf}>
                <Field keyboardType="numeric" label="Taksit" onChangeText={setInstallmentCount} value={installmentCount} />
              </View>
            </View>
            <Field label="Başlangıç" onChangeText={setStartDate} placeholder="YYYY-MM-DD" value={startDate} />
            <Pressable
              disabled={createPlanMut.isPending}
              onPress={() => void createPlan()}
              style={[styles.primaryBtn, createPlanMut.isPending && styles.primaryBtnDisabled]}
            >
              {createPlanMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Plan oluştur</Text>}
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <Text style={styles.infoTileLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoTileValue}>
        {value}
      </Text>
    </View>
  );
}

function ActionTile({
  label,
  icon: Icon,
  onPress,
  tone,
  danger
}: {
  label: string;
  icon: typeof Pencil;
  onPress: () => void;
  tone: "primary" | "neutral" | "danger";
  danger?: boolean;
}) {
  const iconColor = tone === "danger" ? colors.danger : tone === "primary" ? colors.accent : colors.primaryLight;
  const iconBg = tone === "danger" ? "#fdecec" : tone === "primary" ? colors.accentLight : colors.background;

  return (
    <Pressable onPress={onPress} style={[styles.actionTile, danger && styles.actionTileDanger]}>
      <View style={[styles.actionIconWrap, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={18} strokeWidth={2.2} />
      </View>
      <Text style={[styles.actionTileText, danger && styles.actionTileTextDanger]}>{label}</Text>
    </Pressable>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryPillLabel}>{label}</Text>
      <Text style={[styles.summaryPillValue, tone === "danger" && { color: colors.danger }]}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "numeric";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 14
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
  heroClass: {
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
    gap: 4,
    minWidth: "46%"
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
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  actionTile: {
    minWidth: "47%",
    flexGrow: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  actionTileDanger: {
    backgroundColor: "#fff8f8",
    borderColor: "#fecaca"
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  actionTileText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  actionTileTextDanger: {
    color: colors.danger
  },
  attendanceCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10
  },
  billingCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10
  },
  billingHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  billingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5"
  },
  billingAmount: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.success
  },
  planForm: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10
  },
  payBtn: {
    borderRadius: 12,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  payBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800"
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  summaryPill: {
    minWidth: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border
  },
  summaryPillLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600"
  },
  summaryPillValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  recordCopy: {
    flex: 1,
    gap: 2
  },
  recordTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text
  },
  recordMeta: {
    fontSize: 11,
    color: colors.textMuted
  },
  recordStatus: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.accent
  },
  emptyHint: {
    fontSize: 12,
    color: colors.textMuted
  },
  form: {
    gap: 14
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
  dropdownWrap: {
    position: "relative",
    zIndex: 10
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 48
  },
  dropdownTriggerPressed: {
    backgroundColor: colors.accentLight
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  dropdownOptionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  dropdownOptionActive: {
    backgroundColor: colors.accentLight
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text
  },
  dropdownOptionTextActive: {
    color: colors.accent,
    fontWeight: "800"
  },
  statusRow: {
    flexDirection: "row",
    gap: 8
  },
  statusChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: colors.surface
  },
  statusChipActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted
  },
  statusChipTextActive: {
    color: colors.accent
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
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center"
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
