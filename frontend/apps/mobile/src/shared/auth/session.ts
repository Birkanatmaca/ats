import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "@/shared/api/types";

const AUTH_STORAGE_KEY = "ots.auth.session";

export async function readAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as Partial<AuthSession>;
    if (!session.accessToken || !session.principal?.role) {
      await clearAuthSession();
      return null;
    }
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      const refreshValid =
        session.refreshToken &&
        (!session.refreshExpiresAt || new Date(session.refreshExpiresAt).getTime() > Date.now());
      if (!refreshValid) {
        await clearAuthSession();
        return null;
      }
    }
    session.principal.mustChangePassword = Boolean(session.principal.mustChangePassword);
    return session as AuthSession;
  } catch {
    return null;
  }
}

export async function storeAuthSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
}
