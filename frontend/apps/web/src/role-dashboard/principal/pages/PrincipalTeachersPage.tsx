import { CheckCircle2, Clock3, KeyRound, Pencil, Plus, RotateCcw, Search, Tags, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { PrincipalManagedTeacher, SchoolClass } from "../types";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { CredentialRevealDialog } from "../components/CredentialRevealDialog";
import { TeacherFormModal, type TeacherFormPayload } from "../components/TeacherFormModal";
import "../../guidance/GuidanceDataPage.css";
import "./PrincipalTeachersPage.css";

export function PrincipalTeachersPage({
  teachers,
  classes,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onResetPassword,
  onMarkFirstLoginComplete
}: {
  teachers: PrincipalManagedTeacher[];
  classes: SchoolClass[];
  onAddTeacher: (payload: TeacherFormPayload) => Promise<string | void>;
  onUpdateTeacher: (
    id: string,
    payload: {
      firstName: string;
      lastName: string;
      branch: string;
      weeklyLessonHours: number;
      classId: string | null;
      className: string | null;
    }
  ) => void;
  onDeleteTeacher: (id: string) => void;
  onResetPassword: (id: string) => Promise<string>;
  /** Öğretmen ilk girişte şifresini değiştirdiğinde (API entegrasyonu öncesi manuel işaretleme). */
  onMarkFirstLoginComplete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<PrincipalManagedTeacher | null>(null);
  const [credential, setCredential] = useState<{ title: string; username: string; password: string; hint?: string } | null>(null);

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of teachers) {
      if (t.branch.trim()) {
        set.add(t.branch.trim());
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [teachers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers
      .filter((t) => {
        if (filterBranch && t.branch.trim() !== filterBranch) {
          return false;
        }
        if (filterClassId) {
          if (t.classId !== filterClassId) {
            return false;
          }
        }
        if (!q) {
          return true;
        }
        const blob = `${t.firstName} ${t.lastName} ${t.username} ${t.branch} ${t.className ?? ""}`.toLowerCase();
        return blob.includes(q);
      })
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr"));
  }, [teachers, search, filterBranch, filterClassId]);

  const filterKey = `${search}|${filterBranch}|${filterClassId}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filtered, filterKey);

  const existingUsernames = useMemo(() => teachers.map((t) => t.username), [teachers]);

  const teacherStats = useMemo(() => {
    const pendingFirstLogin = teachers.filter((t) => t.mustChangePassword).length;
    const weeklyHoursTotal = teachers.reduce((acc, t) => acc + (Number(t.weeklyLessonHours) || 0), 0);
    const branchCount = new Set(teachers.map((t) => t.branch.trim()).filter(Boolean)).size;
    const withClass = teachers.filter((t) => t.classId).length;
    return { total: teachers.length, pendingFirstLogin, weeklyHoursTotal, branchCount, withClass };
  }, [teachers]);

  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: PrincipalManagedTeacher) {
    setModalMode("edit");
    setEditing(row);
    setModalOpen(true);
  }

  async function handleFormSubmit(payload: TeacherFormPayload) {
    if (modalMode === "create") {
      setSubmitting(true);
      try {
        const tempPassword = await onAddTeacher(payload);
        setModalOpen(false);
        setCredential({
          title: "Öğretmen oluşturuldu",
          username: payload.username.includes("@") ? payload.username : `${payload.username}@ots.local`,
          password: typeof tempPassword === "string" ? tempPassword : payload.password,
          hint: "Bu bilgileri öğretmene güvenli kanaldan iletin. İlk girişte kalıcı şifre belirlemesi istenir."
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (editing) {
      const className = payload.classId ? classes.find((c) => c.id === payload.classId)?.name ?? null : null;
      onUpdateTeacher(editing.id, {
        firstName: payload.firstName,
        lastName: payload.lastName,
        branch: payload.branch,
        weeklyLessonHours: payload.weeklyLessonHours,
        classId: payload.classId,
        className
      });
    }
    setModalOpen(false);
  }

  function handleDelete(row: PrincipalManagedTeacher) {
    if (!window.confirm(`${row.firstName} ${row.lastName} öğretmen kaydını silmek istediğinize emin misiniz?`)) {
      return;
    }
    onDeleteTeacher(row.id);
  }

  async function handleResetPassword(row: PrincipalManagedTeacher) {
    try {
      const pwd = await onResetPassword(row.id);
      setCredential({
        title: "Yeni tek kullanımlık şifre",
        username: row.username,
        password: pwd,
        hint: "Öğretmen bir sonraki girişinde bu şifreyi kullanıp kalıcı şifresini güncellemelidir."
      });
    } catch {
      /* parent shows error */
    }
  }

  return (
    <section className="principal-page-stack principal-teachers-page guidance-data-page">
      <div className="principal-stat-grid principal-teachers-stats" aria-label="Öğretmen istatistikleri">
        <article className="principal-stat-card principal-stat-card--sky">
          <span className="principal-stat-icon" aria-hidden>
            <UserRound size={20} />
          </span>
          <small>Toplam öğretmen</small>
          <strong>{teacherStats.total}</strong>
          <em>Kayıtlı öğretmen sayısı</em>
        </article>
        <article className="principal-stat-card principal-stat-card--amber">
          <span className="principal-stat-icon" aria-hidden>
            <KeyRound size={20} />
          </span>
          <small>İlk giriş bekleyen</small>
          <strong>{teacherStats.pendingFirstLogin}</strong>
          <em>Tek kullanımlık şifre henüz tamamlanmadı</em>
        </article>
        <article className="principal-stat-card principal-stat-card--emerald">
          <span className="principal-stat-icon" aria-hidden>
            <Clock3 size={20} />
          </span>
          <small>Haftalık ders saati</small>
          <strong>{teacherStats.weeklyHoursTotal}</strong>
          <em>Tüm öğretmenler toplamı</em>
        </article>
        <article className="principal-stat-card principal-stat-card--violet">
          <span className="principal-stat-icon" aria-hidden>
            <Tags size={20} />
          </span>
          <small>Farklı branş</small>
          <strong>{teacherStats.branchCount}</strong>
          <em>{teacherStats.withClass} öğretmen sınıf kartına bağlı</em>
        </article>
      </div>

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Öğretmen listesi</h2>
          <div className="guidance-data-card-head-actions">
            <span>{filtered.length} öğretmen</span>
            <button className="primary-action small-action" type="button" onClick={openCreate}>
              <Plus size={16} />
              Öğretmen ekle
            </button>
          </div>
        </header>

        <div className="guidance-data-toolbar">
          <select className="guidance-data-select" value={filterBranch} onChange={(event) => setFilterBranch(event.target.value)} aria-label="Branş filtresi">
            <option value="">Tüm branşlar</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select className="guidance-data-select" value={filterClassId} onChange={(event) => setFilterClassId(event.target.value)} aria-label="Sınıf filtresi">
            <option value="">Tüm sınıflar</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="guidance-data-search">
            <Search size={16} aria-hidden />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, kullanıcı adı, branş veya sınıf ara…" type="search" />
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="guidance-data-empty">{teachers.length === 0 ? "Henüz öğretmen eklenmedi." : "Filtrelere uyan öğretmen yok."}</p>
        ) : (
          <>
            <div className="guidance-data-table-wrap">
              <table className="guidance-data-table principal-teachers-table">
                <thead>
                  <tr>
                    <th>Öğretmen</th>
                    <th>Branş</th>
                    <th>Haftalık saat</th>
                    <th>Sınıf</th>
                    <th>İlk giriş</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="guidance-data-primary">
                          {row.firstName} {row.lastName}
                        </span>
                        <span className="guidance-data-secondary">{row.username}</span>
                      </td>
                      <td>
                        <span className="guidance-data-badge guidance-data-badge--slate">{row.branch || "—"}</span>
                      </td>
                      <td className="guidance-data-num">{row.weeklyLessonHours} sa</td>
                      <td>{row.className ?? "—"}</td>
                      <td>
                        <span
                          className={`guidance-data-badge guidance-data-badge--inline${
                            row.mustChangePassword ? " guidance-data-badge--amber" : " guidance-data-badge--emerald"
                          }`}
                        >
                          {row.mustChangePassword ? (
                            <>
                              <KeyRound size={11} aria-hidden />
                              Şifre bekleniyor
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={11} aria-hidden />
                              Tamamlandı
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="guidance-data-actions principal-teachers-row-actions">
                          <button className="ghost-action" type="button" onClick={() => openEdit(row)} title="Düzenle" aria-label="Düzenle">
                            <Pencil size={15} />
                          </button>
                          <button className="ghost-action" type="button" onClick={() => void handleResetPassword(row)} title="Şifre sıfırla" aria-label="Şifre sıfırla">
                            <RotateCcw size={15} />
                          </button>
                          <button className="ghost-action danger" type="button" onClick={() => handleDelete(row)} title="Sil" aria-label="Sil">
                            <Trash2 size={15} />
                          </button>
                          {row.mustChangePassword ? (
                            <button
                              className="ghost-action"
                              type="button"
                              onClick={() => onMarkFirstLoginComplete(row.id)}
                              title="İlk giriş tamamlandı"
                              aria-label="İlk giriş tamamlandı"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} />
          </>
        )}
      </article>

      <TeacherFormModal
        open={modalOpen}
        mode={modalMode}
        classes={classes}
        initial={editing}
        existingUsernames={existingUsernames}
        onClose={() => setModalOpen(false)}
        onSubmit={(payload) => void handleFormSubmit(payload)}
      />

      <CredentialRevealDialog
        open={credential !== null}
        title={credential?.title ?? ""}
        username={credential?.username ?? ""}
        password={credential?.password ?? ""}
        hint={credential?.hint}
        onClose={() => setCredential(null)}
      />
    </section>
  );
}
