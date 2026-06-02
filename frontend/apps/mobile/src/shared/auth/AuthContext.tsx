import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/shared/api/client";
import type { AuthSession } from "@/shared/api/types";
import { clearAuthSession, readAuthSession, storeAuthSession } from "@/shared/auth/session";
import { unregisterStoredPushToken } from "@/shared/push/pushTokenRegistry";

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const stored = await readAuthSession();
      setSession(stored);
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (next: AuthSession) => {
    await storeAuthSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await unregisterStoredPushToken();
    } catch {
      /* ignore unregister errors */
    }
    try {
      await api.logout();
    } catch {
      /* ignore network errors on logout */
    }
    await clearAuthSession();
    queryClient.clear();
    setSession(null);
  }, [queryClient]);

  const refreshSession = useCallback(async () => {
    const stored = await readAuthSession();
    setSession(stored);
    return stored;
  }, []);

  const value = useMemo(
    () => ({ session, loading, signIn, signOut, refreshSession }),
    [session, loading, signIn, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
