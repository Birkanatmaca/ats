import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SchedulingRequirement, SchoolSubjectRecord } from "../../../lib/api";
import { api } from "../../../lib/api";
import type { SchoolClass } from "../types";

type RequirementDraft = {
  classId: string;
  subjectId: string;
  weeklyHours: number;
};

export function ScheduleRequirementsEditor({
  classes,
  subjects,
  onSaved
}: {
  classes: SchoolClass[];
  subjects: SchoolSubjectRecord[];
  onSaved?: () => void;
}) {
  const [requirements, setRequirements] = useState<SchedulingRequirement[]>([]);
  const [draft, setDraft] = useState<RequirementDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await api.listSchedulingRequirements();
      setRequirements(items);
      setDraft(
        items.map((item) => ({
          classId: item.classId,
          subjectId: item.subjectId,
          weeklyHours: item.weeklyHours
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "İhtiyaçlar alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, { className: string; rows: Array<RequirementDraft & { subjectName: string }> }>();
    for (const row of draft) {
      const className = classes.find((item) => item.id === row.classId)?.name ?? requirements.find((item) => item.classId === row.classId)?.className ?? row.classId;
      const subjectName = subjects.find((item) => item.id === row.subjectId)?.name ?? requirements.find((item) => item.subjectId === row.subjectId)?.subjectName ?? row.subjectId;
      const bucket = map.get(row.classId) ?? { className, rows: [] };
      bucket.rows.push({ ...row, subjectName });
      map.set(row.classId, bucket);
    }
    return [...map.values()].sort((a, b) => a.className.localeCompare(b.className, "tr"));
  }, [classes, draft, requirements, subjects]);

  const updateHours = (classId: string, subjectId: string, weeklyHours: number) => {
    setDraft((current) =>
      current.map((row) => (row.classId === classId && row.subjectId === subjectId ? { ...row, weeklyHours } : row))
    );
  };

  const removeRow = (classId: string, subjectId: string) => {
    setDraft((current) => current.filter((row) => !(row.classId === classId && row.subjectId === subjectId)));
  };

  const addRow = () => {
    const classId = classes[0]?.id ?? "";
    const subjectId = subjects[0]?.id ?? "";
    if (!classId || !subjectId) return;
    if (draft.some((row) => row.classId === classId && row.subjectId === subjectId)) return;
    setDraft((current) => [...current, { classId, subjectId, weeklyHours: 2 }]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = draft.filter((row) => row.weeklyHours > 0);
      await api.saveSchedulingRequirements(payload);
      setMessage("Ders saat ihtiyaçları kaydedildi.");
      await load();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="schedule-inputs-loading">Ders ihtiyaçları yükleniyor…</p>;
  }

  return (
    <article className="principal-surface-card schedule-inputs-panel">
      <header className="schedule-inputs-panel-head">
        <div>
          <span>Planlama verisi</span>
          <h2>Haftalık ders saat ihtiyacı</h2>
          <p>Her sınıf ve ders için haftalık saatleri tanımlayın. Otomatik program motoru bu kurallara göre yerleştirir.</p>
        </div>
        <div className="schedule-inputs-panel-actions">
          <button className="ghost-action small-action" onClick={addRow} type="button">
            <Plus size={15} />
            Kural ekle
          </button>
          <button className="primary-action small-action" disabled={saving} onClick={() => void save()} type="button">
            <Save size={15} />
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </header>

      {message ? <div className="sa-alert sa-alert--success">{message}</div> : null}
      {error ? <div className="form-error sa-alert">{error}</div> : null}

      {grouped.length === 0 ? (
        <p className="empty-text">Henüz ders ihtiyacı yok. Kural ekleyerek başlayın veya önce ders/sınıf tanımlayın.</p>
      ) : (
        <div className="schedule-requirements-groups">
          {grouped.map((group) => {
            const total = group.rows.reduce((sum, row) => sum + row.weeklyHours, 0);
            return (
              <section className="schedule-requirements-group" key={group.className}>
                <header>
                  <strong>{group.className}</strong>
                  <span>{total} saat/hafta</span>
                </header>
                <div className="schedule-requirements-rows">
                  {group.rows
                    .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "tr"))
                    .map((row) => (
                      <div className="schedule-requirements-row" key={`${row.classId}-${row.subjectId}`}>
                        <span>{row.subjectName}</span>
                        <input
                          max={12}
                          min={0}
                          onChange={(event) => updateHours(row.classId, row.subjectId, Number(event.target.value))}
                          type="number"
                          value={row.weeklyHours}
                        />
                        <button
                          aria-label="Kuralı kaldır"
                          className="ghost-action icon-action"
                          onClick={() => removeRow(row.classId, row.subjectId)}
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
}
