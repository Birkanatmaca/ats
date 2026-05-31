import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/shared/auth/AuthContext";
import { roleLabels, resolveMobileShell } from "@/shared/auth/roleRoutes";
import { getMoreMenuItems } from "@/shared/navigation/roleTabs";
import { ListCard } from "@/shared/ui/ListCard";
import { Screen } from "@/shared/ui/Screen";
import { colors } from "@/shared/theme/colors";

export function MoreScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const role = session?.principal.role;
  const shell = role ? resolveMobileShell(role) : null;

  if (!shell || shell === "super_admin_blocked") {
    return (
      <Screen title="Daha Fazla">
        <Text>Erişim yok.</Text>
      </Screen>
    );
  }

  const menu = getMoreMenuItems(shell);

  return (
    <Screen title="Daha Fazla" subtitle={role ? roleLabels[role] : undefined}>
      {menu.map((item) => (
        <ListCard key={item.key} onPress={() => router.push(item.route as never)} subtitle="Aç" title={item.label} />
      ))}

      <View style={styles.section}>
        <Pressable
          onPress={() => {
            void signOut().then(() => router.replace("/(auth)/login"));
          }}
          style={styles.logout}
        >
          <Text style={styles.logoutText}>Çıkış yap</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8 },
  logout: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  logoutText: { color: colors.danger, fontWeight: "700", fontSize: 15 }
});
