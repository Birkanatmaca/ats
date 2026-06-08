import { CheckCircle2, Loader2, Plus, Send, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { api } from "../../../lib/api";
import type { AnnouncementAudienceTarget } from "../../../lib/api";
import type { ClassSection, ClassStudent, PrincipalConsoleData, SchoolClass } from "../types";

const audienceOptions = [
  { value: "all", label: "Tüm kurum", description: "Aktif tüm kullanıcılar" },
  { value: "teacher", label: "Öğretmenler", description: "Yalnızca öğretmen hesapları" },
  { value: "guardian", label: "Veliler", description: "Yalnızca veli hesapları" },
  { value: "guidance", label: "Rehberlik", description: "Rehberlik ekibi" },
  { value: "driver", label: "Servis şoförleri", description: "Servis personeli" }
] as const;

function targetLabel(target: AnnouncementAudienceTarget, labels: { classById: Map<string, string>; studentById: Map<string, string> }) {
  if (target.type === "all") return "Tüm kurum";
  if (target.type === "role") return audienceOptions.find((item) => item.value === target.role)?.label ?? target.role ?? "Rol";
  if (target.type === "class") return labels.classById.get(target.id ?? "") ?? "Sınıf hedefli";
  if (target.type === "student") return labels.studentById.get(target.id ?? "") ?? "Öğrenci/veli hedefli";
  if (target.type === "user") return "Tekil kullanıcı";
  return "Hedef";
}

function announcementTargetsLabel(item: { audience: string; audiences?: AnnouncementAudienceTarget[] }, labels: { classById: Map<string, string>; studentById: Map<string, string> }) {
  if (item.audiences?.length) {
    if (item.audiences.length === 1) return targetLabel(item.audiences[0], labels);
    return item.audiences.map((target) => targetLabel(target, labels)).join(", ");
  }
  if (item.audience.startsWith("class:")) return labels.classById.get(item.audience.slice(6)) ?? "Sınıf hedefli";
  return audienceOptions.find((option) => option.value === item.audience || `${option.value}s` === item.audience)?.label ?? item.audience;
}

export function PrincipalAnnouncementsPage({
  data,
  classes = [],
  sections = [],
  students = [],
  onAnnouncementCreated
}: {
  data: PrincipalConsoleData;
  classes?: SchoolClass[];
  sections?: ClassSection[];
  students?: ClassStudent[];
  onAnnouncementCreated?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roleTargets, setRoleTargets] = useState<string[]>(["guardian"]);
  const [classTargets, setClassTargets] = useState<string[]>([]);
  const [studentTargets, setStudentTargets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const labels = useMemo(() => {
    const classById = new Map(classes.map((item) => [item.id, item.name]));
    const sectionByClassId = new Map<string, string[]>();
    for (const section of sections) {
      const current = sectionByClassId.get(section.classId) ?? [];
      current.push(section.name);
      sectionByClassId.set(section.classId, current);
    }
    for (const [classId, sectionNames] of sectionByClassId) {
      if (sectionNames.length > 0) {
        classById.set(classId, `${classById.get(classId) ?? "Sınıf"} / ${sectionNames.join(", ")}`);
      }
    }
    const studentById = new Map(students.map((item) => [item.id, `${item.firstName} ${item.lastName} (${item.schoolNumber})`]));
    return { classById, studentById };
  }, [classes, sections, students]);

  const stats = useMemo(() => {
    return data.announcements.reduce(
      (acc, item) => {
        acc.targets += item.targetCount ?? 0;
        acc.delivered += item.deliveryCount ?? 0;
        acc.reads += item.readCount ?? 0;
        return acc;
      },
      { targets: 0, delivered: 0, reads: 0 }
    );
  }, [data.announcements]);

  function toggleSelection(value: string, selected: string[], setter: (next: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  function buildTargets(): AnnouncementAudienceTarget[] {
    if (roleTargets.includes("all")) {
      return [{ type: "all" }];
    }
    const targets: AnnouncementAudienceTarget[] = [
      ...roleTargets.map((role) => ({ type: "role" as const, role })),
      ...classTargets.map((id) => ({ type: "class" as const, id })),
      ...studentTargets.map((id) => ({ type: "student" as const, id }))
    ];
    return targets;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const audiences = buildTargets();
    if (audiences.length === 0) {
      setLoading(false);
      setError("En az bir hedef seçmelisin.");
      return;
    }
    try {
      await api.createAnnouncement({ title: title.trim(), body: body.trim(), audiences, publish: true });
      setTitle("");
      setBody("");
      setRoleTargets(["guardian"]);
      setClassTargets([]);
      setStudentTargets([]);
      setShowForm(false);
      setSuccess("Duyuru yayınlandı.");
      onAnnouncementCreated?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Duyuru oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="principal-page-stack">
      <header className="sa-page-header">
        <span className="sa-kicker">Duyurular</span>
        <h1>Yayınlanan duyurular</h1>
        <p>Veli ve öğretmen iletişiminde kullanılan güncel kurum duyurularını yönet.</p>
        <button className="primary-action small-action" type="button" onClick={() => setShowForm((current) => !current)}>
          <Plus size={16} />
          {showForm ? "Formu kapat" : "Yeni duyuru"}
        </button>
      </header>

      {showForm ? (
        <article className="principal-surface-card">
          <h2>Yeni duyuru oluştur</h2>
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}
          <form className="principal-announcement-form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="field">
              <span>Başlık</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
            </label>

            <div className="principal-announcement-target-panel">
              <div>
                <strong>Rol bazlı</strong>
                <div className="principal-target-chip-grid">
                  {audienceOptions.map((option) => (
                    <label className="principal-target-chip" key={option.value} title={option.description}>
                      <input
                        checked={roleTargets.includes(option.value)}
                        onChange={() => {
                          if (option.value === "all") {
                            setRoleTargets(roleTargets.includes("all") ? [] : ["all"]);
                            return;
                          }
                          const withoutAll = roleTargets.filter((item) => item !== "all");
                          toggleSelection(option.value, withoutAll, setRoleTargets);
                        }}
                        type="checkbox"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Sınıf / şube bazlı</span>
                <select value="" onChange={(event) => event.target.value && toggleSelection(event.target.value, classTargets, setClassTargets)}>
                  <option value="">Sınıf veya şube ekle</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {labels.classById.get(item.id) ?? item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Öğrenci / veli bazlı</span>
                <select value="" onChange={(event) => event.target.value && toggleSelection(event.target.value, studentTargets, setStudentTargets)}>
                  <option value="">Öğrenci velisi ekle</option>
                  {students.map((item) => (
                    <option key={item.id} value={item.id}>
                      {labels.studentById.get(item.id)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="principal-selected-targets">
                {buildTargets().map((target) => {
                  const key = `${target.type}:${target.id ?? target.role ?? "all"}`;
                  return (
                    <button
                      className="principal-selected-target"
                      key={key}
                      onClick={() => {
                        if (target.type === "role" && target.role) toggleSelection(target.role, roleTargets, setRoleTargets);
                        if (target.type === "class" && target.id) toggleSelection(target.id, classTargets, setClassTargets);
                        if (target.type === "student" && target.id) toggleSelection(target.id, studentTargets, setStudentTargets);
                        if (target.type === "all") setRoleTargets([]);
                      }}
                      type="button"
                    >
                      {targetLabel(target, labels)}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="field">
              <span>İçerik</span>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={5} maxLength={4000} />
            </label>
            <button className="primary-action" type="submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={17} /> : null}
              Yayınla
            </button>
          </form>
        </article>
      ) : null}

      <div className="principal-announcement-metrics">
        <div>
          <span>Hedef</span>
          <strong>{stats.targets}</strong>
        </div>
        <div>
          <span>Teslim</span>
          <strong>{stats.delivered}</strong>
        </div>
        <div>
          <span>Okundu</span>
          <strong>{stats.reads}</strong>
        </div>
      </div>

      <article className="principal-surface-card">
        {data.announcements.length === 0 ? (
          <p className="empty-text">Yayınlanmış duyuru bulunamadı.</p>
        ) : (
          <div className="principal-list">
            {data.announcements.map((item) => (
              <div className="principal-list-row principal-announcement-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span className="principal-announcement-audience">
                    <Users size={14} aria-hidden />
                    {announcementTargetsLabel(item, labels)}
                  </span>
                </div>
                <small>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("tr-TR") : "Taslak"}</small>
                <div className="principal-announcement-delivery">
                  <span><Send size={13} /> {item.deliveryCount ?? 0}/{item.targetCount ?? 0} teslim</span>
                  <span><CheckCircle2 size={13} /> {item.readCount ?? 0} okundu</span>
                </div>
                <em>{item.body}</em>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
