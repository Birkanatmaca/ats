import { CheckCircle2, Clock3, FileText, Loader2, Plus, Send, Users, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../../../lib/api";
import type { Announcement, AnnouncementAudienceTarget, AnnouncementTemplate } from "../../../lib/api";
import { ResourceFileManager } from "../../components/ResourceFileManager";
import type { ClassSection, ClassStudent, PrincipalConsoleData, SchoolClass } from "../types";

const audienceOptions = [
  { value: "all", label: "Tüm kurum", description: "Aktif tüm kullanıcılar" },
  { value: "teacher", label: "Öğretmenler", description: "Yalnızca öğretmen hesapları" },
  { value: "guardian", label: "Veliler", description: "Yalnızca veli hesapları" },
  { value: "guidance", label: "Rehberlik", description: "Rehberlik ekibi" },
  { value: "driver", label: "Servis şoförleri", description: "Servis personeli" }
] as const;

const statusLabels: Record<string, string> = {
  draft: "Taslak",
  scheduled: "Planlı",
  published: "Yayında",
  archived: "Arşiv"
};

const MAX_ANNOUNCEMENT_ATTACHMENT_SIZE = 8 * 1024 * 1024;

function targetLabel(target: AnnouncementAudienceTarget, labels: { classById: Map<string, string>; sectionById: Map<string, string>; studentById: Map<string, string> }) {
  if (target.type === "all") return "Tüm kurum";
  if (target.type === "role") return audienceOptions.find((item) => item.value === target.role)?.label ?? target.role ?? "Rol";
  if (target.type === "class") return labels.classById.get(target.id ?? "") ?? "Sınıf hedefli";
  if (target.type === "section") return labels.sectionById.get(target.id ?? "") ?? "Şube hedefli";
  if (target.type === "student") return labels.studentById.get(target.id ?? "") ?? "Öğrenci/veli hedefli";
  if (target.type === "user") return "Tekil kullanıcı";
  return "Hedef";
}

function announcementTargetsLabel(item: { audience: string; audiences?: AnnouncementAudienceTarget[] }, labels: { classById: Map<string, string>; sectionById: Map<string, string>; studentById: Map<string, string> }) {
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
  const [scheduledAt, setScheduledAt] = useState("");
  const [roleTargets, setRoleTargets] = useState<string[]>(["guardian"]);
  const [classTargets, setClassTargets] = useState<string[]>([]);
  const [sectionTargets, setSectionTargets] = useState<string[]>([]);
  const [studentTargets, setStudentTargets] = useState<string[]>([]);
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileModalAnnouncement, setFileModalAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!showForm) return;
    void api.announcementTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, [showForm]);

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
    const sectionById = new Map(
      sections.map((item) => [item.id, `${classById.get(item.classId) ?? "Sınıf"} / ${item.name}`])
    );
    return { classById, studentById, sectionById };
  }, [classes, sections, students]);

  const stats = useMemo(() => {
    return data.announcements.reduce(
      (acc, item) => {
        acc.targets += item.targetCount ?? 0;
        acc.inApp += item.deliveryCount ?? 0;
        acc.pushSent += item.pushSentCount ?? 0;
        acc.pushDropped += item.pushDroppedCount ?? 0;
        acc.reads += item.readCount ?? 0;
        return acc;
      },
      { targets: 0, inApp: 0, pushSent: 0, pushDropped: 0, reads: 0 }
    );
  }, [data.announcements]);

  function toggleSelection(value: string, selected: string[], setter: (next: string[]) => void) {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  function buildTargets(): AnnouncementAudienceTarget[] {
    if (roleTargets.includes("all")) {
      return [{ type: "all" }];
    }
    return [
      ...roleTargets.map((role) => ({ type: "role" as const, role })),
      ...classTargets.map((id) => ({ type: "class" as const, id })),
      ...sectionTargets.map((id) => ({ type: "section" as const, id })),
      ...studentTargets.map((id) => ({ type: "student" as const, id }))
    ];
  }

  function resetForm() {
    setTitle("");
    setBody("");
    setScheduledAt("");
    setRoleTargets(["guardian"]);
    setClassTargets([]);
    setSectionTargets([]);
    setStudentTargets([]);
    setPendingFiles([]);
  }

  function handlePendingFiles(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (selected.length === 0) return;
    const tooLarge = selected.find((file) => file.size > MAX_ANNOUNCEMENT_ATTACHMENT_SIZE);
    if (tooLarge) {
      setError(`${tooLarge.name} en fazla 8 MB olabilir.`);
      return;
    }
    setError(null);
    setPendingFiles((current) => [...current, ...selected]);
  }

  async function submitAnnouncement(mode: "draft" | "schedule" | "publish") {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const audiences = buildTargets();
    if (audiences.length === 0) {
      setLoading(false);
      setError("En az bir hedef seçmelisin.");
      return;
    }
    const payload = {
      title: title.trim(),
      body: body.trim(),
      audiences,
      publish: mode === "publish",
      scheduledAt: mode === "schedule" ? new Date(scheduledAt).toISOString() : undefined
    };
    if (mode === "schedule" && (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime()))) {
      setLoading(false);
      setError("Planlı yayın için geçerli bir tarih seç.");
      return;
    }
    try {
      const created = await api.createAnnouncement(payload);
      let attachmentWarning: string | null = null;
      if (pendingFiles.length > 0) {
        try {
          for (const file of pendingFiles) {
            await api.uploadFile({ file, category: "announcement", resourceType: "announcement", resourceId: created.id });
          }
        } catch (uploadError) {
          attachmentWarning = uploadError instanceof Error ? uploadError.message : "Ek dosyalardan biri yüklenemedi.";
        }
      }
      resetForm();
      setShowForm(false);
      setSuccess(
        `${mode === "draft" ? "Taslak kaydedildi." : mode === "schedule" ? "Duyuru planlandı." : "Duyuru yayınlandı."}${
          pendingFiles.length > 0 && !attachmentWarning ? ` ${pendingFiles.length} ek yüklendi.` : ""
        }`
      );
      if (attachmentWarning) {
        setError(`Duyuru kaydedildi fakat ek yüklenemedi: ${attachmentWarning}`);
      }
      onAnnouncementCreated?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Duyuru kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAnnouncement("publish");
  }

  return (
    <section className="principal-page-stack">
      <header className="sa-page-header">
        <span className="sa-kicker">Duyurular</span>
        <h1>Duyuru ve bildirim yönetimi</h1>
        <p>Hedefli duyuruları yayınla, planla ve teslim performansını izle.</p>
        <button className="primary-action small-action" type="button" onClick={() => setShowForm((current) => !current)}>
          <Plus size={16} />
          {showForm ? "Formu kapat" : "Yeni duyuru"}
        </button>
      </header>

      {!showForm && success ? <div className="form-success">{success}</div> : null}
      {!showForm && error ? <div className="form-error">{error}</div> : null}

      {showForm ? (
        <article className="principal-surface-card">
          <h2>Yeni duyuru oluştur</h2>
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}
          <form className="principal-announcement-form" onSubmit={(event) => void handleSubmit(event)}>
            {templates.length > 0 ? (
              <label className="field">
                <span>Şablon</span>
                <select
                  value=""
                  onChange={(event) => {
                    const selected = templates.find((item) => item.id === event.target.value);
                    if (!selected) return;
                    setTitle(selected.titleTemplate);
                    setBody(selected.bodyTemplate);
                  }}
                >
                  <option value="">Şablondan doldur</option>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

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
                <span>Sınıf bazlı</span>
                <select value="" onChange={(event) => event.target.value && toggleSelection(event.target.value, classTargets, setClassTargets)}>
                  <option value="">Sınıf ekle</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {labels.classById.get(item.id) ?? item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Şube bazlı</span>
                <select value="" onChange={(event) => event.target.value && toggleSelection(event.target.value, sectionTargets, setSectionTargets)}>
                  <option value="">Şube ekle</option>
                  {sections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {labels.sectionById.get(item.id) ?? item.name}
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
                        if (target.type === "section" && target.id) toggleSelection(target.id, sectionTargets, setSectionTargets);
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

            <label className="field">
              <span>Planlı yayın (opsiyonel)</span>
              <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
            </label>

            <label className="field principal-announcement-attachment-field">
              <span>Ek dosyalar</span>
              <input
                accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                multiple
                onChange={(event) => {
                  handlePendingFiles(event.target.files);
                  event.target.value = "";
                }}
                type="file"
              />
              <small>PDF, görsel veya Office belgesi · dosya başına 8 MB</small>
            </label>

            {pendingFiles.length > 0 ? (
              <div className="principal-announcement-pending-files">
                {pendingFiles.map((file, index) => (
                  <button
                    className="principal-announcement-pending-file"
                    key={`${file.name}-${file.size}-${index}`}
                    onClick={() => setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                    type="button"
                    title="Eki kaldır"
                  >
                    <FileText size={14} />
                    <span>{file.name}</span>
                    <X size={13} />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="principal-announcement-actions">
              <button className="secondary-action" disabled={loading} onClick={() => void submitAnnouncement("draft")} type="button">
                Taslak kaydet
              </button>
              <button className="secondary-action" disabled={loading || !scheduledAt} onClick={() => void submitAnnouncement("schedule")} type="button">
                <Clock3 size={15} />
                Planla
              </button>
              <button className="primary-action" disabled={loading} type="submit">
                {loading ? <Loader2 className="spin" size={17} /> : null}
                Hemen yayınla
              </button>
            </div>
          </form>
        </article>
      ) : null}

      <div className="principal-announcement-metrics">
        <div>
          <span>Hedef</span>
          <strong>{stats.targets}</strong>
        </div>
        <div>
          <span>In-app</span>
          <strong>{stats.inApp}</strong>
        </div>
        <div>
          <span>Push gönderildi</span>
          <strong>{stats.pushSent}</strong>
        </div>
        <div>
          <span>Push düşürüldü</span>
          <strong>{stats.pushDropped}</strong>
        </div>
        <div>
          <span>Okundu</span>
          <strong>{stats.reads}</strong>
        </div>
      </div>

      <article className="principal-surface-card">
        {data.announcements.length === 0 ? (
          <p className="empty-text">Duyuru bulunamadı.</p>
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
                <small>
                  {statusLabels[item.status ?? "published"] ?? item.status}
                  {item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString("tr-TR")}` : ""}
                  {item.scheduledAt ? ` · Plan: ${new Date(item.scheduledAt).toLocaleString("tr-TR")}` : ""}
                </small>
                <div className="principal-announcement-delivery">
                  <span>
                    <Send size={13} /> {item.deliveryCount ?? 0}/{item.targetCount ?? 0} in-app
                  </span>
                  <span>
                    Push {item.pushSentCount ?? 0} gönderildi · {item.pushDroppedCount ?? 0} düşürüldü
                    {(item.pushFailedCount ?? 0) > 0 ? ` · ${item.pushFailedCount} hata` : ""}
                  </span>
                  <span>
                    <CheckCircle2 size={13} /> {item.readCount ?? 0} okundu
                  </span>
                </div>
                <em>{item.body}</em>
                <button className="secondary-action small-action" onClick={() => setFileModalAnnouncement(item)} type="button">
                  <FileText size={15} />
                  Ekler
                </button>
                {item.status === "draft" || item.status === "scheduled" ? (
                  <button className="secondary-action small-action" onClick={() => void api.publishAnnouncement(item.id).then(() => onAnnouncementCreated?.())} type="button">
                    Şimdi yayınla
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </article>

      {fileModalAnnouncement ? (
        <div className="principal-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setFileModalAnnouncement(null)}>
          <div className="principal-modal principal-announcement-files-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-files-title">
            <header className="principal-modal-head">
              <div>
                <h2 id="announcement-files-title">{fileModalAnnouncement.title}</h2>
                <p>Duyuru ekleri</p>
              </div>
              <button className="principal-modal-close" type="button" onClick={() => setFileModalAnnouncement(null)} aria-label="Kapat">
                <X size={18} />
              </button>
            </header>
            <div className="principal-modal-body">
              <ResourceFileManager
                title="Duyuru ekleri"
                category="announcement"
                resourceType="announcement"
                resourceId={fileModalAnnouncement.id}
                emptyText="Bu duyuru için henüz ek dosya yok."
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
