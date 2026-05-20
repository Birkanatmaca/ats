import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UsersRound,
  Wand2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Lesson } from "../../../lib/api";
import { api } from "../../../lib/api";
import { createClientId } from "../../../lib/id";
import type { ClassSection, ClassStudent, PrincipalConsoleData, PrincipalManagedTeacher, SchoolClass } from "../types";
import "./PrincipalSchedulePage.css";

type DayId = 1 | 2 | 3 | 4 | 5 | 6;
type SubjectPriority = "morning" | "balanced";
type LoadStatus = "exact" | "under" | "over";
type SchedulePageMode = "overview" | "builder";

type ScheduleSettings = {
  activeDayIds: DayId[];
  startTime: string;
  lessonMinutes: number;
  breakMinutes: number;
  lunchAfterLesson: number;
  lunchMinutes: number;
  lessonsPerDay: number;
};

type SubjectPlan = {
  id: string;
  subjectName: string;
  teacherId: string;
  hoursPerSection: number;
  priority: SubjectPriority;
};

type SectionOption = {
  id: string;
  classId: string;
  className: string;
  sectionName: string;
  label: string;
};

type TimeSlot = {
  slotIndex: number;
  label: string;
  startTime: string;
  endTime: string;
};

type GeneratedLesson = {
  id: string;
  subjectPlanId: string;
  dayId: DayId;
  slotIndex: number;
  startTime: string;
  endTime: string;
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  room: string;
};

type GeneratedScheduleDraft = {
  id: string;
  generatedAt: string;
  score: number;
  hardConflicts: number;
  softWarnings: string[];
  unplaced: string[];
  settings: ScheduleSettings;
  subjects: SubjectPlan[];
  lessons: GeneratedLesson[];
};

type SavedSchedule = GeneratedScheduleDraft & {
  name: string;
  status: "active" | "passive";
  savedAt: string;
  activatedAt?: string;
};

type ScheduleStorage = {
  settings: ScheduleSettings;
  subjectPlans: SubjectPlan[];
  draft: GeneratedScheduleDraft | null;
  savedSchedules: SavedSchedule[];
  activeScheduleId: string | null;
};

const DAY_OPTIONS: Array<{ id: DayId; short: string; name: string }> = [
  { id: 1, short: "Pzt", name: "Pazartesi" },
  { id: 2, short: "Sal", name: "Salı" },
  { id: 3, short: "Çar", name: "Çarşamba" },
  { id: 4, short: "Per", name: "Perşembe" },
  { id: 5, short: "Cum", name: "Cuma" },
  { id: 6, short: "Cmt", name: "Cumartesi" }
];

const DEFAULT_SETTINGS: ScheduleSettings = {
  activeDayIds: [1, 2, 3, 4, 5],
  startTime: "09:00",
  lessonMinutes: 40,
  breakMinutes: 10,
  lunchAfterLesson: 4,
  lunchMinutes: 45,
  lessonsPerDay: 7
};

export function PrincipalSchedulePage({
  mode = "overview",
  data,
  classes,
  sections,
  students,
  teachers,
  storageKey,
  onScheduleChange
}: {
  mode?: SchedulePageMode;
  data: PrincipalConsoleData;
  classes: SchoolClass[];
  sections: ClassSection[];
  students: ClassStudent[];
  teachers: PrincipalManagedTeacher[];
  storageKey: string;
  onScheduleChange?: () => void;
}) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ScheduleSettings>(DEFAULT_SETTINGS);
  const [subjectPlans, setSubjectPlans] = useState<SubjectPlan[]>([]);
  const [draft, setDraft] = useState<GeneratedScheduleDraft | null>(null);
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [previewSectionId, setPreviewSectionId] = useState("");
  const [scheduleName, setScheduleName] = useState("");
  const [builderMessage, setBuilderMessage] = useState<string | null>(null);
  const [apiGenerating, setApiGenerating] = useState(false);
  const [apiPublishing, setApiPublishing] = useState(false);

  const classNameById = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);
  const teacherById = useMemo(() => new Map(teachers.map((item) => [item.id, item])), [teachers]);
  const sectionOptions = useMemo<SectionOption[]>(
    () =>
      sections
        .map((section) => {
          const className = classNameById.get(section.classId) ?? "Sınıf";
          return {
            id: section.id,
            classId: section.classId,
            className,
            sectionName: section.name,
            label: `${className} / ${section.name}`
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label, "tr", { numeric: true })),
    [classNameById, sections]
  );

  const studentsBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students) {
      if (!student.sectionId) {
        continue;
      }
      map.set(student.sectionId, (map.get(student.sectionId) ?? 0) + 1);
    }
    return map;
  }, [students]);

  const activeSubjectPlans = useMemo(
    () =>
      subjectPlans.filter((plan) => {
        const teacher = teacherById.get(plan.teacherId);
        return Boolean(plan.subjectName.trim() && teacher && plan.hoursPerSection > 0);
      }),
    [subjectPlans, teacherById]
  );

  const publishedApiSchedule = data.schedule?.status === "published" ? data.schedule : null;
  const activeSchedule = useMemo(
    () =>
      savedSchedules.find((schedule) => schedule.id === activeScheduleId && schedule.status === "active") ??
      savedSchedules.find((schedule) => schedule.status === "active") ??
      null,
    [activeScheduleId, savedSchedules]
  );
  const displayedSchedule = activeSchedule ?? draft ?? (publishedApiSchedule ? mapApiScheduleToDraft(publishedApiSchedule, settings, activeSubjectPlans, sectionOptions, teachers) : null);
  const displayedSettings = displayedSchedule?.settings ?? settings;
  const displayedSubjects = displayedSchedule?.subjects ?? activeSubjectPlans;
  const displayedSlots = useMemo(() => buildTimeSlots(displayedSettings), [displayedSettings]);
  const builderSlots = useMemo(() => buildTimeSlots(settings), [settings]);
  const selectedSection = sectionOptions.find((item) => item.id === selectedSectionId) ?? sectionOptions[0] ?? null;
  const previewSection = sectionOptions.find((item) => item.id === previewSectionId) ?? sectionOptions[0] ?? null;

  const displayedLessonBySlot = useMemo(
    () => lessonMapForSection(displayedSchedule?.lessons ?? [], selectedSection?.id ?? ""),
    [displayedSchedule, selectedSection]
  );
  const previewLessonBySlot = useMemo(
    () => lessonMapForSection(draft?.lessons ?? [], previewSection?.id ?? ""),
    [draft, previewSection]
  );

  const displayTeacherLoadRows = useMemo(
    () => buildTeacherLoadRows(teachers, displayedSubjects, displayedSchedule, sectionOptions.length),
    [displayedSchedule, displayedSubjects, sectionOptions.length, teachers]
  );
  const builderTeacherLoadRows = useMemo(
    () => buildTeacherLoadRows(teachers, activeSubjectPlans, draft, sectionOptions.length),
    [activeSubjectPlans, draft, sectionOptions.length, teachers]
  );
  const builderWarnings = useMemo(
    () => validateBuilder(settings, activeSubjectPlans, sectionOptions, teachers, builderTeacherLoadRows),
    [activeSubjectPlans, builderTeacherLoadRows, sectionOptions, settings, teachers]
  );

  const displayedWeeklyCapacity = displayedSettings.activeDayIds.length * displayedSettings.lessonsPerDay * sectionOptions.length;
  const displayedRequestedLessons = displayedSubjects.reduce((acc, plan) => acc + plan.hoursPerSection * sectionOptions.length, 0);
  const displayedPlacedLessons = displayedSchedule?.lessons.length ?? 0;
  const displayedRiskyTeachers = displayTeacherLoadRows.filter((row) => row.status === "over").length;
  const displayedExactTeachers = displayTeacherLoadRows.filter((row) => row.status === "exact").length;
  const warningList = [
    ...displayTeacherLoadRows
      .filter((row) => row.status === "over")
      .map((row) => `${teacherFullName(row.teacher)} kapasitesi aşılıyor: ${row.planned}/${row.capacity} saat.`),
    ...(displayedSchedule?.unplaced ?? []),
    ...(displayedSchedule?.softWarnings ?? [])
  ];

  useEffect(() => {
    const parsed = parseScheduleStorage(window.localStorage.getItem(storageKey));
    setSettings(parsed.settings);
    setSubjectPlans(parsed.subjectPlans);
    setDraft(parsed.draft);
    setSavedSchedules(parsed.savedSchedules);
    setActiveScheduleId(parsed.activeScheduleId);
    setScheduleName(defaultScheduleName());
  }, [storageKey]);

  useEffect(() => {
    if (subjectPlans.length === 0 && teachers.length > 0) {
      setSubjectPlans(buildDefaultSubjectPlans(teachers, Math.max(sectionOptions.length, 1)));
    }
  }, [sectionOptions.length, subjectPlans.length, teachers]);

  useEffect(() => {
    if (sectionOptions.length === 0) {
      setSelectedSectionId("");
      setPreviewSectionId("");
      return;
    }
    if (!selectedSectionId || !sectionOptions.some((item) => item.id === selectedSectionId)) {
      setSelectedSectionId(sectionOptions[0].id);
    }
    if (!previewSectionId || !sectionOptions.some((item) => item.id === previewSectionId)) {
      setPreviewSectionId(sectionOptions[0].id);
    }
  }, [previewSectionId, sectionOptions, selectedSectionId]);

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        settings,
        subjectPlans,
        draft,
        savedSchedules,
        activeScheduleId
      } satisfies ScheduleStorage)
    );
  }, [activeScheduleId, draft, savedSchedules, settings, storageKey, subjectPlans]);

  function updateSettings(patch: Partial<ScheduleSettings>) {
    setSettings((current) => sanitizeSettings({ ...current, ...patch }));
  }

  function toggleDay(dayId: DayId) {
    setSettings((current) => {
      const nextDays = current.activeDayIds.includes(dayId)
        ? current.activeDayIds.filter((item) => item !== dayId)
        : [...current.activeDayIds, dayId].sort((a, b) => a - b);
      return sanitizeSettings({ ...current, activeDayIds: nextDays as DayId[] });
    });
  }

  function addSubjectPlan() {
    const teacher = teachers.find((item) => Number(item.weeklyLessonHours) > 0) ?? teachers[0];
    setSubjectPlans((current) => [
      ...current,
      {
        id: createClientId("subject"),
        subjectName: teacher?.branch.trim() || "Yeni ders",
        teacherId: teacher?.id ?? "",
        hoursPerSection: 2,
        priority: "balanced"
      }
    ]);
  }

  function updateSubjectPlan(id: string, patch: Partial<SubjectPlan>) {
    setSubjectPlans((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeSubjectPlan(id: string) {
    setSubjectPlans((current) => current.filter((item) => item.id !== id));
  }

  async function generateDraft() {
    setApiGenerating(true);
    setBuilderMessage(null);
    try {
      const result = await api.generateSchedule();
      const mapped = mapApiScheduleToDraft(result.schedule, settings, activeSubjectPlans, sectionOptions, teachers);
      setDraft({
        ...mapped,
        hardConflicts: result.hardConflicts,
        softWarnings: result.softWarnings,
        score: result.schedule.score
      });
      const warningText =
        result.softWarnings.length > 0 ? ` ${result.softWarnings.length} uyarı var.` : "";
      setBuilderMessage(
        result.hardConflicts > 0
          ? `Program üretildi; ${result.hardConflicts} sert çakışma.${warningText}`
          : `Program önizlemesi oluşturuldu.${warningText}`
      );
    } catch (generateError) {
      const local = generateScheduleDraft({
        settings,
        subjectPlans: activeSubjectPlans,
        sections: sectionOptions,
        teachers
      });
      setDraft(local);
      setBuilderMessage(
        generateError instanceof Error
          ? `${generateError.message} (yerel önizleme kullanıldı)`
          : "API üretimi başarısız; yerel önizleme kullanıldı."
      );
    } finally {
      setApiGenerating(false);
    }
  }

  function resetBuilder() {
    setSettings(DEFAULT_SETTINGS);
    setSubjectPlans(buildDefaultSubjectPlans(teachers, Math.max(sectionOptions.length, 1)));
    setDraft(null);
    setBuilderMessage(null);
  }

  async function saveDraftAsActive() {
    if (!draft || draft.lessons.length === 0) {
      setBuilderMessage("Kaydetmek için önce otomatik program önizlemesi oluşturun.");
      return;
    }
    setApiPublishing(true);
    setBuilderMessage(null);
    try {
      await api.publishSchedule(draft.id);
      onScheduleChange?.();
      setDraft(null);
      setBuilderMessage("Program yayınlandı.");
      navigate("/dashboard/schedule");
    } catch (publishError) {
      const saved: SavedSchedule = {
        ...draft,
        id: draft.id || createClientId("saved-schedule"),
        name: scheduleName.trim() || defaultScheduleName(),
        status: "active",
        savedAt: new Date().toISOString(),
        activatedAt: new Date().toISOString()
      };
      setSavedSchedules((current) => [saved, ...current.map((item) => ({ ...item, status: "passive" as const }))]);
      setActiveScheduleId(saved.id);
      setDraft(null);
      setBuilderMessage(
        publishError instanceof Error
          ? `${publishError.message} (yerel taslak aktif edildi)`
          : "Yayın başarısız; yerel taslak aktif edildi."
      );
      navigate("/dashboard/schedule");
    } finally {
      setApiPublishing(false);
    }
  }

  function setScheduleActive(scheduleId: string) {
    setSavedSchedules((current) =>
      current.map((item) =>
        item.id === scheduleId
          ? { ...item, status: "active", activatedAt: new Date().toISOString() }
          : { ...item, status: "passive" as const }
      )
    );
    setActiveScheduleId(scheduleId);
  }

  function setSchedulePassive(scheduleId: string) {
    setSavedSchedules((current) => current.map((item) => (item.id === scheduleId ? { ...item, status: "passive" as const } : item)));
    if (activeScheduleId === scheduleId) {
      setActiveScheduleId(null);
    }
  }

  function deleteSavedSchedule(scheduleId: string) {
    setSavedSchedules((current) => current.filter((item) => item.id !== scheduleId));
    if (activeScheduleId === scheduleId) {
      setActiveScheduleId(null);
    }
  }

  function updatePreviewCell(section: SectionOption, dayId: DayId, slot: TimeSlot, subjectPlanId: string) {
    if (!draft) {
      return;
    }
    const existing = draft.lessons.find((lesson) => lesson.sectionId === section.id && lesson.dayId === dayId && lesson.slotIndex === slot.slotIndex);
    if (!subjectPlanId) {
      setDraft(recalculateDraft({ ...draft, lessons: draft.lessons.filter((lesson) => lesson.id !== existing?.id) }));
      return;
    }
    const plan = activeSubjectPlans.find((item) => item.id === subjectPlanId);
    const teacher = plan ? teacherById.get(plan.teacherId) : undefined;
    if (!plan || !teacher) {
      return;
    }
    const nextLesson = buildManualLesson(section, dayId, slot, plan, teacher, existing);
    if (hasTeacherSlotConflict(draft.lessons, nextLesson, existing?.id)) {
      setBuilderMessage(`${nextLesson.teacherName} aynı saat içinde başka bir şubede görünüyor. Bu değişiklik uygulanmadı.`);
      return;
    }
    const nextLessons = existing ? draft.lessons.map((lesson) => (lesson.id === existing.id ? nextLesson : lesson)) : [...draft.lessons, nextLesson];
    setDraft(recalculateDraft({ ...draft, lessons: nextLessons }));
  }

  function updatePreviewTeacher(lessonId: string, teacherId: string) {
    if (!draft) {
      return;
    }
    const teacher = teacherById.get(teacherId);
    if (!teacher) {
      return;
    }
    const target = draft.lessons.find((lesson) => lesson.id === lessonId);
    if (!target) {
      return;
    }
    const nextLesson = { ...target, teacherId: teacher.id, teacherName: teacherFullName(teacher) };
    if (hasTeacherSlotConflict(draft.lessons, nextLesson, lessonId)) {
      setBuilderMessage(`${nextLesson.teacherName} aynı gün ve saatte başka bir derste. Öğretmen değişikliği uygulanmadı.`);
      return;
    }
    setDraft(recalculateDraft({ ...draft, lessons: draft.lessons.map((lesson) => (lesson.id === lessonId ? nextLesson : lesson)) }));
  }

  if (mode === "builder") {
    return (
      <section className="principal-page-stack principal-schedule-page principal-schedule-page--builder">
        <div className="principal-schedule-builder-head">
          <button className="ghost-action principal-schedule-back" type="button" onClick={() => navigate("/dashboard/schedule")}>
            <ArrowLeft size={15} />
          </button>
          <div>
            <span>Ders programı yenileme</span>
            <h1>Otomatik program oluşturucu</h1>
          </div>
          <button
            className="primary-action principal-schedule-save"
            type="button"
            onClick={() => void saveDraftAsActive()}
            disabled={!draft || draft.lessons.length === 0 || apiPublishing}
          >
            <Save size={16} />
            {apiPublishing ? "Yayınlanıyor…" : "Yayınla"}
          </button>
        </div>

        <div className="principal-schedule-builder-layout">
          <article className="principal-surface-card principal-schedule-panel principal-schedule-builder-settings">
            <div className="principal-schedule-card-head">
              <div>
                <span>Zaman kurgusu</span>
                <h2>Ders saatleri ve molalar</h2>
              </div>
              <Clock3 size={18} />
            </div>

            <div className="principal-schedule-days" aria-label="Çalışma günleri">
              {DAY_OPTIONS.map((day) => (
                <label className={settings.activeDayIds.includes(day.id) ? "principal-schedule-day is-active" : "principal-schedule-day"} key={day.id}>
                  <input type="checkbox" checked={settings.activeDayIds.includes(day.id)} onChange={() => toggleDay(day.id)} />
                  {day.short}
                </label>
              ))}
            </div>

            <div className="principal-schedule-settings-grid">
              <label className="principal-field">
                <span>Ders başlangıcı</span>
                <input type="time" value={settings.startTime} onChange={(event) => updateSettings({ startTime: event.target.value })} />
              </label>
              <label className="principal-field">
                <span>Ders süresi</span>
                <input type="number" min={30} max={60} value={settings.lessonMinutes} onChange={(event) => updateSettings({ lessonMinutes: Number(event.target.value) })} />
              </label>
              <label className="principal-field">
                <span>Teneffüs</span>
                <input type="number" min={5} max={25} value={settings.breakMinutes} onChange={(event) => updateSettings({ breakMinutes: Number(event.target.value) })} />
              </label>
              <label className="principal-field">
                <span>Günlük ders</span>
                <input type="number" min={4} max={10} value={settings.lessonsPerDay} onChange={(event) => updateSettings({ lessonsPerDay: Number(event.target.value) })} />
              </label>
              <label className="principal-field">
                <span>Öğle arası sonrası</span>
                <input type="number" min={1} max={settings.lessonsPerDay} value={settings.lunchAfterLesson} onChange={(event) => updateSettings({ lunchAfterLesson: Number(event.target.value) })} />
              </label>
              <label className="principal-field">
                <span>Öğle arası</span>
                <input type="number" min={20} max={90} value={settings.lunchMinutes} onChange={(event) => updateSettings({ lunchMinutes: Number(event.target.value) })} />
              </label>
            </div>

            <div className="principal-schedule-name-row">
              <label className="principal-field">
                <span>Program adı</span>
                <input value={scheduleName} onChange={(event) => setScheduleName(event.target.value)} />
              </label>
              <button className="ghost-action principal-schedule-reset" type="button" onClick={resetBuilder}>
                <RefreshCw size={15} />
                Sıfırla
              </button>
            </div>
          </article>

          <article className="principal-surface-card principal-schedule-panel principal-schedule-builder-control">
            <div className="principal-schedule-card-head">
              <div>
                <span>Hazırlık</span>
                <h2>Kontrol ve üretim</h2>
              </div>
              <CheckCircle2 size={18} />
            </div>
            <div className="principal-schedule-readiness">
              <ReadinessItem ok={sectionOptions.length > 0} label={`${sectionOptions.length} şube tanımlı`} />
              <ReadinessItem ok={teachers.length > 0} label={`${teachers.length} öğretmen tanımlı`} />
              <ReadinessItem ok={activeSubjectPlans.length > 0} label={`${activeSubjectPlans.length} ders yükü hazır`} />
              <ReadinessItem ok={builderWarnings.every((warning) => !warning.includes("kapasitesi aşılıyor"))} label="Öğretmen kapasite kontrolü" />
            </div>
            <button
              className="primary-action principal-schedule-generate"
              type="button"
              onClick={() => void generateDraft()}
              disabled={sectionOptions.length === 0 || activeSubjectPlans.length === 0 || apiGenerating}
            >
              <Wand2 size={16} />
              {apiGenerating ? "Üretiliyor…" : "Otomatik program oluştur"}
            </button>
            {builderMessage ? <p className="principal-schedule-builder-message">{builderMessage}</p> : null}
          </article>
        </div>

        <article className="principal-surface-card principal-schedule-panel principal-schedule-loads">
          <div className="principal-schedule-load-head">
            <div className="principal-schedule-card-head">
              <div>
                <span>Ders yükleri</span>
                <h2>Öğretmen, ders sayısı ve haftalık saat</h2>
              </div>
              <Sparkles size={18} />
            </div>
            <button className="ghost-action principal-schedule-add" type="button" onClick={addSubjectPlan} disabled={teachers.length === 0}>
              <Plus size={15} />
              Ders ekle
            </button>
          </div>

          {subjectPlans.length === 0 ? (
            <p className="empty-text">Ders yükü oluşturmak için önce öğretmen ekleyin.</p>
          ) : (
            <div className="principal-table-wrap principal-schedule-load-table-wrap">
              <table className="principal-table principal-schedule-load-table">
                <thead>
                  <tr>
                    <th>Ders</th>
                    <th>Öğretmen</th>
                    <th>Saat / şube</th>
                    <th>Öncelik</th>
                    <th>Toplam yük</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {subjectPlans.map((plan) => {
                    const teacher = teacherById.get(plan.teacherId);
                    return (
                      <tr key={plan.id}>
                        <td>
                          <input className="principal-schedule-cell-input" value={plan.subjectName} onChange={(event) => updateSubjectPlan(plan.id, { subjectName: event.target.value })} />
                        </td>
                        <td>
                          <select
                            className="principal-schedule-cell-input"
                            value={plan.teacherId}
                            onChange={(event) => {
                              const nextTeacher = teacherById.get(event.target.value);
                              updateSubjectPlan(plan.id, {
                                teacherId: event.target.value,
                                subjectName: plan.subjectName.trim() ? plan.subjectName : nextTeacher?.branch.trim() || "Ders"
                              });
                            }}
                          >
                            <option value="">Öğretmen seç</option>
                            {teachers.map((item) => (
                              <option key={item.id} value={item.id}>
                                {teacherFullName(item)}{item.branch ? ` - ${item.branch}` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input className="principal-schedule-cell-input principal-schedule-hour-input" type="number" min={1} max={10} value={plan.hoursPerSection} onChange={(event) => updateSubjectPlan(plan.id, { hoursPerSection: Number(event.target.value) })} />
                        </td>
                        <td>
                          <select className="principal-schedule-cell-input" value={plan.priority} onChange={(event) => updateSubjectPlan(plan.id, { priority: event.target.value as SubjectPriority })}>
                            <option value="balanced">Dengeli</option>
                            <option value="morning">Sabah öncelikli</option>
                          </select>
                        </td>
                        <td>
                          <span className="principal-schedule-load-pill">
                            {plan.hoursPerSection * sectionOptions.length} / {Number(teacher?.weeklyLessonHours) || 0} saat
                          </span>
                        </td>
                        <td>
                          <button className="ghost-action danger principal-schedule-icon-action" type="button" onClick={() => removeSubjectPlan(plan.id)} aria-label="Dersi kaldır">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <div className="principal-schedule-builder-bottom">
          <article className="principal-surface-card principal-schedule-panel principal-schedule-preview-card">
            <div className="principal-schedule-board-head">
              <div className="principal-schedule-card-head">
                <div>
                  <span>Önizleme ve manuel düzenleme</span>
                  <h2>Program önizlemesi</h2>
                </div>
                <CalendarDays size={18} />
              </div>
              <select value={previewSection?.id ?? ""} onChange={(event) => setPreviewSectionId(event.target.value)} disabled={sectionOptions.length === 0}>
                {sectionOptions.length === 0 ? <option value="">Şube yok</option> : null}
                {sectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>

            {!draft ? (
              <p className="empty-text">Önizleme için otomatik program oluşturun.</p>
            ) : (
              <ScheduleBoard
                editable
                settings={settings}
                slots={builderSlots}
                lessonsBySlot={previewLessonBySlot}
                section={previewSection}
                subjectPlans={activeSubjectPlans}
                teachers={teachers}
                onSubjectChange={updatePreviewCell}
                onTeacherChange={updatePreviewTeacher}
              />
            )}
          </article>

          <article className="principal-surface-card principal-schedule-panel principal-schedule-builder-warnings">
            <div className="principal-schedule-card-head">
              <div>
                <span>Kapasite</span>
                <h2>Uyarılar</h2>
              </div>
              <AlertTriangle size={18} />
            </div>
            <WarningList warnings={[...builderWarnings, ...(draft?.unplaced ?? [])]} />
            <TeacherCapacityList rows={builderTeacherLoadRows} compact />
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="principal-page-stack principal-schedule-page principal-schedule-page--overview">
      <div className="principal-schedule-stats" aria-label="Program istatistikleri">
        <StatCard tone="sky" icon={<CalendarDays size={17} />} label="Haftalık blok" value={displayedWeeklyCapacity} detail={`${displayedSettings.activeDayIds.length} gün x ${displayedSettings.lessonsPerDay} ders x ${sectionOptions.length} şube`} />
        <StatCard tone="emerald" icon={<BookOpenCheck size={17} />} label="Ders yükü" value={displayedRequestedLessons} detail={`${displayedSubjects.length} ders tanımlı`} />
        <StatCard tone="amber" icon={<UsersRound size={17} />} label="Öğretmen uyumu" value={`${displayedExactTeachers}/${displayTeacherLoadRows.length}`} detail={`${displayedRiskyTeachers} kapasite aşımı`} />
        <StatCard tone="violet" icon={<Gauge size={17} />} label="Aktif program" value={displayedSchedule ? `%${displayedSchedule.score}` : "-"} detail={displayedSchedule ? `${displayedPlacedLessons} ders yerleşti` : `${data.schedule?.lessons.length ?? 0} yayınlı ders var`} />
      </div>

      <div className="principal-schedule-overview-main">
        <article
          className="principal-surface-card principal-schedule-panel principal-schedule-board-card"
          style={{ ["--schedule-card-max-width" as string]: `${Math.min(940, 104 + displayedSlots.length * 102)}px` }}
        >
          <div className="principal-schedule-board-head">
            <div className="principal-schedule-card-head">
              <div>
                <span>{activeSchedule ? "Aktif program" : draft ? "Kaydedilmemiş taslak" : "Program yok"}</span>
                <h2>Ders programı</h2>
              </div>
              <CalendarDays size={18} />
            </div>
            <select value={selectedSection?.id ?? ""} onChange={(event) => setSelectedSectionId(event.target.value)} disabled={sectionOptions.length === 0}>
              {sectionOptions.length === 0 ? <option value="">Şube yok</option> : null}
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label} · {studentsBySection.get(section.id) ?? 0} öğrenci
                </option>
              ))}
            </select>
          </div>

          {!displayedSchedule ? (
            <p className="empty-text">Aktif program bulunmuyor. Ders programı yenileme sayfasından yeni program oluşturun.</p>
          ) : (
            <ScheduleBoard settings={displayedSettings} slots={displayedSlots} lessonsBySlot={displayedLessonBySlot} section={selectedSection} subjectPlans={displayedSubjects} teachers={teachers} />
          )}
        </article>

        <article className="principal-surface-card principal-schedule-panel principal-schedule-control-card">
          <div className="principal-schedule-card-head">
            <div>
              <span>Kontrol</span>
              <h2>Program yönetimi</h2>
            </div>
            <CheckCircle2 size={18} />
          </div>

          <button className="primary-action principal-schedule-refresh" type="button" onClick={() => navigate("/dashboard/schedule/builder")}>
            <RefreshCw size={16} />
            Ders programı yenileme
          </button>

          <div className="principal-schedule-saved-list">
            {savedSchedules.length === 0 ? (
              <p className="empty-text">Kayıtlı ders programı yok.</p>
            ) : (
              savedSchedules.slice(0, 4).map((schedule) => (
                <div className="principal-schedule-saved-row" key={schedule.id}>
                  <div>
                    <strong>{schedule.name}</strong>
                    <span>{schedule.lessons.length} ders · {formatDate(schedule.savedAt)}</span>
                  </div>
                  <em className={`principal-schedule-state principal-schedule-state--${schedule.status}`}>{schedule.status === "active" ? "Aktif" : "Pasif"}</em>
                  <div className="principal-schedule-saved-actions">
                    {schedule.status === "active" ? (
                      <button className="ghost-action" type="button" onClick={() => setSchedulePassive(schedule.id)}>Pasif</button>
                    ) : (
                      <button className="ghost-action" type="button" onClick={() => setScheduleActive(schedule.id)}>Aktif</button>
                    )}
                    <button className="ghost-action danger principal-schedule-delete" type="button" onClick={() => deleteSavedSchedule(schedule.id)} aria-label="Programı sil">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="principal-schedule-bottom-grid">
        <article className="principal-surface-card principal-schedule-panel principal-schedule-capacity-card">
          <div className="principal-schedule-card-head">
            <div>
              <span>Kapasite</span>
              <h2>Öğretmen yükü</h2>
            </div>
            <UsersRound size={18} />
          </div>
          <TeacherCapacityList rows={displayTeacherLoadRows} compact />
        </article>

        <article className="principal-surface-card principal-schedule-panel principal-schedule-warning-card">
          <div className="principal-schedule-card-head">
            <div>
              <span>Uyarılar</span>
              <h2>Program sinyalleri</h2>
            </div>
            <AlertTriangle size={18} />
          </div>
          <WarningList warnings={warningList} />
        </article>
      </div>
    </section>
  );
}

function StatCard({ tone, icon, label, value, detail }: { tone: "sky" | "emerald" | "amber" | "violet"; icon: JSX.Element; label: string; value: string | number; detail: string }) {
  return (
    <article className={`principal-schedule-stat principal-schedule-stat--${tone}`}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ReadinessItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={ok ? "principal-schedule-ready is-ok" : "principal-schedule-ready"}>
      {ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      <span>{label}</span>
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  const visible = warnings.filter(Boolean).slice(0, 6);
  if (visible.length === 0) {
    return (
      <div className="principal-schedule-warning-empty">
        <CheckCircle2 size={15} />
        Kritik uyarı yok.
      </div>
    );
  }
  return (
    <div className="principal-schedule-warning-list">
      {visible.map((warning) => (
        <div className="principal-schedule-warning-row" key={warning}>
          <AlertTriangle size={13} />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}

function TeacherCapacityList({
  rows,
  compact = false
}: {
  rows: Array<{ teacher: PrincipalManagedTeacher; planned: number; generated: number; capacity: number; status: LoadStatus; delta: number }>;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="empty-text">Ders yükü atanmış öğretmen yok.</p>;
  }
  return (
    <div className={compact ? "principal-schedule-teacher-list is-compact" : "principal-schedule-teacher-list"}>
      {rows.slice(0, compact ? 5 : rows.length).map((row) => (
        <div className="principal-schedule-teacher-row" key={row.teacher.id}>
          <div>
            <strong>{teacherFullName(row.teacher)}</strong>
            <span>{row.teacher.branch || "Branş belirtilmedi"}</span>
          </div>
          <div className="principal-schedule-load-meter">
            <span style={{ width: `${Math.min(100, row.capacity > 0 ? (Math.max(row.generated, row.planned) / row.capacity) * 100 : 100)}%` }} />
          </div>
          <em className={`principal-schedule-load-status principal-schedule-load-status--${row.status}`}>
            {Math.max(row.generated, row.planned)}/{row.capacity}
          </em>
        </div>
      ))}
    </div>
  );
}

function ScheduleBoard({
  settings,
  slots,
  lessonsBySlot,
  section,
  subjectPlans,
  teachers,
  editable = false,
  onSubjectChange,
  onTeacherChange
}: {
  settings: ScheduleSettings;
  slots: TimeSlot[];
  lessonsBySlot: Map<string, GeneratedLesson>;
  section: SectionOption | null;
  subjectPlans: SubjectPlan[];
  teachers: PrincipalManagedTeacher[];
  editable?: boolean;
  onSubjectChange?: (section: SectionOption, dayId: DayId, slot: TimeSlot, subjectPlanId: string) => void;
  onTeacherChange?: (lessonId: string, teacherId: string) => void;
}) {
  return (
    <div
      className={editable ? "principal-schedule-board is-editable" : "principal-schedule-board is-compact"}
      style={{
        ["--schedule-slot-count" as string]: String(slots.length),
        ["--schedule-board-min-width" as string]: `${editable ? 92 + slots.length * 128 : 88 + slots.length * 96}px`,
        ["--schedule-cell-min" as string]: `${editable ? 118 : 88}px`,
        ["--schedule-board-height" as string]: `${editable ? 42 + settings.activeDayIds.length * 72 : 40 + settings.activeDayIds.length * 56}px`
      }}
    >
      <div className="principal-schedule-board-row principal-schedule-board-row--head">
        <span>Gün</span>
        {slots.map((slot) => (
          <span key={slot.slotIndex}>
            {slot.label}
            <small>{slot.startTime}-{slot.endTime}</small>
          </span>
        ))}
      </div>
      {settings.activeDayIds.map((dayId) => (
        <div className="principal-schedule-board-row" key={dayId}>
          <strong>{dayName(dayId)}</strong>
          {slots.map((slot) => {
            const lesson = lessonsBySlot.get(`${dayId}-${slot.slotIndex}`);
            return (
              <div className={lesson ? "principal-schedule-slot is-filled" : "principal-schedule-slot"} key={slot.slotIndex}>
                {editable && section ? (
                  <>
                    <select
                      className="principal-schedule-slot-select"
                      value={lesson?.subjectPlanId ?? ""}
                      onChange={(event) => onSubjectChange?.(section, dayId, slot, event.target.value)}
                    >
                      <option value="">Boş</option>
                      {subjectPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.subjectName}
                        </option>
                      ))}
                    </select>
                    {lesson ? (
                      <select className="principal-schedule-slot-select" value={lesson.teacherId} onChange={(event) => onTeacherChange?.(lesson.id, event.target.value)}>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacherFullName(teacher)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {lesson ? <small>{lesson.startTime}-{lesson.endTime}</small> : null}
                  </>
                ) : lesson ? (
                  <>
                    <b>{lesson.subjectName}</b>
                    <span>{lesson.teacherName}</span>
                    <small>{lesson.room}</small>
                  </>
                ) : (
                  <em>Boş</em>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function generateScheduleDraft({
  settings,
  subjectPlans,
  sections,
  teachers
}: {
  settings: ScheduleSettings;
  subjectPlans: SubjectPlan[];
  sections: SectionOption[];
  teachers: PrincipalManagedTeacher[];
}): GeneratedScheduleDraft {
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const timeSlots = buildTimeSlots(settings);
  const busyTeachers = new Set<string>();
  const busySections = new Set<string>();
  const teacherAssigned = new Map<string, number>();
  const sectionDayLoad = new Map<string, number>();
  const sectionSubjectDayLoad = new Map<string, number>();
  const unplaced: string[] = [];
  const lessons: GeneratedLesson[] = [];
  const tasks = buildScheduleTasks(subjectPlans, sections, teacherById);

  for (const task of tasks) {
    const teacher = teacherById.get(task.plan.teacherId);
    if (!teacher) {
      unplaced.push(`${task.section.label} - ${task.plan.subjectName}: öğretmen bulunamadı.`);
      continue;
    }

    const teacherCapacity = Number(teacher.weeklyLessonHours) || 0;
    const assignedCount = teacherAssigned.get(teacher.id) ?? 0;
    if (teacherCapacity <= assignedCount) {
      unplaced.push(`${teacherFullName(teacher)} haftalık ${teacherCapacity} saat kapasitesini aşıyor: ${task.section.label} - ${task.plan.subjectName}.`);
      continue;
    }

    const candidate = findBestSlot({
      settings,
      timeSlots,
      task,
      busyTeachers,
      busySections,
      sectionDayLoad,
      sectionSubjectDayLoad,
      teacherAssigned
    });

    if (!candidate) {
      unplaced.push(`${task.section.label} - ${task.plan.subjectName}: uygun boş blok bulunamadı.`);
      continue;
    }

    const lesson: GeneratedLesson = {
      id: createClientId("lesson"),
      subjectPlanId: task.plan.id,
      dayId: candidate.dayId,
      slotIndex: candidate.slot.slotIndex,
      startTime: candidate.slot.startTime,
      endTime: candidate.slot.endTime,
      classId: task.section.classId,
      sectionId: task.section.id,
      className: task.section.className,
      sectionName: task.section.sectionName,
      subjectName: task.plan.subjectName.trim(),
      teacherId: teacher.id,
      teacherName: teacherFullName(teacher),
      room: `${task.section.className}-${task.section.sectionName}`
    };

    lessons.push(lesson);
    busyTeachers.add(`${teacher.id}-${candidate.dayId}-${candidate.slot.slotIndex}`);
    busySections.add(`${task.section.id}-${candidate.dayId}-${candidate.slot.slotIndex}`);
    teacherAssigned.set(teacher.id, assignedCount + 1);
    sectionDayLoad.set(`${task.section.id}-${candidate.dayId}`, (sectionDayLoad.get(`${task.section.id}-${candidate.dayId}`) ?? 0) + 1);
    sectionSubjectDayLoad.set(
      `${task.section.id}-${task.plan.id}-${candidate.dayId}`,
      (sectionSubjectDayLoad.get(`${task.section.id}-${task.plan.id}-${candidate.dayId}`) ?? 0) + 1
    );
  }

  return recalculateDraft({
    id: createClientId("schedule"),
    generatedAt: new Date().toISOString(),
    score: 0,
    hardConflicts: 0,
    softWarnings: buildSoftWarnings(subjectPlans, sections, teacherById),
    unplaced,
    settings,
    subjects: subjectPlans,
    lessons
  });
}

function buildScheduleTasks(subjectPlans: SubjectPlan[], sections: SectionOption[], teacherById: Map<string, PrincipalManagedTeacher>) {
  return sections
    .flatMap((section) =>
      subjectPlans.flatMap((plan) =>
        Array.from({ length: Math.max(0, Number(plan.hoursPerSection) || 0) }, (_, index) => ({
          section,
          plan,
          repeatIndex: index,
          teacherCapacity: Number(teacherById.get(plan.teacherId)?.weeklyLessonHours) || 0
        }))
      )
    )
    .sort((a, b) => {
      if (a.teacherCapacity !== b.teacherCapacity) {
        return a.teacherCapacity - b.teacherCapacity;
      }
      if (a.plan.priority !== b.plan.priority) {
        return a.plan.priority === "morning" ? -1 : 1;
      }
      return `${a.section.label}-${a.plan.subjectName}-${a.repeatIndex}`.localeCompare(
        `${b.section.label}-${b.plan.subjectName}-${b.repeatIndex}`,
        "tr"
      );
    });
}

function findBestSlot({
  settings,
  timeSlots,
  task,
  busyTeachers,
  busySections,
  sectionDayLoad,
  sectionSubjectDayLoad,
  teacherAssigned
}: {
  settings: ScheduleSettings;
  timeSlots: TimeSlot[];
  task: ReturnType<typeof buildScheduleTasks>[number];
  busyTeachers: Set<string>;
  busySections: Set<string>;
  sectionDayLoad: Map<string, number>;
  sectionSubjectDayLoad: Map<string, number>;
  teacherAssigned: Map<string, number>;
}) {
  let best: { dayId: DayId; slot: TimeSlot; score: number } | null = null;
  const middleSlot = Math.ceil(settings.lessonsPerDay / 2);

  for (const dayId of settings.activeDayIds) {
    for (const slot of timeSlots) {
      if (busyTeachers.has(`${task.plan.teacherId}-${dayId}-${slot.slotIndex}`)) {
        continue;
      }
      if (busySections.has(`${task.section.id}-${dayId}-${slot.slotIndex}`)) {
        continue;
      }

      const dayLoad = sectionDayLoad.get(`${task.section.id}-${dayId}`) ?? 0;
      const subjectDayLoad = sectionSubjectDayLoad.get(`${task.section.id}-${task.plan.id}-${dayId}`) ?? 0;
      const teacherLoad = teacherAssigned.get(task.plan.teacherId) ?? 0;
      const priorityScore = task.plan.priority === "morning" ? slot.slotIndex * 5 : Math.abs(slot.slotIndex - middleSlot) * 2;
      const repeatedSubjectPenalty = subjectDayLoad > 0 ? subjectDayLoad * 32 : 0;
      const score = dayLoad * 9 + repeatedSubjectPenalty + priorityScore + teacherLoad * 0.5;

      if (!best || score < best.score) {
        best = { dayId, slot, score };
      }
    }
  }

  return best;
}

function buildManualLesson(
  section: SectionOption,
  dayId: DayId,
  slot: TimeSlot,
  plan: SubjectPlan,
  teacher: PrincipalManagedTeacher,
  existing?: GeneratedLesson
): GeneratedLesson {
  return {
    id: existing?.id ?? createClientId("lesson"),
    subjectPlanId: plan.id,
    dayId,
    slotIndex: slot.slotIndex,
    startTime: slot.startTime,
    endTime: slot.endTime,
    classId: section.classId,
    sectionId: section.id,
    className: section.className,
    sectionName: section.sectionName,
    subjectName: plan.subjectName.trim(),
    teacherId: teacher.id,
    teacherName: teacherFullName(teacher),
    room: `${section.className}-${section.sectionName}`
  };
}

function recalculateDraft(draft: GeneratedScheduleDraft): GeneratedScheduleDraft {
  const conflictCount = countGeneratedConflicts(draft.lessons);
  const totalRequested = draft.subjects.reduce((acc, plan) => acc + plan.hoursPerSection * uniqueSectionCount(draft.lessons), 0);
  const placementScore = totalRequested > 0 ? Math.round((draft.lessons.length / totalRequested) * 100) : 0;
  const hardConflicts = conflictCount + draft.unplaced.length;
  return {
    ...draft,
    hardConflicts,
    score: Math.max(0, Math.min(100, placementScore - hardConflicts * 3)),
    lessons: [...draft.lessons].sort(compareGeneratedLessons)
  };
}

function buildTeacherLoadRows(teachers: PrincipalManagedTeacher[], subjectPlans: SubjectPlan[], schedule: GeneratedScheduleDraft | SavedSchedule | null | undefined, sectionCount: number) {
  const generatedCounts = new Map<string, number>();
  for (const lesson of schedule?.lessons ?? []) {
    generatedCounts.set(lesson.teacherId, (generatedCounts.get(lesson.teacherId) ?? 0) + 1);
  }

  return teachers
    .map((teacher) => {
      const planned = subjectPlans
        .filter((plan) => plan.teacherId === teacher.id)
        .reduce((acc, plan) => acc + plan.hoursPerSection * sectionCount, 0);
      const capacity = Number(teacher.weeklyLessonHours) || 0;
      const generated = generatedCounts.get(teacher.id) ?? 0;
      const plannedOrGenerated = Math.max(planned, generated);
      const status: LoadStatus = capacity === plannedOrGenerated ? "exact" : plannedOrGenerated > capacity ? "over" : "under";
      return {
        teacher,
        planned,
        generated,
        capacity,
        status,
        delta: capacity - plannedOrGenerated
      };
    })
    .filter((row) => row.planned > 0 || row.capacity > 0 || row.generated > 0)
    .sort((a, b) => teacherFullName(a.teacher).localeCompare(teacherFullName(b.teacher), "tr"));
}

function buildSoftWarnings(subjectPlans: SubjectPlan[], sections: SectionOption[], teacherById: Map<string, PrincipalManagedTeacher>) {
  const warnings: string[] = [];
  for (const plan of subjectPlans) {
    const teacher = teacherById.get(plan.teacherId);
    if (!teacher) {
      continue;
    }
    const requested = plan.hoursPerSection * sections.length;
    const capacity = Number(teacher.weeklyLessonHours) || 0;
    if (capacity > requested) {
      warnings.push(`${teacherFullName(teacher)} için ${capacity - requested} saat kullanılmamış kapasite kalıyor.`);
    }
  }
  return warnings;
}

function validateBuilder(
  settings: ScheduleSettings,
  subjectPlans: SubjectPlan[],
  sections: SectionOption[],
  teachers: PrincipalManagedTeacher[],
  teacherLoadRows: Array<{ teacher: PrincipalManagedTeacher; planned: number; capacity: number; status: LoadStatus; delta: number }>
) {
  const warnings: string[] = [];
  const weeklyCapacity = settings.activeDayIds.length * settings.lessonsPerDay * sections.length;
  const requestedLessonCount = subjectPlans.reduce((acc, plan) => acc + plan.hoursPerSection * sections.length, 0);

  if (sections.length === 0) {
    warnings.push("Program üretmek için önce sınıf ve şube oluşturulmalı.");
  }
  if (teachers.length === 0) {
    warnings.push("Program üretmek için öğretmen tanımlanmalı.");
  }
  if (subjectPlans.length === 0) {
    warnings.push("En az bir ders yükü tanımlanmalı.");
  }
  if (settings.activeDayIds.length === 0) {
    warnings.push("En az bir çalışma günü seçilmeli.");
  }
  if (requestedLessonCount > weeklyCapacity) {
    warnings.push(`Haftalık blok kapasitesi yetersiz: ${requestedLessonCount}/${weeklyCapacity} ders isteniyor.`);
  }
  for (const row of teacherLoadRows) {
    if (row.status === "over") {
      warnings.push(`${teacherFullName(row.teacher)} kapasitesi aşılıyor: ${row.planned}/${row.capacity} saat.`);
    }
    if (row.capacity === 0 && row.planned > 0) {
      warnings.push(`${teacherFullName(row.teacher)} için haftalık ders saati 0 görünüyor.`);
    }
  }
  return warnings;
}

function hasTeacherSlotConflict(lessons: GeneratedLesson[], candidate: GeneratedLesson, ignoreLessonId?: string) {
  return lessons.some(
    (lesson) =>
      lesson.id !== ignoreLessonId &&
      lesson.teacherId === candidate.teacherId &&
      lesson.dayId === candidate.dayId &&
      lesson.slotIndex === candidate.slotIndex
  );
}

function countGeneratedConflicts(lessons: GeneratedLesson[]) {
  const teachers = new Set<string>();
  const sections = new Set<string>();
  let conflicts = 0;
  for (const lesson of lessons) {
    const teacherKey = `${lesson.teacherId}-${lesson.dayId}-${lesson.slotIndex}`;
    const sectionKey = `${lesson.sectionId}-${lesson.dayId}-${lesson.slotIndex}`;
    if (teachers.has(teacherKey)) {
      conflicts += 1;
    }
    if (sections.has(sectionKey)) {
      conflicts += 1;
    }
    teachers.add(teacherKey);
    sections.add(sectionKey);
  }
  return conflicts;
}

function uniqueSectionCount(lessons: GeneratedLesson[]) {
  return Math.max(1, new Set(lessons.map((lesson) => lesson.sectionId)).size);
}

function buildDefaultSubjectPlans(teachers: PrincipalManagedTeacher[], sectionCount: number): SubjectPlan[] {
  return teachers
    .filter((teacher) => teacherFullName(teacher).trim())
    .slice(0, 10)
    .map((teacher) => {
      const capacity = Number(teacher.weeklyLessonHours) || 0;
      return {
        id: createClientId("subject"),
        subjectName: teacher.branch.trim() || `${teacher.firstName || "Öğretmen"} dersi`,
        teacherId: teacher.id,
        hoursPerSection: Math.max(1, Math.min(6, Math.floor(capacity / Math.max(1, sectionCount)) || 1)),
        priority: isCoreSubject(teacher.branch) ? "morning" : "balanced"
      };
    });
}

function buildTimeSlots(settings: ScheduleSettings): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let cursor = timeToMinutes(settings.startTime);
  for (let index = 1; index <= settings.lessonsPerDay; index += 1) {
    const start = cursor;
    const end = start + settings.lessonMinutes;
    slots.push({
      slotIndex: index,
      label: `${index}. ders`,
      startTime: minutesToTime(start),
      endTime: minutesToTime(end)
    });
    cursor = end;
    if (index < settings.lessonsPerDay) {
      cursor += index === settings.lunchAfterLesson ? settings.lunchMinutes : settings.breakMinutes;
    }
  }
  return slots;
}

function parseScheduleStorage(raw: string | null): ScheduleStorage {
  if (!raw) {
    return {
      settings: DEFAULT_SETTINGS,
      subjectPlans: [],
      draft: null,
      savedSchedules: [],
      activeScheduleId: null
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ScheduleStorage> & { draft?: GeneratedScheduleDraft | null };
    const savedSchedules = Array.isArray(parsed.savedSchedules) ? parsed.savedSchedules.map(sanitizeSavedSchedule).filter(Boolean) : [];
    const draft = parsed.draft ? sanitizeDraft(parsed.draft) : null;
    return {
      settings: sanitizeSettings(parsed.settings),
      subjectPlans: Array.isArray(parsed.subjectPlans) ? parsed.subjectPlans : [],
      draft,
      savedSchedules: savedSchedules as SavedSchedule[],
      activeScheduleId: parsed.activeScheduleId ?? savedSchedules.find((item) => item?.status === "active")?.id ?? null
    };
  } catch {
    return {
      settings: DEFAULT_SETTINGS,
      subjectPlans: [],
      draft: null,
      savedSchedules: [],
      activeScheduleId: null
    };
  }
}

function sanitizeDraft(input: GeneratedScheduleDraft): GeneratedScheduleDraft {
  return {
    ...input,
    settings: sanitizeSettings(input.settings),
    subjects: Array.isArray(input.subjects) ? input.subjects : [],
    lessons: Array.isArray(input.lessons) ? input.lessons.map((lesson) => ({ ...lesson, subjectPlanId: lesson.subjectPlanId || "" })) : [],
    softWarnings: Array.isArray(input.softWarnings) ? input.softWarnings : [],
    unplaced: Array.isArray(input.unplaced) ? input.unplaced : []
  };
}

function sanitizeSavedSchedule(input: SavedSchedule | null | undefined): SavedSchedule | null {
  if (!input?.id) {
    return null;
  }
  const draft = sanitizeDraft(input);
  return {
    ...draft,
    name: input.name || defaultScheduleName(),
    status: input.status === "active" ? "active" : "passive",
    savedAt: input.savedAt || input.generatedAt || new Date().toISOString(),
    activatedAt: input.activatedAt
  };
}

function sanitizeSettings(input?: Partial<ScheduleSettings>): ScheduleSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(input ?? {}) };
  const activeDayIds = (merged.activeDayIds?.length ? merged.activeDayIds : DEFAULT_SETTINGS.activeDayIds)
    .filter((day): day is DayId => DAY_OPTIONS.some((option) => option.id === day))
    .sort((a, b) => a - b);
  const lessonsPerDay = clampNumber(merged.lessonsPerDay, 4, 10);
  return {
    activeDayIds,
    startTime: merged.startTime || DEFAULT_SETTINGS.startTime,
    lessonMinutes: clampNumber(merged.lessonMinutes, 30, 60),
    breakMinutes: clampNumber(merged.breakMinutes, 5, 25),
    lunchAfterLesson: clampNumber(merged.lunchAfterLesson, 1, lessonsPerDay),
    lunchMinutes: clampNumber(merged.lunchMinutes, 20, 90),
    lessonsPerDay
  };
}

function lessonMapForSection(lessons: GeneratedLesson[], sectionId: string) {
  const map = new Map<string, GeneratedLesson>();
  for (const lesson of lessons) {
    if (lesson.sectionId === sectionId) {
      map.set(`${lesson.dayId}-${lesson.slotIndex}`, lesson);
    }
  }
  return map;
}

function clampNumber(value: number | undefined, min: number, max: number) {
  const normalized = Number.isFinite(value) ? Number(value) : min;
  return Math.min(max, Math.max(min, Math.round(normalized)));
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return (Number.isFinite(hour) ? hour : 9) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function minutesToTime(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function teacherFullName(teacher: PrincipalManagedTeacher) {
  return `${teacher.firstName} ${teacher.lastName}`.trim() || teacher.username || "Öğretmen";
}

function dayName(dayId: DayId) {
  return DAY_OPTIONS.find((day) => day.id === dayId)?.name ?? "Gün";
}

function compareGeneratedLessons(a: GeneratedLesson, b: GeneratedLesson) {
  if (a.dayId !== b.dayId) {
    return a.dayId - b.dayId;
  }
  if (a.slotIndex !== b.slotIndex) {
    return a.slotIndex - b.slotIndex;
  }
  return a.className.localeCompare(b.className, "tr", { numeric: true });
}

function isCoreSubject(branch: string) {
  const normalized = branch.toLocaleLowerCase("tr-TR");
  return ["matematik", "türkçe", "turkce", "fen", "ingilizce"].some((item) => normalized.includes(item));
}

function defaultScheduleName() {
  return `Haftalık program ${new Date().toLocaleDateString("tr-TR")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("tr-TR");
}

function mapApiScheduleToDraft(
  schedule: { id: string; score: number; lessons: Lesson[]; updatedAt: string },
  settings: ScheduleSettings,
  subjectPlans: SubjectPlan[],
  sections: SectionOption[],
  teachers: PrincipalManagedTeacher[]
): GeneratedScheduleDraft {
  const slots = buildTimeSlots(settings);
  const slotByStart = new Map(slots.map((slot) => [slot.startTime, slot.slotIndex]));

  const lessons: GeneratedLesson[] = schedule.lessons.map((lesson) => {
    const section = sections.find((item) => item.classId === lesson.classId);
    const plan = subjectPlans.find(
      (item) => item.subjectName === lesson.subjectName || item.teacherId === lesson.teacherId
    );
    const teacher = teachers.find((item) => item.id === lesson.teacherId);
    return {
      id: lesson.id,
      subjectPlanId: plan?.id ?? lesson.subjectId,
      dayId: Math.min(6, Math.max(1, lesson.dayOfWeek || 1)) as DayId,
      slotIndex: slotByStart.get(lesson.startTime) ?? 1,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      classId: lesson.classId,
      sectionId: section?.id ?? "",
      className: lesson.className,
      sectionName: section?.sectionName ?? "",
      subjectName: lesson.subjectName,
      teacherId: lesson.teacherId,
      teacherName: lesson.teacherName || (teacher ? teacherFullName(teacher) : ""),
      room: lesson.room
    };
  });

  return {
    id: schedule.id,
    generatedAt: schedule.updatedAt,
    score: schedule.score,
    hardConflicts: 0,
    softWarnings: [],
    unplaced: [],
    settings,
    subjects: subjectPlans,
    lessons
  };
}
