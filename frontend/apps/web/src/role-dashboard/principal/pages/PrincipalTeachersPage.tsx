import { BookOpen, CheckCircle2, Clock3, KeyRound, Pencil, Plus, RotateCcw, Search, Tags, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { PrincipalManagedTeacher, SchoolClass } from "../types";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { CredentialRevealDialog } from "../components/CredentialRevealDialog";
import { TeacherFormModal, type TeacherFormPayload } from "../components/TeacherFormModal";
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
    return teachers.filter((t) => {
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
    });
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
    <section className="principal-page-stack principal-teachers-page">
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

      <div className="principal-teachers-toolbar">
        <div className="principal-teachers-toolbar-text">
          <BookOpen size={20} aria-hidden />
          <h2>Öğretmen listesi</h2>
        </div>
        <button className="primary-action principal-teachers-add" type="button" onClick={openCreate}>
          <Plus size={18} />
          Öğretmen ekle
        </button>
      </div>

      <div className="principal-teachers-filters">
        <label className="principal-teachers-search">
          <Search size={17} aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, soyad, kullanıcı adı, branş veya sınıf ara…" type="search" />
        </label>
        <select className="principal-teachers-select" value={filterBranch} onChange={(event) => setFilterBranch(event.target.value)} aria-label="Branş filtresi">
          <option value="">Tüm branşlar</option>
          {branchOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select className="principal-teachers-select" value={filterClassId} onChange={(event) => setFilterClassId(event.target.value)} aria-label="Sınıf filtresi">
          <option value="">Tüm sınıflar</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <article className="principal-surface-card principal-teachers-table-card">
        {filtered.length === 0 ? (
          <p className="empty-text">{teachers.length === 0 ? "Henüz öğretmen eklenmedi." : "Filtrelere uyan öğretmen yok."}</p>
        ) : (
          <>
            <div className="principal-table-wrap">
              <table className="principal-table principal-teachers-table">
                <thead>
                  <tr>
                    <th>Ad soyad</th>
                    <th>Branş</th>
                    <th>Haftalık ders saati</th>
                    <th>Sınıf</th>
                    <th>Kullanıcı adı</th>
                    <th>İlk giriş</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="principal-table-name">
                          <UserRound size={16} aria-hidden />
                          {row.firstName} {row.lastName}
                        </span>
                      </td>
                      <td>{row.branch}</td>
                      <td>{row.weeklyLessonHours}</td>
                      <td>{row.className ?? "—"}</td>
                      <td>
                        <code className="principal-teachers-username">{row.username}</code>
                      </td>
                      <td>
                        <span className={`principal-teachers-badge${row.mustChangePassword ? " principal-teachers-badge--pending" : " principal-teachers-badge--ok"}`}>
                          {row.mustChangePassword ? "Şifre bekleniyor" : "Tamamlandı"}
                        </span>
                      </td>
                      <td>
                        <div className="principal-table-actions principal-teachers-actions">
                          <button className="ghost-action" type="button" onClick={() => openEdit(row)} title="Düzenle">
                            <Pencil size={16} />
                          </button>
                          <button className="ghost-action" type="button" onClick={() => handleResetPassword(row)} title="Şifre sıfırla">
                            <RotateCcw size={16} />
                          </button>
                          <button className="ghost-action danger" type="button" onClick={() => handleDelete(row)} title="Sil">
                            <Trash2 size={16} />
                          </button>
                          {row.mustChangePassword ? (
                            <button
                              className="ghost-action"
                              type="button"
                              onClick={() => onMarkFirstLoginComplete(row.id)}
                              title="İlk giriş ve şifre değişikliği tamamlandı (kayıt güncelle)"
                            >
                              <CheckCircle2 size={16} />
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
