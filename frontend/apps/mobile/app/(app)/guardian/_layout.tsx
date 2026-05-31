import { Stack } from "expo-router";
import { GuardianProvider } from "@/features/guardian/GuardianContext";
import { roleStackScreenOptions } from "@/shared/navigation/roleStackOptions";

export default function GuardianRootLayout() {
  return (
    <GuardianProvider>
      <Stack screenOptions={roleStackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="announcements" options={{ title: "Duyurular" }} />
        <Stack.Screen name="notifications" options={{ title: "Bildirimler" }} />
        <Stack.Screen name="support" options={{ title: "Destek" }} />
        <Stack.Screen name="profile" options={{ title: "Profil" }} />
      </Stack>
    </GuardianProvider>
  );
}
