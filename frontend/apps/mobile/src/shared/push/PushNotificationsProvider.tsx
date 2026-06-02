import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/shared/auth/AuthContext";
import { PushPermissionPrompt, usePushDeepLinks } from "@/shared/push/PushPermissionPrompt";
import { registerPushTokenWithBackend } from "@/shared/push/registerPushNotifications";
import { setLastRegisteredPushToken } from "@/shared/push/pushTokenRegistry";

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  usePushDeepLinks();

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let active = true;
    void registerPushTokenWithBackend()
      .then((token) => {
        if (active) {
          setLastRegisteredPushToken(token);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  return (
    <>
      {children}
      <PushPermissionPrompt />
    </>
  );
}
