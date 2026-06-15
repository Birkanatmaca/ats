import { MapPinned } from "lucide-react";
import type { ServiceTripLocation } from "../../lib/api";
import "./ServiceLiveMap.css";

type StopPoint = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
};

type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  kind: "start" | "vehicle" | "stop" | "track";
};

type ProjectedPoint = MapPoint & {
  x: number;
  y: number;
};

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 62;
const MAP_PAD = 8;

function isCoordinate(latitude?: number | null, longitude?: number | null) {
  return typeof latitude === "number" && Number.isFinite(latitude) && typeof longitude === "number" && Number.isFinite(longitude);
}

function sortLocations(locations: ServiceTripLocation[]) {
  return [...locations].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
}

function buildGoogleMapsURL(point?: { latitude: number; longitude: number } | null) {
  if (!point) return "";
  return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
}

function project(points: MapPoint[]): ProjectedPoint[] {
  if (points.length === 0) return [];

  const minLat = Math.min(...points.map((point) => point.latitude));
  const maxLat = Math.max(...points.map((point) => point.latitude));
  const minLng = Math.min(...points.map((point) => point.longitude));
  const maxLng = Math.max(...points.map((point) => point.longitude));
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;

  return points.map((point, index) => {
    if (latSpan === 0 && lngSpan === 0) {
      return {
        ...point,
        x: VIEWBOX_WIDTH / 2 + (index % 3 - 1) * 2.4,
        y: VIEWBOX_HEIGHT / 2 + (Math.floor(index / 3) % 3 - 1) * 2.4
      };
    }
    const x =
      lngSpan === 0
        ? VIEWBOX_WIDTH / 2
        : MAP_PAD + ((point.longitude - minLng) / lngSpan) * (VIEWBOX_WIDTH - MAP_PAD * 2);
    const y =
      latSpan === 0
        ? VIEWBOX_HEIGHT / 2
        : MAP_PAD + ((maxLat - point.latitude) / latSpan) * (VIEWBOX_HEIGHT - MAP_PAD * 2);
    return { ...point, x, y };
  });
}

export function ServiceLiveMap({
  locations = [],
  lastLocation,
  stop,
  stale = false,
  compact = false
}: {
  locations?: ServiceTripLocation[];
  lastLocation?: ServiceTripLocation | null;
  stop?: StopPoint | null;
  stale?: boolean;
  compact?: boolean;
}) {
  const sortedLocations = sortLocations(locations);
  const latestLocation = lastLocation ?? sortedLocations[sortedLocations.length - 1] ?? null;
  const trackPoints: MapPoint[] = sortedLocations
    .filter((location) => isCoordinate(location.latitude, location.longitude))
    .map((location, index, all) => ({
      id: location.id || `track-${index}`,
      latitude: location.latitude,
      longitude: location.longitude,
      label: index === all.length - 1 ? "Son konum" : "Konum",
      kind: index === 0 ? "start" : index === all.length - 1 ? "vehicle" : "track"
    }));

  if (latestLocation && !trackPoints.some((point) => point.latitude === latestLocation.latitude && point.longitude === latestLocation.longitude)) {
    trackPoints.push({
      id: latestLocation.id || "latest-location",
      latitude: latestLocation.latitude,
      longitude: latestLocation.longitude,
      label: "Son konum",
      kind: "vehicle"
    });
  }

  const stopPoint: MapPoint | null = isCoordinate(stop?.latitude, stop?.longitude)
    ? {
        id: "target-stop",
        latitude: stop!.latitude!,
        longitude: stop!.longitude!,
        label: stop?.label || "Durak",
        kind: "stop"
      }
    : null;
  const projected = project([...trackPoints, ...(stopPoint ? [stopPoint] : [])]);
  const projectedTrack = projected.filter((point) => point.kind !== "stop");
  const projectedStop = projected.find((point) => point.kind === "stop") ?? null;
  const projectedVehicle = [...projectedTrack].reverse().find((point) => point.kind === "vehicle") ?? projectedTrack[projectedTrack.length - 1] ?? null;
  const projectedStart = projectedTrack[0] ?? null;
  const href = buildGoogleMapsURL(latestLocation ?? stopPoint);

  if (projected.length === 0) {
    return (
      <div className={`service-live-map-canvas service-live-map-canvas--empty${compact ? " is-compact" : ""}`}>
        <MapPinned size={18} />
        <span>Canlı konum henüz paylaşılmadı.</span>
      </div>
    );
  }

  const routeLine = projectedTrack.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className={`service-live-map-canvas${compact ? " is-compact" : ""}${stale ? " is-stale" : ""}`}>
      <svg
        aria-label="Servis canlı harita"
        className="service-live-map-svg"
        role="img"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="serviceMapTrack" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <rect className="service-live-map-bg" x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx="4" />
        {[16, 32, 48, 64, 80].map((x) => (
          <line className="service-live-map-grid-line" key={`x-${x}`} x1={x} x2={x} y1="0" y2={VIEWBOX_HEIGHT} />
        ))}
        {[14, 28, 42, 56].map((y) => (
          <line className="service-live-map-grid-line" key={`y-${y}`} x1="0" x2={VIEWBOX_WIDTH} y1={y} y2={y} />
        ))}
        {routeLine ? <polyline className="service-live-map-route" points={routeLine} /> : null}
        {projectedStart && projectedTrack.length > 1 ? (
          <circle className="service-live-map-start" cx={projectedStart.x} cy={projectedStart.y} r="2.1" />
        ) : null}
        {projectedTrack
          .filter((point) => point.kind === "track")
          .slice(-8)
          .map((point) => (
            <circle className="service-live-map-dot" cx={point.x} cy={point.y} key={point.id} r="1.4" />
          ))}
        {projectedStop ? (
          <g className="service-live-map-stop">
            <circle cx={projectedStop.x} cy={projectedStop.y} r="3.2" />
            <text x={projectedStop.x} y={Math.max(7, projectedStop.y - 5)}>
              Durak
            </text>
          </g>
        ) : null}
        {projectedVehicle ? (
          <g className="service-live-map-vehicle">
            <circle cx={projectedVehicle.x} cy={projectedVehicle.y} r="4.2" />
            <path d={`M ${projectedVehicle.x - 1.8} ${projectedVehicle.y + 1.9} L ${projectedVehicle.x} ${projectedVehicle.y - 2.2} L ${projectedVehicle.x + 1.8} ${projectedVehicle.y + 1.9} Z`} />
          </g>
        ) : null}
      </svg>
      <div className="service-live-map-meta">
        <span>Araç</span>
        {projectedTrack.length > 1 ? <span>{projectedTrack.length} konum</span> : null}
        {projectedStop ? <span>{projectedStop.label}</span> : null}
        {stale ? <span className="is-warning">Gecikmiş</span> : null}
        {href ? (
          <a href={href} rel="noreferrer" target="_blank">
            Haritada aç
          </a>
        ) : null}
      </div>
    </div>
  );
}
