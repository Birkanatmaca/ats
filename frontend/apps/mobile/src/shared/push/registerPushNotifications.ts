import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "@/shared/api/client";
import { canRegisterPushOnPlatform } from "@/shared/push/pushPlatform";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

function resolveProjectId() {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

export async function ensurePushPermissions() {
  if (!canRegisterPushOnPlatform(Platform.OS, Device.isDevice)) {
    return false;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function getExpoPushToken() {
  if (!canRegisterPushOnPlatform(Platform.OS, Device.isDevice)) {
    return null;
  }
  const projectId = resolveProjectId();
  if (!projectId) {
    return null;
  }
  const allowed = await ensurePushPermissions();
  if (!allowed) {
    return null;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "OGTAŞIS",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250]
    });
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId: String(projectId) });
  return token.data;
}

export async function registerPushTokenWithBackend() {
  const token = await getExpoPushToken();
  if (!token) return null;
  await api.registerDeviceToken({ token, platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "expo" });
  return token;
}

export async function unregisterPushToken(token: string) {
  if (!token.trim()) return;
  await api.unregisterDeviceToken(token);
}
