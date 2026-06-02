import { describe, expect, it } from "vitest";
import { canRegisterPushOnPlatform } from "./pushPlatform";
import { parsePushData, resolvePushRoute } from "./pushNavigation";

describe("pushPlatform", () => {
  it("disables push on web", () => {
    expect(canRegisterPushOnPlatform("web", true)).toBe(false);
  });

  it("requires physical device on native", () => {
    expect(canRegisterPushOnPlatform("ios", false)).toBe(false);
    expect(canRegisterPushOnPlatform("ios", true)).toBe(true);
  });
});

describe("pushNavigation", () => {
  it("routes guardian attendance push", () => {
    expect(resolvePushRoute("guardian", { category: "attendance" })).toBe("/(app)/guardian/attendance");
  });

  it("routes guidance payloads to role-safe screens", () => {
    expect(resolvePushRoute("guidance", { category: "guidance", caseId: "case-1" })).toBe(
      "/(app)/guidance/cases/case-1"
    );
    expect(resolvePushRoute("principal", { category: "guidance", caseId: "case-1" })).toBe(
      "/(app)/principal/guidance-cases"
    );
  });

  it("parses push payload", () => {
    expect(parsePushData({ category: "support", ticketId: "t-1", caseId: "case-1" })).toEqual({
      category: "support",
      ticketId: "t-1",
      caseId: "case-1"
    });
  });
});
