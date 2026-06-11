import type { ServiceLiveStatus } from "@/shared/api/types";

export function formatLiveStatus(status?: ServiceLiveStatus | null) {
  if (!status?.active) {
    return "Servis şu an canlı değil.";
  }
  if (status.locationStale) {
    return "Son konum güncellemesi gecikmiş olabilir.";
  }
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
  if (status.lastLocationAt) {
    parts.push(
      new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(status.lastLocationAt))
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "Canlı konum alınıyor";
}
