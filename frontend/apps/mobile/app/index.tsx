import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/shared/auth/AuthContext";
import { resolveMobileShell, shellHref } from "@/shared/auth/roleRoutes";
import { colors } from "@/shared/theme/colors";

export default function Index() {
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
  return <Redirect href={shellHref(shell)} />;
}
