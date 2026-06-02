import { useEffect, useState, type ReactNode } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuth } from "@/shared/auth/AuthContext";
import { resolveMobileShell } from "@/shared/auth/roleRoutes";
import { colors } from "@/shared/theme/colors";
import { ensurePushPermissions } from "@/shared/push/registerPushNotifications";
import { parsePushData, resolvePushRoute } from "@/shared/push/pushNavigation";

export function PushPermissionPrompt() {
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!session || Platform.OS === "web") return;
    void (async () => {
      const status = await Notifications.getPermissionsAsync();
      if (status.granted) return;
      setVisible(true);
    })();
  }, [session?.accessToken]);

  if (!visible) return null;

  return (
    <Modal animationType="fade" transparent visible>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Bildirimleri açın</Text>
          <Text style={styles.body}>
            Devamsızlık, duyuru ve destek güncellemelerini anında almak için bildirim izni verin.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void ensurePushPermissions().finally(() => setVisible(false));
            }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryText}>Bildirimleri aç</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Daha sonra</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function usePushDeepLinks() {
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    if (!session || Platform.OS === "web") return;
    const activeSession = session;

    function handle(data: Record<string, unknown> | undefined) {
      const shell = resolveMobileShell(activeSession.principal.role);
      if (shell === "super_admin_blocked") return;
      const route = resolvePushRoute(shell, parsePushData(data));
      if (route) {
        router.push(route);
      }
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handle(response.notification.request.content.data as Record<string, unknown>);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handle(response.notification.request.content.data as Record<string, unknown>);
      }
    });

    return () => sub.remove();
  }, [router, session?.accessToken, session?.principal.role]);
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: { alignItems: "center", paddingVertical: 8 },
  secondaryText: { color: colors.textMuted, fontWeight: "600" }
});
