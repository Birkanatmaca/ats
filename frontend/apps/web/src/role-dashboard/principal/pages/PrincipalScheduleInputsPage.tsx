import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Schedule, ScheduleChangeLog, ScheduleConflictsResult, SchedulingRequirement, SchoolSubjectRecord, TeacherAvailability } from "../../../lib/api";
import { api } from "../../../lib/api";
import { ScheduleChangeLogPanel } from "../schedule/ScheduleChangeLogPanel";
import { ScheduleConflictsPanel } from "../schedule/ScheduleConflictsPanel";
import { ScheduleRequirementsEditor } from "../schedule/ScheduleRequirementsEditor";
import { ScheduleTeacherAvailabilityEditor } from "../schedule/ScheduleTeacherAvailabilityEditor";
import { evaluateScheduleReadiness, scheduleReadinessReady } from "../schedule/scheduleReadiness";
import type { PrincipalManagedTeacher, SchoolClass } from "../types";
import "./PrincipalScheduleInputsPage.css";

type TabId = "requirements" | "availability" | "readiness";

export function PrincipalScheduleInputsPage({
  classes,
  teachers
}: {
  classes: SchoolClass[];
  teachers: PrincipalManagedTeacher[];
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("readiness");
  const [subjects, setSubjects] = useState<SchoolSubjectRecord[]>([]);
  const [requirements, setRequirements] = useState<SchedulingRequirement[]>([]);
  const [availabilities, setAvailabilities] = useState<TeacherAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [scheduleConflicts, setScheduleConflicts] = useState<ScheduleConflictsResult | null>(null);
  const [scheduleChangeLog, setScheduleChangeLog] = useState<ScheduleChangeLog[]>([]);
  const [scheduleOpsLoading, setScheduleOpsLoading] = useState(false);

  const reloadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [subjectItems, requirementItems, availabilityItems] = await Promise.all([
        api.listSubjects(),
        api.listSchedulingRequirements(),
        api.listTeacherAvailabilities()
      ]);
      setSubjects(subjectItems);
      setRequirements(requirementItems);
      setAvailabilities(availabilityItems);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadMeta();
  }, [reloadMeta]);

  useEffect(() => {
    let cancelled = false;
    void api.schedule().then((schedule) => {
      if (!cancelled) {
        setCurrentSchedule(schedule);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentSchedule?.id) {
      setScheduleConflicts(null);
      setScheduleChangeLog([]);
      return;
    }

    let cancelled = false;
    setScheduleOpsLoading(true);
    void Promise.allSettled([api.scheduleConflicts(currentSchedule.id), api.scheduleChangeLog(currentSchedule.id)]).then((results) => {
      if (cancelled) {
        return;
      }
      setScheduleConflicts(results[0].status === "fulfilled" ? results[0].value : null);
      setScheduleChangeLog(results[1].status === "fulfilled" ? results[1].value : []);
      setScheduleOpsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentSchedule?.id]);

  const readiness = useMemo(
    () => evaluateScheduleReadiness({ classes, teachers, requirements, availabilities }),
    [availabilities, classes, requirements, teachers]
  );
  const ready = scheduleReadinessReady(readiness);

  return (
    <section className="principal-page-stack principal-schedule-inputs-page">
      <div className="principal-schedule-inputs-head">
        <Link className="ghost-action principal-schedule-back" to="/dashboard/schedule">
          <ArrowLeft size={15} />
          Programa dön
        </Link>
        <div>
          <span>Program veri girişi</span>
          <h1>Ders programı hazırlık</h1>
          <p>Müsaitlik, saat ihtiyacı ve yayın öncesi eksik veri kontrolü</p>
        </div>
        <button
          className="primary-action small-action"
          disabled={!ready}
          onClick={() => navigate("/dashboard/schedule/builder")}
          type="button"
        >
          Program oluşturucuya git
        </button>
      </div>

      <div className="principal-schedule-inputs-tabs">
        <button className={tab === "readiness" ? "active" : ""} onClick={() => setTab("readiness")} type="button">
          Yayın öncesi kontrol
        </button>
        <button className={tab === "requirements" ? "active" : ""} onClick={() => setTab("requirements")} type="button">
          Ders saat ihtiyacı
        </button>
        <button className={tab === "availability" ? "active" : ""} onClick={() => setTab("availability")} type="button">
          Öğretmen müsaitliği
        </button>
      </div>

      {tab === "readiness" ? (
        <article className="principal-surface-card schedule-inputs-panel">
          <header className="schedule-inputs-panel-head">
            <div>
              <span>Kontrol listesi</span>
              <h2>Yayınlamadan önce eksik veri kontrolü</h2>
              <p>Otomatik program üretimi ve yayın için aşağıdaki maddelerin tamamlanması gerekir.</p>
            </div>
            <ClipboardList size={20} />
          </header>
          {loading ? (
            <p className="schedule-inputs-loading">Kontrol listesi hazırlanıyor…</p>
          ) : (
            <div className="schedule-readiness-list">
              {readiness.map((item) => (
                <div className={item.ok ? "schedule-readiness-item is-ok" : "schedule-readiness-item"} key={item.id}>
                  {item.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <div>
                    <strong>{item.label}</strong>
                    {item.detail ? <span>{item.detail}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!ready ? (
            <p className="schedule-readiness-hint">Eksik maddeleri tamamladıktan sonra program oluşturucuya geçebilirsiniz.</p>
          ) : (
            <p className="schedule-readiness-hint schedule-readiness-hint--ok">Tüm hazırlık maddeleri tamam. Program oluşturucuya geçebilirsiniz.</p>
          )}

          <div className="schedule-ops-grid schedule-inputs-ops-grid">
            <ScheduleConflictsPanel loading={scheduleOpsLoading} result={scheduleConflicts} />
            <ScheduleChangeLogPanel items={scheduleChangeLog} loading={scheduleOpsLoading} />
          </div>
        </article>
      ) : null}

      {tab === "requirements" ? (
        <ScheduleRequirementsEditor classes={classes} onSaved={() => void reloadMeta()} subjects={subjects} />
      ) : null}

      {tab === "availability" ? (
        <ScheduleTeacherAvailabilityEditor onSaved={() => void reloadMeta()} teachers={teachers} />
      ) : null}
    </section>
  );
}
