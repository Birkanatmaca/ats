import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bus, Plus, TriangleAlert, UserRound } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { usePrincipalRoster } from "@/features/principal/usePrincipalRoster";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import { colors } from "@/shared/theme/colors";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";

function directionLabel(value: string) {
  if (value === "evening") return "Akşam";
  if (value === "both") return "Sabah/Akşam";
  return "Sabah";
}

export function PrincipalServicesScreen() {
  const queryClient = useQueryClient();
  const routesQ = useQuery({ queryKey: queryKeys.serviceRoutes, queryFn: () => api.serviceRoutes() });
  const vehiclesQ = useQuery({ queryKey: queryKeys.serviceVehicles, queryFn: () => api.serviceVehicles() });
  const staffQ = useQuery({ queryKey: queryKeys.serviceStaff, queryFn: () => api.serviceStaff() });
  const rosterQ = usePrincipalRoster();

  const [plate, setPlate] = useState("34 OTS 202");
  const [capacity, setCapacity] = useState("12");
  const [staffName, setStaffName] = useState("Yeni Şoför");
  const [staffPhone, setStaffPhone] = useState("+90 555 000 0000");
  const [routeName, setRouteName] = useState("Yeni Sabah Rotası");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRoutes });
    void queryClient.invalidateQueries({ queryKey: queryKeys.serviceVehicles });
    void queryClient.invalidateQueries({ queryKey: queryKeys.serviceStaff });
  };

  const createVehicleMut = useMutation({
    mutationFn: () => {
      const parsedCapacity = Number.parseInt(capacity, 10);
      if (!plate.trim() || !Number.isFinite(parsedCapacity) || parsedCapacity <= 0) throw new Error("Plaka ve kapasite zorunludur.");
      return api.createServiceVehicle({ plate: plate.trim(), capacity: parsedCapacity });
    },
    onSuccess: invalidate
  });

  const createStaffMut = useMutation({
    mutationFn: () => {
      if (!staffName.trim()) throw new Error("Personel adı zorunludur.");
      return api.createServiceStaff({ fullName: staffName.trim(), phone: staffPhone.trim(), role: "driver" });
    },
    onSuccess: invalidate
  });

  const createRouteMut = useMutation({
    mutationFn: () => {
      if (!routeName.trim()) throw new Error("Rota adı zorunludur.");
      const vehicle = vehiclesQ.data?.[0];
      const driver = staffQ.data?.find((item) => item.role === "driver");
      return api.createServiceRoute({
        name: routeName.trim(),
        direction: "morning",
        vehicleId: vehicle?.id,
        driverId: driver?.id,
        stops: [
          { name: "Birinci Durak", plannedTime: "07:30" },
          { name: "Okul Kapısı", plannedTime: "08:05" }
        ]
      });
    },
    onSuccess: invalidate
  });

  const assignMut = useMutation({
    mutationFn: () => {
      const student = rosterQ.data?.students?.[0];
      const route = routesQ.data?.[0];
      if (!student || !route) throw new Error("Atama için öğrenci ve rota gerekir.");
      return api.assignServiceStudent({
        studentId: student.id,
        routeId: route.id,
        stopId: route.stops[0]?.id,
        direction: route.direction === "evening" ? "evening" : "morning"
      });
    },
    onSuccess: invalidate
  });

  const routes = routesQ.data ?? [];
  const vehicles = vehiclesQ.data ?? [];
  const staff = staffQ.data ?? [];
  const assignedCount = routes.reduce((sum, route) => sum + route.assignments.length, 0);
  const warningCount = routes.filter((route) => route.capacityWarning).length;
  const loading = routesQ.isLoading || vehiclesQ.isLoading || staffQ.isLoading;
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
      title="Servis"
      subtitle="Rota, araç ve atamalar"
      refreshing={routesQ.isRefetching || vehiclesQ.isRefetching || staffQ.isRefetching}
      onRefresh={() => {
        void routesQ.refetch();
        void vehiclesQ.refetch();
        void staffQ.refetch();
      }}
    >
      <View style={styles.stats}>
        <Stat label="Rota" value={routes.length} />
        <Stat label="Araç" value={vehicles.length} />
        <Stat label="Atama" value={assignedCount} />
        <Stat danger={warningCount > 0} label="Uyarı" value={warningCount} />
      </View>

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {loading ? <LoadingBlock /> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rotalar</Text>
        {routes.map((route) => (
          <View key={route.id} style={styles.routeCard}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Bus color={colors.accent} size={18} strokeWidth={2.3} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{route.name}</Text>
                <Text style={styles.meta}>
                  {directionLabel(route.direction)} · {route.vehiclePlate || "Araç yok"} · {route.driverName || "Şoför yok"}
                </Text>
              </View>
              <Text style={styles.count}>{route.assignments.length}</Text>
            </View>
            {route.capacityWarning ? (
              <View style={styles.warningRow}>
                <TriangleAlert color={colors.danger} size={14} strokeWidth={2.3} />
                <Text style={styles.warningText}>{route.capacityWarning}</Text>
              </View>
            ) : null}
            {route.stops.slice(0, 3).map((stop) => (
              <View key={stop.id} style={styles.stopRow}>
                <Text style={styles.stopTime}>{stop.plannedTime}</Text>
                <Text style={styles.stopName}>{stop.name}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Hızlı servis kurulumu</Text>
        <Field label="Araç plakası" onChangeText={setPlate} value={plate} />
        <Field keyboardType="numeric" label="Kapasite" onChangeText={setCapacity} value={capacity} />
        <ActionButton loading={createVehicleMut.isPending} onPress={() => run(() => createVehicleMut.mutateAsync())} title="Araç ekle" />

        <Field label="Şoför adı" onChangeText={setStaffName} value={staffName} />
        <Field label="Telefon" onChangeText={setStaffPhone} value={staffPhone} />
        <ActionButton loading={createStaffMut.isPending} onPress={() => run(() => createStaffMut.mutateAsync())} title="Şoför ekle" />

        <Field label="Rota adı" onChangeText={setRouteName} value={routeName} />
        <ActionButton loading={createRouteMut.isPending} onPress={() => run(() => createRouteMut.mutateAsync())} title="Rota oluştur" />

        <View style={styles.assignHint}>
          <UserRound color={colors.textMuted} size={15} strokeWidth={2.2} />
          <Text style={styles.assignText}>Atama hedefi: {firstStudentName}</Text>
        </View>
        <ActionButton loading={assignMut.isPending} onPress={() => run(() => assignMut.mutateAsync())} title="İlk öğrenciye rota ata" />
      </View>
    </Screen>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, danger && styles.statDanger]}>{value}</Text>
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
  statDanger: { color: colors.danger },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: colors.text },
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentLight
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: "900", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  count: { fontSize: 16, fontWeight: "900", color: colors.accent },
  warningRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  warningText: { fontSize: 12, fontWeight: "800", color: colors.danger },
  stopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stopTime: { width: 46, fontSize: 12, fontWeight: "900", color: colors.primaryLight },
  stopName: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.text },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.background,
    fontSize: 14,
    color: colors.text
  },
  actionBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  actionBtnDisabled: { opacity: 0.65 },
  actionBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  assignHint: { flexDirection: "row", alignItems: "center", gap: 8 },
  assignText: { flex: 1, fontSize: 12, color: colors.textMuted, fontWeight: "700" }
});
