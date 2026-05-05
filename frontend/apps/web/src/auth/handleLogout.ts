import type { AuthSession } from "../lib/api";
import { clearAuthSession } from "../lib/api";

export function handleLogout(setSession: (session: AuthSession | null) => void) {
  clearAuthSession();
  setSession(null);
}
