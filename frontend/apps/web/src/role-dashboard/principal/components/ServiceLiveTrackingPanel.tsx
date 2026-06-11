import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import type { ServiceTrip } from "../../../lib/api";

const LIVE_POLL_MS = 12_000;

function staticMapUrl(latitude: number, longitude: number) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=640x220&markers=${latitude},${longitude},red-pushpin`;
}

function directionLabel(value: string) {
  if (value === "evening") return "Akşam";
  if (value === "both") return "Sabah/Akşam";
  return "Sabah";
}

function formatLiveStatus(trip: ServiceTrip) {
  const status = trip.liveStatus;
  if (!status?.active) return "Servis şu an canlı değil.";
  if (status.locationStale) return "Son konum güncellemesi gecikmiş olabilir.";
  const parts: string[] = [];
  if (typeof status.etaMinutes === "number" && status.etaMinutes > 0) {
    parts.push(`Tahmini varış ~${status.etaMinutes} dk`);
  }
  if (typeof status.distanceKm === "number" && status.distanceKm > 0) {
    parts.push(`${status.distanceKm.toFixed(1)} km`);
  }
  if (typeof status.speedKph === "number" && status.speedKph > 0) {
    parts.push(`${Math.round(status.speedKph)} km/s`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Canlı konum alınıyor";
}

export function ServiceLiveTrackingPanel() {
  const [trips, setTrips] = useState<ServiceTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const items = await api.activeServiceTrips();
        if (!cancelled) {
          setTrips(items ?? []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Canlı seferler alınamadı.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, LIVE_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <article className="guidance-data-card">
      <header className="guidance-data-card-head">
        <h2>Canlı sefer takibi</h2>
        <span>{loading ? "Yükleniyor" : `${trips.length} aktif sefer`}</span>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      {trips.length === 0 && !loading ? (
        <p className="guidance-data-empty">Şu an canlı sefer yok. Şoför konum paylaşımını başlattığında burada görünür.</p>
      ) : null}

      <div className="service-live-grid">
        {trips.map((trip) => {
          const lat = trip.lastLocation?.latitude;
          const lng = trip.lastLocation?.longitude;
          return (
            <div key={trip.id} className="service-live-card">
              <div className="service-live-card-head">
                <strong>{trip.routeName ?? "Servis rotası"}</strong>
                <span>
                  {trip.driverName ?? "Şoför"} · {directionLabel(trip.direction)}
                </span>
              </div>
              <p className="service-live-status">{formatLiveStatus(trip)}</p>
              {typeof lat === "number" && typeof lng === "number" ? (
                <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} rel="noreferrer" target="_blank">
                  <img alt="Servis canlı harita" className="service-live-map" src={staticMapUrl(lat, lng)} />
                </a>
              ) : (
                <p className="guidance-data-empty">Canlı konum henüz paylaşılmadı.</p>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
