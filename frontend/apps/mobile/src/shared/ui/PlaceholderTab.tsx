import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/shared/auth/AuthContext";
import { roleLabels } from "@/shared/auth/roleRoutes";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ListCard } from "@/shared/ui/ListCard";
import { Screen } from "@/shared/ui/Screen";
import { StatCard } from "@/shared/ui/StatCard";
import { colors } from "@/shared/theme/colors";

export function PlaceholderTab({
  title,
  description,
  phase = "Faz 1"
}: {
  title: string;
  description: string;
  phase?: string;
}) {
  const { session } = useAuth();
  const role = session?.principal.role;
  const roleLabel = role ? roleLabels[role] : "Kullanıcı";

  return (
    <Screen title={title} subtitle={`${roleLabel} · ${phase}`}>
      <View style={styles.stats}>
        <StatCard label="Durum" value="İskelet" hint="API bağlantısı hazır" />
        <StatCard label="Sürüm" value="0.1" hint="Faz 0" />
      </View>
      <ListCard title="Kurum" subtitle={session?.principal.name ?? "—"} meta="Oturum aktif" />
      <EmptyState title="İçerik yakında" message={description} />
      <Text style={styles.note}>
        Bu ekran Doc 18 Faz 0 iskeletinin parçasıdır. Veri ve formlar Faz 1 ile API'ye bağlanacak.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  note: { fontSize: 12, color: colors.textMuted, lineHeight: 18 }
});
