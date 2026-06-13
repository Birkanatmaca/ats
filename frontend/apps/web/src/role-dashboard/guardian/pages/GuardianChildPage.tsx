import { Bell, Bus, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, Hash, MapPinned, Radio, School, UserRound, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GuidanceKpiCard } from "../../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../../guidance/components/GuidanceMetricGrid";
import { GuidanceSectionPanel } from "../../guidance/components/GuidanceSectionPanel";
import "../../guidance/GuidanceOverview.css";
import "../../guidance/GuidanceSurface.css";
import { api } from "../../../lib/api";
import type { GuardianServiceLive, GuardianServiceSummary, ServiceLiveStatus } from "../../../lib/api";
import { GuardianAttendanceList } from "../components/GuardianAttendanceList";
import { GuardianGuidanceUpdatesList } from "../components/GuardianGuidanceUpdatesList";
import { GuardianLessonList } from "../components/GuardianLessonList";
import { GuardianNoticeList } from "../components/GuardianNoticeList";
import { GuardianBillingCard } from "../components/GuardianBillingCard";
import { GuardianStudentHeroCard } from "../components/GuardianStudentHeroCard";
import type { GuardianChild, GuardianData } from "../types";
import "../GuardianChildPage.css";

function mapNotificationsToNotices(notifications: GuardianData["notifications"]) {
  return notifications.slice(0, 4).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    tone: item.readAt ? ("success" as const) : item.kind === "attendance" ? ("warning" as const) : ("info" as const)
  }));
}

const LIVE_POLL_MS = 12_000;

function staticMapUrl(latitude: number, longitude: number) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=640x260&markers=${latitude},${longitude},red-pushpin`;
}

function directionLabel(value?: string) {
  if (value === "evening") return "Akşam";
  if (value === "both") return "Sabah/Akşam";
  return "Sabah";
}

function formatLiveStatus(status?: ServiceLiveStatus | null) {
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
  if (status.lastLocationAt) {
    parts.push(new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(status.lastLocationAt)));
  }
  return parts.length > 0 ? parts.join(" · ") : "Canlı konum alınıyor";
}

function eventLabel(eventType?: string) {
  if (eventType === "trip_started") return "Servis yola çıktı";
  if (eventType === "trip_completed") return "Servis tamamlandı";
  if (eventType === "approaching_notified") return "Durağa yaklaşıyor";
  return eventType ? "Servis olayı" : "Henüz olay yok";
}

function GuardianServicePanel({ studentId }: { studentId: string }) {
  const [summary, setSummary] = useState<GuardianServiceSummary | null>(null);
  const [live, setLive] = useState<GuardianServiceLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [summaryResult, liveResult] = await Promise.allSettled([
        api.guardianService(studentId),
        api.guardianServiceLive(studentId, 8, 8)
      ]);
      if (cancelled) {
        return;
      }
      setSummary(summaryResult.status === "fulfilled" ? summaryResult.value : null);
      setLive(liveResult.status === "fulfilled" ? liveResult.value : null);
      setError(liveResult.status === "rejected" ? "Canlı servis bilgisi alınamadı." : null);
      setLoading(false);
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, LIVE_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [studentId]);

  const route = summary?.routes?.[0];
  const assignment = summary?.assignments?.[0];
  const liveStatus = live?.liveStatus ?? summary?.liveStatus;
  const mapLat = live?.activeTrip?.lastLocation?.latitude ?? liveStatus?.stopLatitude;
  const mapLng = live?.activeTrip?.lastLocation?.longitude ?? liveStatus?.stopLongitude;
  const latestEvent = live?.events?.[0];

  return (
    <div className="guardian-service-panel">
      <div className="guardian-service-head">
        <div className="guardian-service-icon">
          <Bus size={20} />
        </div>
        <div>
          <strong>{loading ? "Servis bilgisi yükleniyor" : route?.name ?? "Servis ataması bulunmuyor"}</strong>
          <span>
            {route ? `${directionLabel(route.direction)} · ${route.vehiclePlate || "Araç bekleniyor"}` : "Aktif rota atanmadı"}
          </span>
        </div>
        <span className={live?.active ? "guardian-service-live is-active" : "guardian-service-live"}>
          <Radio size={14} />
          {live?.active ? "Canlı" : "Pasif"}
        </span>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <p className="guardian-service-status">{formatLiveStatus(liveStatus)}</p>

      {typeof mapLat === "number" && typeof mapLng === "number" ? (
        <a className="guardian-service-map-link" href={`https://www.google.com/maps/search/?api=1&query=${mapLat},${mapLng}`} rel="noreferrer" target="_blank">
          <img alt="Servis canlı harita" className="guardian-service-map" src={staticMapUrl(mapLat, mapLng)} />
        </a>
      ) : (
        <div className="guardian-service-map-placeholder">
          <MapPinned size={18} />
          <span>Canlı konum henüz paylaşılmadı.</span>
        </div>
      )}

      <div className="guardian-service-meta-grid">
        <div>
          <span>Durak</span>
          <strong>{assignment?.stopName ?? "Seçilmedi"}</strong>
        </div>
        <div>
          <span>Planlanan saat</span>
          <strong>{route?.stops?.find((stop) => stop.id === assignment?.stopId)?.plannedTime ?? "—"}</strong>
        </div>
        <div>
          <span>Şoför</span>
          <strong>{route?.driverName ?? "Atanmadı"}</strong>
        </div>
        <div>
          <span>Son olay</span>
          <strong>{eventLabel(latestEvent?.eventType)}</strong>
        </div>
      </div>
    </div>
  );
}

export function GuardianChildPage({
  child,
  students,
  selectedChildId,
  onSelectChild,
  data,
  lessons
}: {
  child: GuardianChild;
  students: GuardianChild[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  data: GuardianData;
  lessons: GuardianData["scheduleLessons"];
}) {
  const stats = useMemo(() => {
    const presentCount = data.attendanceRecords.filter((record) => record.status === "present").length;
    const absentCount = data.attendanceRecords.filter((record) => record.status === "absent").length;
    const lateCount = data.attendanceRecords.filter((record) => record.status === "late").length;
    const excusedCount = data.attendanceRecords.filter((record) => record.status === "excused").length;
    const totalRecords = data.attendanceRecords.length;
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    const unreadNotifications = data.notifications.filter((item) => !item.readAt).length;
    const uniqueSubjects = new Set(lessons.map((lesson) => lesson.subjectName)).size;

    return {
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      totalRecords,
      attendanceRate,
      unreadNotifications,
      uniqueSubjects
    };
  }, [data.attendanceRecords, data.notifications, lessons]);

  return (
    <section className="guidance-page-stack guidance-overview-page guidance-surface-page guardian-child-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard
          icon={<CheckCircle2 size={20} />}
          label="Katılım oranı"
          value={`%${stats.attendanceRate}`}
          detail={`${stats.presentCount} geldi kaydı`}
          tone="emerald"
        />
        <GuidanceKpiCard
          icon={<XCircle size={20} />}
          label="Devamsızlık"
          value={stats.absentCount}
          detail={`${stats.lateCount} geç · ${stats.excusedCount} izinli`}
          tone="amber"
        />
        <GuidanceKpiCard
          icon={<CalendarDays size={20} />}
          label="Haftalık ders"
          value={lessons.length}
          detail={`${stats.uniqueSubjects} farklı ders`}
          tone="sky"
        />
        <GuidanceKpiCard
          icon={<Bell size={20} />}
          label="Bildirim"
          value={stats.unreadNotifications}
          detail={`${data.notifications.length} toplam kayıt`}
          tone="violet"
        />
      </GuidanceMetricGrid>

      <GuardianStudentHeroCard
        child={child}
        students={students}
        selectedChildId={selectedChildId}
        onSelect={onSelectChild}
      />

      <div className="guardian-child-detail-grid">
        <GuidanceSectionPanel title="Yoklama dağılımı">
          <div className="guardian-stat-breakdown">
            <div className="guardian-stat-breakdown-bar" aria-hidden>
              <span className="is-present" style={{ width: stats.totalRecords ? `${(stats.presentCount / stats.totalRecords) * 100}%` : "0%" }} />
              <span className="is-late" style={{ width: stats.totalRecords ? `${(stats.lateCount / stats.totalRecords) * 100}%` : "0%" }} />
              <span className="is-absent" style={{ width: stats.totalRecords ? `${(stats.absentCount / stats.totalRecords) * 100}%` : "0%" }} />
              <span className="is-excused" style={{ width: stats.totalRecords ? `${(stats.excusedCount / stats.totalRecords) * 100}%` : "0%" }} />
            </div>
            <div className="guardian-stat-breakdown-grid">
              <div className="guardian-stat-item">
                <CheckCircle2 size={16} />
                <span>Geldi</span>
                <strong>{stats.presentCount}</strong>
              </div>
              <div className="guardian-stat-item">
                <Clock3 size={16} />
                <span>Geç</span>
                <strong>{stats.lateCount}</strong>
              </div>
              <div className="guardian-stat-item">
                <XCircle size={16} />
                <span>Gelmedi</span>
                <strong>{stats.absentCount}</strong>
              </div>
              <div className="guardian-stat-item">
                <ClipboardCheck size={16} />
                <span>İzinli</span>
                <strong>{stats.excusedCount}</strong>
              </div>
            </div>
          </div>
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Kayıt bilgileri">
          <div className="guardian-info-grid">
            <div className="guardian-info-item">
              <UserRound size={16} />
              <span>Ad soyad</span>
              <strong>{child.fullName}</strong>
            </div>
            <div className="guardian-info-item">
              <School size={16} />
              <span>Sınıf</span>
              <strong>{child.className}</strong>
            </div>
            <div className="guardian-info-item">
              <Hash size={16} />
              <span>Okul numarası</span>
              <strong>{child.schoolNumber}</strong>
            </div>
            <div className="guardian-info-item">
              <School size={16} />
              <span>Kurum</span>
              <strong>{child.tenantName}</strong>
            </div>
          </div>
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Servis">
          <GuardianServicePanel studentId={child.id} />
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Ders programı">
          <GuardianLessonList lessons={lessons} limit={4} />
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Son bildirimler">
          {data.notifications.length === 0 ? (
            <p className="guidance-empty-pad">Henüz bildirim yok.</p>
          ) : (
            <GuardianNoticeList notices={mapNotificationsToNotices(data.notifications)} />
          )}
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Rehberlik paylaşımları">
          <GuardianGuidanceUpdatesList items={data.guidanceUpdates} />
        </GuidanceSectionPanel>

        <GuidanceSectionPanel title="Tahsilat">
          <GuardianBillingCard studentId={child.id} />
        </GuidanceSectionPanel>
      </div>

      <GuidanceSectionPanel title="Yoklama geçmişi">
        <GuardianAttendanceList records={data.attendanceRecords} limit={6} />
      </GuidanceSectionPanel>
    </section>
  );
}
