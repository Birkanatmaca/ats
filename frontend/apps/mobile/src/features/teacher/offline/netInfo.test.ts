import { describe, expect, it } from "vitest";
import { isOnline, readConnectivity } from "./connectivityState";

describe("offline connectivity", () => {
  it("treats disconnected state as offline", () => {
    expect(
      isOnline(
        readConnectivity({ isConnected: false, isInternetReachable: false, type: "none", details: null } as never)
      )
    ).toBe(false);
  });

  it("treats reachable connection as online", () => {
    expect(
      isOnline(readConnectivity({ isConnected: true, isInternetReachable: true, type: "wifi", details: null } as never))
    ).toBe(true);
  });
});
