import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Plus, Soup, UsersRound } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { usePrincipalRoster } from "@/features/principal/usePrincipalRoster";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function isoAt(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function mealTypeLabel(value: string) {
  if (value === "breakfast") return "Kahvaltı";
  if (value === "snack") return "Ara öğün";
  return "Öğle";
}

function attendanceLabel(value: string) {
  if (value === "absent") return "Devamsız";
  if (value === "excused") return "Mazeretli";
  return "Katıldı";
}

function membershipLabel(value: string) {
  if (value === "waitlisted") return "Bekleme";
  if (value === "left") return "Ayrıldı";
  return "Aktif";
}

export function PrincipalLifeScreen() {
  const queryClient = useQueryClient();
  const mealsQ = useQuery({ queryKey: queryKeys.lifeMeals, queryFn: () => api.lifeMeals() });
  const sessionsQ = useQuery({ queryKey: queryKeys.studySessions, queryFn: () => api.studySessions() });
  const clubsQ = useQuery({ queryKey: queryKeys.clubs, queryFn: () => api.clubs() });
  const teachersQ = useQuery({ queryKey: queryKeys.principalTeachers, queryFn: () => api.principalTeachers() });
  const rosterQ = usePrincipalRoster();

  const [mealDate, setMealDate] = useState(todayISODate());
  const [mealTitle, setMealTitle] = useState("Yeni öğle menüsü");
  const [mealDescription, setMealDescription] = useState("Çorba, ana yemek ve salata");
  const [allergens, setAllergens] = useState("Süt, Gluten");
  const [studyTitle, setStudyTitle] = useState("Yeni matematik etüdü");
  const [studyDate, setStudyDate] = useState(todayISODate());
  const [studyStart, setStudyStart] = useState("15:30");
  const [studyEnd, setStudyEnd] = useState("16:20");
  const [clubName, setClubName] = useState("Yeni kulüp");
  const [clubCapacity, setClubCapacity] = useState("12");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.lifeMeals });
    void queryClient.invalidateQueries({ queryKey: queryKeys.studySessions });
    void queryClient.invalidateQueries({ queryKey: queryKeys.clubs });
  };

  const createMealMut = useMutation({
    mutationFn: () => {
      if (!mealDate.trim() || !mealTitle.trim()) throw new Error("Tarih ve menü başlığı zorunludur.");
      return api.createLifeMeal({
        date: mealDate.trim(),
        mealType: "lunch",
        title: mealTitle.trim(),
        description: mealDescription.trim(),
        allergens: allergens
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      });
    },
    onSuccess: invalidate
  });

  const createStudyMut = useMutation({
    mutationFn: () => {
      const classId = rosterQ.data?.classes?.[0]?.id;
      const teacherUserId = teachersQ.data?.find((teacher) => teacher.role === "teacher")?.id ?? teachersQ.data?.[0]?.id;
      if (!studyTitle.trim() || !classId) throw new Error("Etüt için başlık ve sınıf gerekir.");
      return api.createStudySession({
        title: studyTitle.trim(),
        classId,
        teacherUserId,
        startsAt: isoAt(studyDate, studyStart),
        endsAt: isoAt(studyDate, studyEnd),
        capacity: 8
      });
    },
    onSuccess: invalidate
  });

  const recordAttendanceMut = useMutation({
    mutationFn: () => {
      const session = sessionsQ.data?.[0];
      const student = rosterQ.data?.students?.find((item) => item.classId === session?.classId) ?? rosterQ.data?.students?.[0];
      if (!session || !student) throw new Error("Katılım için etüt ve öğrenci gerekir.");
      return api.recordStudyAttendance(session.id, [{ studentId: student.id, status: "attended" }]);
    },
    onSuccess: invalidate
  });

  const createClubMut = useMutation({
    mutationFn: () => {
      const capacity = Number.parseInt(clubCapacity, 10);
      const advisorUserId = teachersQ.data?.find((teacher) => teacher.role === "teacher")?.id ?? teachersQ.data?.[0]?.id;
      if (!clubName.trim() || !Number.isFinite(capacity) || capacity <= 0) throw new Error("Kulüp adı ve kapasite zorunludur.");
      return api.createClub({ name: clubName.trim(), capacity, advisorUserId, description: "Okul yaşamı kulübü" });
    },
    onSuccess: invalidate
  });

  const addMembershipMut = useMutation({
    mutationFn: () => {
      const club = clubsQ.data?.[0];
      const student = rosterQ.data?.students?.[0];
      if (!club || !student) throw new Error("Üyelik için kulüp ve öğrenci gerekir.");
      return api.addClubMembership(club.id, { studentId: student.id, status: "active" });
    },
    onSuccess: invalidate
  });

  const meals = mealsQ.data ?? [];
  const sessions = sessionsQ.data ?? [];
  const clubs = clubsQ.data ?? [];
  const attendanceCount = sessions.reduce((sum, item) => sum + item.attendance.length, 0);
  const membershipCount = clubs.reduce((sum, item) => sum + item.memberships.length, 0);
  const loading = mealsQ.isLoading || sessionsQ.isLoading || clubsQ.isLoading;
  const firstStudentName = useMemo(() => {
    const student = rosterQ.data?.students?.[0];
    return student ? `${student.firstName} ${student.lastName}` : "Öğrenci yok";
  }, [rosterQ.data?.students]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem tamamlanamadı.");
    }
  }

  return (
    <Screen
      title="Okul yaşamı"
      subtitle="Yemek, etüt ve kulüp"
      refreshing={mealsQ.isRefetching || sessionsQ.isRefetching || clubsQ.isRefetching}
      onRefresh={() => {
        void mealsQ.refetch();
        void sessionsQ.refetch();
        void clubsQ.refetch();
      }}
    >
      <View style={styles.stats}>
        <Stat label="Menü" value={meals.length} />
        <Stat label="Etüt" value={sessions.length} />
        <Stat label="Katılım" value={attendanceCount} />
        <Stat label="Üyelik" value={membershipCount} />
      </View>

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {loading ? <LoadingBlock /> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Haftalık menü</Text>
        {meals.slice(0, 5).map((meal) => (
          <View key={meal.id} style={styles.listCard}>
            <View style={styles.row}>
              <Soup color={colors.warning} size={17} strokeWidth={2.4} />
              <View style={styles.copy}>
                <Text style={styles.title}>{meal.title}</Text>
                <Text style={styles.meta}>
                  {meal.date} · {mealTypeLabel(meal.mealType)}
                </Text>
              </View>
            </View>
            {meal.allergens.length > 0 ? <Text style={styles.alertText}>Alerjen: {meal.allergens.join(", ")}</Text> : null}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Etütler</Text>
        {sessions.slice(0, 4).map((session) => (
          <View key={session.id} style={styles.listCard}>
            <View style={styles.row}>
              <BookOpenCheck color={colors.success} size={17} strokeWidth={2.4} />
              <View style={styles.copy}>
                <Text style={styles.title}>{session.title}</Text>
                <Text style={styles.meta}>
                  {session.className || "Genel"} · {session.teacherName || "Öğretmen yok"} · {session.attendance.length}/{session.capacity}
                </Text>
              </View>
            </View>
            {session.attendance.slice(0, 2).map((item) => (
              <Text key={item.id} style={styles.smallLine}>
                {item.studentName} · {attendanceLabel(item.status)}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kulüpler</Text>
        {clubs.slice(0, 4).map((club) => (
          <View key={club.id} style={styles.listCard}>
            <View style={styles.row}>
              <UsersRound color={colors.accent} size={17} strokeWidth={2.4} />
              <View style={styles.copy}>
                <Text style={styles.title}>{club.name}</Text>
                <Text style={styles.meta}>
                  {club.advisorName || "Danışman yok"} · {club.memberships.length}/{club.capacity}
                </Text>
              </View>
            </View>
            {club.capacityWarning ? <Text style={styles.alertText}>{club.capacityWarning}</Text> : null}
            {club.memberships.slice(0, 2).map((item) => (
              <Text key={item.id} style={styles.smallLine}>
                {item.studentName} · {membershipLabel(item.status)}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Hızlı okul yaşamı kurulumu</Text>
        <Field label="Menü tarihi" onChangeText={setMealDate} value={mealDate} />
        <Field label="Menü başlığı" onChangeText={setMealTitle} value={mealTitle} />
        <Field label="Açıklama" onChangeText={setMealDescription} value={mealDescription} />
        <Field label="Alerjenler" onChangeText={setAllergens} value={allergens} />
        <ActionButton loading={createMealMut.isPending} onPress={() => run(() => createMealMut.mutateAsync())} title="Öğle menüsü ekle" />

        <Field label="Etüt başlığı" onChangeText={setStudyTitle} value={studyTitle} />
        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <Field label="Tarih" onChangeText={setStudyDate} value={studyDate} />
          </View>
          <View style={styles.inlineField}>
            <Field label="Başlangıç" onChangeText={setStudyStart} value={studyStart} />
          </View>
          <View style={styles.inlineField}>
            <Field label="Bitiş" onChangeText={setStudyEnd} value={studyEnd} />
          </View>
        </View>
        <ActionButton loading={createStudyMut.isPending} onPress={() => run(() => createStudyMut.mutateAsync())} title="Etüt oluştur" />
        <ActionButton loading={recordAttendanceMut.isPending} onPress={() => run(() => recordAttendanceMut.mutateAsync())} title="İlk etüde katılım işle" />

        <Field label="Kulüp adı" onChangeText={setClubName} value={clubName} />
        <Field keyboardType="numeric" label="Kontenjan" onChangeText={setClubCapacity} value={clubCapacity} />
        <ActionButton loading={createClubMut.isPending} onPress={() => run(() => createClubMut.mutateAsync())} title="Kulüp oluştur" />
        <Text style={styles.assignText}>Üyelik hedefi: {firstStudentName}</Text>
        <ActionButton loading={addMembershipMut.isPending} onPress={() => run(() => addMembershipMut.mutateAsync())} title="İlk öğrenciye kulüp ata" />
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function ActionButton({ title, loading, onPress }: { title: string; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={[styles.actionBtn, loading && styles.actionBtnDisabled]}>
      {loading ? <ActivityIndicator color="#fff" /> : <Plus color="#fff" size={16} strokeWidth={2.4} />}
      {!loading ? <Text style={styles.actionBtnText}>{title}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 2
  },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
  statValue: { fontSize: 18, color: colors.text, fontWeight: "900" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: colors.text },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: "800", color: colors.text },
  meta: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
  alertText: { fontSize: 11, fontWeight: "800", color: colors.danger },
  smallLine: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: colors.textMuted },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    color: colors.text,
    fontWeight: "700"
  },
  inlineFields: { flexDirection: "row", gap: 8 },
  inlineField: { flex: 1 },
  actionBtn: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  actionBtnDisabled: { opacity: 0.72 },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  assignText: { fontSize: 11, color: colors.textMuted, fontWeight: "800" }
});
