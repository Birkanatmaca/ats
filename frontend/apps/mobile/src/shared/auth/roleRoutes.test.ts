import { describe, expect, it } from "vitest";
import { resolveMobileShell, shellHref } from "./roleRoutes";

describe("roleRoutes", () => {
  it("maps roles to mobile shells", () => {
    expect(resolveMobileShell("teacher")).toBe("teacher");
    expect(resolveMobileShell("system_admin")).toBe("principal");
    expect(resolveMobileShell("super_admin")).toBe("super_admin_blocked");
  });

  it("returns typed shell hrefs", () => {
    expect(shellHref("teacher")).toBe("/(app)/teacher");
    expect(shellHref("guardian")).toBe("/(app)/guardian");
    expect(shellHref("super_admin_blocked")).toBe("/(app)/super-admin-blocked");
  });
});
