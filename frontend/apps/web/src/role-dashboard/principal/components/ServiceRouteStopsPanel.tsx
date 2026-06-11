import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import type { ServiceRoute, ServiceRouteStop } from "../../../lib/api";

type StopDraft = {
  id?: string;
  name: string;
  plannedTime: string;
  sortOrder: number;
  latitude: string;
  longitude: string;
};

function stopToDraft(stop: ServiceRouteStop): StopDraft {
  return {
    id: stop.id,
    name: stop.name,
    plannedTime: stop.plannedTime,
    sortOrder: stop.sortOrder,
    latitude: typeof stop.latitude === "number" ? String(stop.latitude) : "",
    longitude: typeof stop.longitude === "number" ? String(stop.longitude) : ""
  };
}

function parseCoord(value: string): number | undefined {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function ServiceRouteStopsPanel() {
  const [routes, setRoutes] = useState<ServiceRoute[]>([]);
  const [routeId, setRouteId] = useState("");
  const [stops, setStops] = useState<StopDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedRoute = routes.find((route) => route.id === routeId);

  const coordStats = useMemo(() => {
    const withCoords = stops.filter((stop) => parseCoord(stop.latitude) != null && parseCoord(stop.longitude) != null).length;
    return { withCoords, total: stops.length };
  }, [stops]);

  async function loadRoutes() {
    setLoading(true);
    setError(null);
    try {
      const items = await api.serviceRoutes();
      const list = items ?? [];
      setRoutes(list);
      setRouteId((current) => current || list[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Rotalar alınamadı.");
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRoutes();
  }, []);

  useEffect(() => {
    if (!selectedRoute) {
      setStops([]);
      return;
    }
    setStops(selectedRoute.stops.map(stopToDraft));
    setMessage(null);
  }, [selectedRoute?.id, selectedRoute?.updatedAt]);

  function updateStop(index: number, patch: Partial<StopDraft>) {
    setStops((current) => current.map((stop, idx) => (idx === index ? { ...stop, ...patch } : stop)));
  }

  async function saveStops(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRoute) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payloadStops = stops.map((stop, index) => {
        const latitude = parseCoord(stop.latitude);
        const longitude = parseCoord(stop.longitude);
        if ((latitude != null && longitude == null) || (latitude == null && longitude != null)) {
          throw new Error(`${stop.name || `Durak ${index + 1}`} için enlem ve boylam birlikte girilmelidir.`);
        }
        return {
          id: stop.id,
          name: stop.name.trim(),
          plannedTime: stop.plannedTime.trim(),
          sortOrder: stop.sortOrder || index + 1,
          latitude,
          longitude
        };
      });
      const updated = await api.updateServiceRoute(selectedRoute.id, { stops: payloadStops });
      setRoutes((current) => current.map((route) => (route.id === updated.id ? updated : route)));
      setStops(updated.stops.map(stopToDraft));
      setMessage(`${updated.name} durakları kaydedildi. ETA için ${updated.stops.filter((s) => s.latitude != null && s.longitude != null).length}/${updated.stops.length} durakta koordinat var.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Duraklar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="guidance-data-card">
      <header className="guidance-data-card-head">
        <h2>Rota ve durak koordinatları</h2>
        <span>Veli ETA ve yaklaşma bildirimi için durak konumu gerekir</span>
      </header>

      {loading ? <p className="guidance-data-empty">Rotalar yükleniyor…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      {!loading && routes.length === 0 ? (
        <p className="guidance-data-empty">Henüz servis rotası yok. Önce mobil veya API ile rota oluşturun.</p>
      ) : null}

      {!loading && routes.length > 0 ? (
        <form className="guidance-data-form" onSubmit={saveStops}>
          <label className="guidance-data-field">
            <span>Rota</span>
            <select value={routeId} onChange={(event) => setRouteId(event.target.value)}>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name} · {route.stops.length} durak · {route.assignments.length} öğrenci
                </option>
              ))}
            </select>
          </label>

          {selectedRoute ? (
            <p className="service-route-coord-hint">
              Koordinat durumu: <strong>{coordStats.withCoords}/{coordStats.total}</strong> durak hazır
              {coordStats.withCoords < coordStats.total ? " · Eksik duraklarda ETA hesaplanmaz." : " · Canlı takip ETA aktif."}
            </p>
          ) : null}

          <div className="service-route-stops-table-wrap">
            <table className="guidance-data-table service-route-stops-table">
              <thead>
                <tr>
                  <th>Durak</th>
                  <th>Saat</th>
                  <th>Enlem</th>
                  <th>Boylam</th>
                  <th>Harita</th>
                </tr>
              </thead>
              <tbody>
                {stops.map((stop, index) => {
                  const lat = parseCoord(stop.latitude);
                  const lng = parseCoord(stop.longitude);
                  return (
                    <tr key={stop.id ?? `new-${index}`}>
                      <td>
                        <input
                          className="service-route-stop-input"
                          value={stop.name}
                          onChange={(event) => updateStop(index, { name: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="service-route-stop-input service-route-stop-input--time"
                          value={stop.plannedTime}
                          onChange={(event) => updateStop(index, { plannedTime: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="service-route-stop-input"
                          inputMode="decimal"
                          placeholder="41.015"
                          value={stop.latitude}
                          onChange={(event) => updateStop(index, { latitude: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="service-route-stop-input"
                          inputMode="decimal"
                          placeholder="28.979"
                          value={stop.longitude}
                          onChange={(event) => updateStop(index, { longitude: event.target.value })}
                        />
                      </td>
                      <td>
                        {lat != null && lng != null ? (
                          <a href={mapsUrl(lat, lng)} rel="noreferrer" target="_blank">
                            Aç
                          </a>
                        ) : (
                          <span className="guidance-data-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button className="primary-action" disabled={saving || !selectedRoute || stops.length === 0} type="submit">
            {saving ? "Kaydediliyor..." : "Durakları kaydet"}
          </button>
        </form>
      ) : null}
    </article>
  );
}
