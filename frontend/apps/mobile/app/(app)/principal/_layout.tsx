import { Stack } from "expo-router";
import { OgtaAiProvider } from "@/features/ai/OgtaAiContext";
import { roleStackScreenOptions, swipeDetailScreenOptions } from "@/shared/navigation/roleStackOptions";

export default function PrincipalRootLayout() {
  return (
    <OgtaAiProvider>
      <Stack screenOptions={roleStackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="classes/[classId]/index" options={swipeDetailScreenOptions} />
        <Stack.Screen name="classes/[classId]/[sectionId]" options={swipeDetailScreenOptions} />
        <Stack.Screen name="attendance/index" options={swipeDetailScreenOptions} />
        <Stack.Screen name="attendance/[classId]" options={swipeDetailScreenOptions} />
        <Stack.Screen name="risks" options={swipeDetailScreenOptions} />
        <Stack.Screen name="teachers" options={swipeDetailScreenOptions} />
        <Stack.Screen name="schedule" options={swipeDetailScreenOptions} />
        <Stack.Screen name="announcements" options={swipeDetailScreenOptions} />
        <Stack.Screen name="notifications" options={swipeDetailScreenOptions} />
        <Stack.Screen name="support" options={swipeDetailScreenOptions} />
        <Stack.Screen name="profile" options={swipeDetailScreenOptions} />
      </Stack>
    </OgtaAiProvider>
  );
}
