import { Stack } from "expo-router";
import { OgtaAiProvider } from "@/features/ai/OgtaAiContext";
import { GuardianProvider } from "@/features/guardian/GuardianContext";
import { roleStackScreenOptions, swipeDetailScreenOptions } from "@/shared/navigation/roleStackOptions";

export default function GuardianRootLayout() {
  return (
    <OgtaAiProvider>
      <GuardianProvider>
        <Stack screenOptions={roleStackScreenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="announcements" options={swipeDetailScreenOptions} />
          <Stack.Screen name="notifications" options={swipeDetailScreenOptions} />
          <Stack.Screen name="support" options={swipeDetailScreenOptions} />
          <Stack.Screen name="profile" options={swipeDetailScreenOptions} />
        </Stack>
      </GuardianProvider>
    </OgtaAiProvider>
  );
}
