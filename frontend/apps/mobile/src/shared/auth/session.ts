import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "@/shared/api/types";

const AUTH_STORAGE_KEY = "ots.auth.session";

async function readStoredValue(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function writeStoredValue(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
    } catch {
      /* ignore quota / private mode */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeStoredValue(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function readAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await readStoredValue(AUTH_STORAGE_KEY);
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
  await writeStoredValue(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function clearAuthSession(): Promise<void> {
  await removeStoredValue(AUTH_STORAGE_KEY);
}
