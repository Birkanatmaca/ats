import { unregisterPushToken } from "@/shared/push/registerPushNotifications";

let lastRegisteredPushToken: string | null = null;

export function setLastRegisteredPushToken(token: string | null) {
  lastRegisteredPushToken = token;
}

export async function unregisterStoredPushToken(token = lastRegisteredPushToken) {
  const targetToken = token?.trim();
  if (!targetToken) return;
  await unregisterPushToken(targetToken);
  if (lastRegisteredPushToken === targetToken) {
    lastRegisteredPushToken = null;
  }
}
