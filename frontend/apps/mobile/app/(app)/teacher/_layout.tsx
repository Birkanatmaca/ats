import { Stack } from "expo-router";
import { OgtaAiProvider } from "@/features/ai/OgtaAiContext";
import { OfflineAttendanceProvider } from "@/features/teacher/offline/OfflineAttendanceContext";
import { roleStackScreenOptions, swipeDetailScreenOptions } from "@/shared/navigation/roleStackOptions";

export default function TeacherRootLayout() {
  return (
    <OgtaAiProvider>
      <OfflineAttendanceProvider>
        <Stack screenOptions={roleStackScreenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="announcements" options={swipeDetailScreenOptions} />
          <Stack.Screen name="life" options={swipeDetailScreenOptions} />
          <Stack.Screen name="notifications" options={swipeDetailScreenOptions} />
          <Stack.Screen name="support" options={swipeDetailScreenOptions} />
          <Stack.Screen name="profile" options={swipeDetailScreenOptions} />
        </Stack>
      </OfflineAttendanceProvider>
    </OgtaAiProvider>
  );
}
