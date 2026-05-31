import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/shared/auth/AuthContext";

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (!loading && session && !session.principal.mustChangePassword) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="first-login" options={{ headerShown: true, title: "İlk giriş" }} />
    </Stack>
  );
}
