import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/shared/auth/AuthContext";
import { resolveMobileShell } from "@/shared/auth/roleRoutes";
import { colors } from "@/shared/theme/colors";

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (session.principal.mustChangePassword) {
    return <Redirect href="/(auth)/first-login" />;
  }

  const shell = resolveMobileShell(session.principal.role);
  if (shell === "super_admin_blocked") {
    return <Redirect href="/(app)/super-admin-blocked" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="principal" />
      <Stack.Screen name="teacher" />
      <Stack.Screen name="guardian" />
      <Stack.Screen name="guidance" />
      <Stack.Screen name="super-admin-blocked" options={{ headerShown: true, title: "Web panel" }} />
    </Stack>
  );
}
