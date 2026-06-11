import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";

const LOCATION_INTERVAL_MS = 15_000;

export function useDriverLocationSharing(enabled: boolean, tripId?: string) {
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activeTripId = tripId?.trim();
    if (!enabled || !activeTripId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function sendLocation(tripIdForSend: string) {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          if (!cancelled) {
            setPermissionDenied(true);
            setError("Konum izni verilmedi. Canlı takip için izin gerekli.");
          }
          return;
        }
        if (!cancelled) {
          setPermissionDenied(false);
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        if (cancelled) {
          return;
        }

        await api.recordDriverTripLocation(tripIdForSend, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy ?? undefined,
          speedKph: position.coords.speed != null ? Math.max(0, position.coords.speed * 3.6) : undefined,
          headingDegrees: position.coords.heading ?? undefined,
          capturedAt: new Date().toISOString()
        });
        if (!cancelled) {
          setLastSentAt(new Date().toISOString());
          setError(null);
        }
      } catch (sendError) {
        if (!cancelled) {
          setError(sendError instanceof Error ? sendError.message : "Konum gönderilemedi.");
        }
      }
    }

    void sendLocation(activeTripId);
    timer = setInterval(() => {
      void sendLocation(activeTripId);
    }, LOCATION_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [enabled, tripId]);

  return { permissionDenied, lastSentAt, error };
}
