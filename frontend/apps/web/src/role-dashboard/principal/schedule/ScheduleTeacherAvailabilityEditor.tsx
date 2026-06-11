import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TeacherAvailability } from "../../../lib/api";
import { api } from "../../../lib/api";
import type { PrincipalManagedTeacher } from "../types";
import { availabilitySlotKey, SCHEDULE_TIME_SLOTS, SCHOOL_WEEK_DAYS, weekdayLabel } from "./scheduleConstants";

export function ScheduleTeacherAvailabilityEditor({
  teachers,
  onSaved
}: {
  teachers: PrincipalManagedTeacher[];
  onSaved?: () => void;
}) {
  const [availabilities, setAvailabilities] = useState<TeacherAvailability[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [draftKeys, setDraftKeys] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTeacherId = selectedTeacherId || teachers[0]?.id || "";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await api.listTeacherAvailabilities();
      setAvailabilities(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Müsaitlikler alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of availabilities) {
      if (item.teacherId !== activeTeacherId && item.teacherUserId !== activeTeacherId) continue;
      keys.add(availabilitySlotKey(item.dayOfWeek, item.startTime.slice(0, 5)));
    }
    return keys;
  }, [activeTeacherId, availabilities]);

  const workingKeys = draftKeys ?? selectedKeys;

  const toggleSlot = (day: number, start: string) => {
    const key = availabilitySlotKey(day, start);
    setDraftKeys((current) => {
      const base = current ? new Set(current) : new Set(selectedKeys);
      if (base.has(key)) base.delete(key);
      else base.add(key);
      return base;
    });
    setMessage(null);
  };

  const fillWeekdays = () => {
    const next = new Set<string>();
    for (const day of SCHOOL_WEEK_DAYS) {
      if (day > 5) continue;
      for (const slot of SCHEDULE_TIME_SLOTS) {
        next.add(availabilitySlotKey(day, slot.start));
      }
    }
    setDraftKeys(next);
  };

  const clearDraft = () => setDraftKeys(new Set());

  const save = async () => {
    if (teachers.length === 0) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const items: Array<{
        teacherId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        availabilityType: string;
      }> = [];

      for (const teacher of teachers) {
        const keysForTeacher =
          teacher.id === activeTeacherId
            ? workingKeys
            : new Set(
                availabilities
                  .filter((row) => row.teacherId === teacher.id || row.teacherUserId === teacher.id)
                  .map((row) => availabilitySlotKey(row.dayOfWeek, row.startTime.slice(0, 5)))
              );

        for (const key of keysForTeacher) {
          const [dayText, start] = key.split("-");
          const day = Number(dayText);
          const slot = SCHEDULE_TIME_SLOTS.find((item) => item.start === start);
          if (!slot) continue;
          items.push({
            teacherId: teacher.id,
            dayOfWeek: day,
            startTime: slot.start,
            endTime: slot.end,
            availabilityType: "available"
          });
        }
      }

      await api.saveTeacherAvailabilitiesBulk(items);
      setDraftKeys(null);
      setMessage("Öğretmen müsaitlikleri kaydedildi.");
      await load();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="schedule-inputs-loading">Müsaitlikler yükleniyor…</p>;
  }

  const activeTeacher = teachers.find((item) => item.id === activeTeacherId);

  return (
    <article className="principal-surface-card schedule-inputs-panel">
      <header className="schedule-inputs-panel-head">
        <div>
          <span>Planlama verisi</span>
          <h2>Öğretmen müsaitlik grid'i</h2>
          <p>Öğretmenin hangi gün ve saatlerde derse girebileceğini işaretleyin.</p>
        </div>
        <div className="schedule-inputs-panel-actions">
          <button className="ghost-action small-action" onClick={fillWeekdays} type="button">
            Hafta içi doldur
          </button>
          <button className="ghost-action small-action" onClick={clearDraft} type="button">
            Temizle
          </button>
          <button className="primary-action small-action" disabled={saving || teachers.length === 0} onClick={() => void save()} type="button">
            <Save size={15} />
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </header>

      {message ? <div className="sa-alert sa-alert--success">{message}</div> : null}
      {error ? <div className="form-error sa-alert">{error}</div> : null}

      {teachers.length === 0 ? (
        <p className="empty-text">Müsaitlik girmek için önce öğretmen tanımlayın.</p>
      ) : (
        <>
          <label className="schedule-availability-teacher-select">
            Öğretmen
            <select onChange={(event) => { setSelectedTeacherId(event.target.value); setDraftKeys(null); }} value={activeTeacherId}>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                  {teacher.branch ? ` · ${teacher.branch}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="schedule-availability-grid-wrap">
            <table className="schedule-availability-grid">
              <thead>
                <tr>
                  <th>Gün</th>
                  {SCHEDULE_TIME_SLOTS.map((slot) => (
                    <th key={slot.start}>{slot.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCHOOL_WEEK_DAYS.filter((day) => day <= 5).map((day) => (
                  <tr key={day}>
                    <th>{weekdayLabel(day)}</th>
                    {SCHEDULE_TIME_SLOTS.map((slot) => {
                      const active = workingKeys.has(availabilitySlotKey(day, slot.start));
                      return (
                        <td key={slot.start}>
                          <button
                            aria-label={`${weekdayLabel(day)} ${slot.label}`}
                            className={active ? "schedule-availability-cell is-active" : "schedule-availability-cell"}
                            onClick={() => toggleSlot(day, slot.start)}
                            type="button"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="schedule-availability-foot">
            {activeTeacher ? `${activeTeacher.firstName} ${activeTeacher.lastName} için ${workingKeys.size} slot seçili.` : null}
          </p>
        </>
      )}
    </article>
  );
}
