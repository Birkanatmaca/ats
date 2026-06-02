import { Stack } from "expo-router";
import { OgtaAiProvider } from "@/features/ai/OgtaAiContext";
import { roleStackScreenOptions, swipeDetailScreenOptions } from "@/shared/navigation/roleStackOptions";

export default function GuidanceRootLayout() {
  return (
    <OgtaAiProvider>
      <Stack screenOptions={roleStackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="announcements" options={swipeDetailScreenOptions} />
        <Stack.Screen name="notifications" options={swipeDetailScreenOptions} />
        <Stack.Screen name="support" options={swipeDetailScreenOptions} />
        <Stack.Screen name="profile" options={swipeDetailScreenOptions} />
        <Stack.Screen name="students/[studentId]" options={swipeDetailScreenOptions} />
        <Stack.Screen name="cases/index" options={swipeDetailScreenOptions} />
        <Stack.Screen name="cases/[caseId]" options={swipeDetailScreenOptions} />
      </Stack>
    </OgtaAiProvider>
  );
}
