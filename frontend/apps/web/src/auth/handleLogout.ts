import type { AuthSession } from "../lib/api";
import { api, clearAuthSession } from "../lib/api";

export function handleLogout(setSession: (session: AuthSession | null) => void) {
  void api.logout().catch(() => undefined);
  clearAuthSession();
  setSession(null);
}
