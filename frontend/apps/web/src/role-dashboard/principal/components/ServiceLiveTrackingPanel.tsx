import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import type { FormEvent } from "react";
import type { ServiceTrip, ServiceTripEvent, ServiceTripLive, ServiceTripLocation, ServiceTripTimelineItem } from "../../../lib/api";

const LIVE_POLL_MS = 12_000;
const EVENT_OPTIONS = [
  { value: "manual_note", label: "Manuel not" },
  { value: "delay_note", label: "Gecikme notu" },
  { value: "incident", label: "Olay bildirimi" }
] as const;

const EVENT_LABELS: Record<string, string> = {
  delay_note: "Gecikme notu",
  incident: "Olay bildirimi",
  manual_note: "Manuel not",
  student_boarded: "Öğrenci bindi",
  student_left: "Öğrenci indi",
  stop_arrived: "Durağa varıldı",
  stop_departed: "Duraktan çıkıldı"
};

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

function eventLabel(value?: string) {
  if (!value) return "Kayıt";
  return EVENT_LABELS[value] ?? value.replace(/_/g, " ");
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function locationSummary(location: ServiceTripLocation) {
  const parts = [`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`];
  if (typeof location.speedKph === "number" && location.speedKph > 0) {
    parts.push(`${Math.round(location.speedKph)} km/s`);
  }
  if (typeof location.accuracyMeters === "number" && location.accuracyMeters > 0) {
    parts.push(`±${Math.round(location.accuracyMeters)} m`);
  }
  return parts.join(" · ");
}

function eventNote(event: ServiceTripEvent) {
  const note = event.payload?.note;
  return typeof note === "string" && note.trim() ? note.trim() : "";
}

function eventMetadata(event: ServiceTripEvent) {
  const parts: string[] = [];
  const studentID = event.payload?.studentId;
  const stopID = event.payload?.stopId;
  if (typeof studentID === "string" && studentID.trim()) {
    parts.push(`Öğrenci: ${studentID}`);
  }
  if (typeof stopID === "string" && stopID.trim()) {
    parts.push(`Durak: ${stopID}`);
  }
  return parts.join(" · ");
}

function timelineTitle(item: ServiceTripTimelineItem) {
  if (item.type === "location") return "Konum güncellendi";
  return eventLabel(item.eventType ?? item.event?.eventType);
}

function timelineBody(item: ServiceTripTimelineItem) {
  if (item.type === "location" && item.location) return locationSummary(item.location);
  if (item.event) {
    return eventNote(item.event) || eventMetadata(item.event) || "Olay kaydı oluşturuldu.";
  }
  return "Detay yok.";
}

async function loadTripDetail(tripId: string) {
  const [live, timeline] = await Promise.all([api.serviceTripLive(tripId, 120, 50), api.serviceTripTimeline(tripId, 60)]);
  return { live, timeline: timeline ?? [] };
}

export function ServiceLiveTrackingPanel() {
  const [trips, setTrips] = useState<ServiceTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [liveDetail, setLiveDetail] = useState<ServiceTripLive | null>(null);
  const [timeline, setTimeline] = useState<ServiceTripTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [eventType, setEventType] = useState<(typeof EVENT_OPTIONS)[number]["value"]>("manual_note");
  const [eventNoteValue, setEventNoteValue] = useState("");
  const [eventBusy, setEventBusy] = useState(false);
  const [eventMessage, setEventMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const items = await api.activeServiceTrips();
        if (!cancelled) {
          const list = items ?? [];
          setTrips(list);
          setSelectedTripId((current) => (current && list.some((trip) => trip.id === current) ? current : list[0]?.id ?? ""));
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

  useEffect(() => {
    let cancelled = false;
    setEventMessage(null);

    async function load() {
      if (!selectedTripId) {
        setLiveDetail(null);
        setTimeline([]);
        setDetailLoading(false);
        return;
      }
      setDetailLoading(true);
      try {
        const detail = await loadTripDetail(selectedTripId);
        if (!cancelled) {
          setLiveDetail(detail.live);
          setTimeline(detail.timeline);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Sefer detayı alınamadı.");
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
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
  }, [selectedTripId]);

  async function refreshSelectedTrip(tripId = selectedTripId) {
    if (!tripId) return;
    const detail = await loadTripDetail(tripId);
    setLiveDetail(detail.live);
    setTimeline(detail.timeline);
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTripId) return;
    const note = eventNoteValue.trim();
    if (!note) {
      setError("Olay notu zorunludur.");
      return;
    }
    setEventBusy(true);
    setEventMessage(null);
    setError(null);
    try {
      await api.createServiceTripEvent(selectedTripId, { eventType, note });
      setEventNoteValue("");
      setEventMessage(`${eventLabel(eventType)} kaydı sefer zaman çizelgesine eklendi.`);
      await refreshSelectedTrip(selectedTripId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Olay kaydı oluşturulamadı.");
    } finally {
      setEventBusy(false);
    }
  }

  const selectedLiveDetail = liveDetail?.trip.id === selectedTripId ? liveDetail : null;
  const selectedTrip = selectedLiveDetail?.trip ?? trips.find((trip) => trip.id === selectedTripId) ?? null;
  const selectedLiveStatus = selectedLiveDetail?.liveStatus ?? selectedTrip?.liveStatus;

  return (
    <article className="guidance-data-card">
      <header className="guidance-data-card-head">
        <h2>Canlı sefer takibi</h2>
        <span>{loading ? "Yükleniyor" : detailLoading ? "Detay yenileniyor" : `${trips.length} aktif sefer`}</span>
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
              <div className="service-live-card-actions">
                <p className="service-live-status">{formatLiveStatus(trip)}</p>
                <button className="ghost-action small-action" disabled={selectedTripId === trip.id} onClick={() => setSelectedTripId(trip.id)} type="button">
                  {selectedTripId === trip.id ? "Seçili" : "Detay"}
                </button>
              </div>
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

      {selectedTrip ? (
        <section className="service-live-detail" aria-label="Sefer detayı">
          <div className="service-live-detail-main">
            <div className="service-live-detail-head">
              <div>
                <strong>{selectedTrip.routeName ?? "Servis rotası"}</strong>
                <span>
                  {selectedTrip.driverName ?? "Şoför"} · {directionLabel(selectedTrip.direction)}
                </span>
              </div>
              <button className="ghost-action small-action" disabled={detailLoading} onClick={() => void refreshSelectedTrip()} type="button">
                Yenile
              </button>
            </div>

            <div className="service-live-detail-metrics">
              <span>Başlangıç: {formatDateTime(selectedTrip.startedAt)}</span>
              <span>Son konum: {formatDateTime(selectedLiveStatus?.lastLocationAt)}</span>
              <span>{selectedLiveStatus?.locationStale ? "Konum gecikmiş" : "Konum aktif"}</span>
            </div>

            {timeline.length === 0 ? (
              <p className="guidance-data-empty">Bu sefer için henüz olay veya konum akışı yok.</p>
            ) : (
              <div className="service-live-timeline">
                {timeline.map((item) => (
                  <div className="service-live-timeline-item" key={item.id}>
                    <div>
                      <strong>{timelineTitle(item)}</strong>
                      <p>{timelineBody(item)}</p>
                    </div>
                    <time>{formatDateTime(item.occurredAt)}</time>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form className="service-live-event-form" onSubmit={submitEvent}>
            <div className="service-live-event-form-head">
              <strong>Olay kaydı</strong>
              <span>Not, denetim izi ve zaman çizelgesine eklenir.</span>
            </div>
            <label className="guidance-data-field">
              <span>Olay tipi</span>
              <select value={eventType} onChange={(event) => setEventType(event.target.value as (typeof EVENT_OPTIONS)[number]["value"])}>
                {EVENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="guidance-data-field">
              <span>Not</span>
              <textarea
                rows={4}
                value={eventNoteValue}
                onChange={(event) => setEventNoteValue(event.target.value)}
                placeholder="Örn. Trafik yoğunluğu nedeniyle 10 dakika gecikme var."
              />
            </label>
            {eventMessage ? <p className="form-success">{eventMessage}</p> : null}
            <button className="primary-action" disabled={eventBusy} type="submit">
              {eventBusy ? "Kaydediliyor..." : "Olayı kaydet"}
            </button>
          </form>
        </section>
      ) : null}
    </article>
  );
}
