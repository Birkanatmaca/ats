import { Stack } from "expo-router";
import { roleStackScreenOptions } from "@/shared/navigation/roleStackOptions";

export default function DriverRootLayout() {
  return (
    <Stack screenOptions={roleStackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}