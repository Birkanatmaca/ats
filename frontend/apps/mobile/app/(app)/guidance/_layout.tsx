import { Stack } from "expo-router";
import { roleStackScreenOptions } from "@/shared/navigation/roleStackOptions";

export default function GuidanceRootLayout() {
  return (
    <Stack screenOptions={roleStackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="announcements" options={{ title: "Duyurular" }} />
      <Stack.Screen name="notifications" options={{ title: "Bildirimler" }} />
      <Stack.Screen name="support" options={{ title: "Destek" }} />
      <Stack.Screen name="profile" options={{ title: "Profil" }} />
    </Stack>
  );
}
