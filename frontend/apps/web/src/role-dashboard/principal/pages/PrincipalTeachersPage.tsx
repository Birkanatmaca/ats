import { CheckCircle2, Clock3, KeyRound, Pencil, Plus, RotateCcw, Search, Tags, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import type { PrincipalManagedTeacher, SchoolClass } from "../types";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { CredentialRevealDialog } from "../components/CredentialRevealDialog";
import { TeacherFormModal, type TeacherFormPayload } from "../components/TeacherFormModal";
import "./PrincipalTeachersPage.css";

function initials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toLocaleUpperCase("tr-TR") || "?";
}

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
  const [pendingOnly, setPendingOnly] = useState(false);
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
        if (pendingOnly && !t.mustChangePassword) {
          return false;
        }
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
  }, [teachers, search, filterBranch, filterClassId, pendingOnly]);

  const filterKey = `${search}|${filterBranch}|${filterClassId}|${pendingOnly}`;
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
    <section className="ptc">
      <header className="ptc-hero">
        <div>
          <p className="ptc-kicker">Okul</p>
          <h1>Öğretmenler</h1>
          <p>Kadroyu yönetin, ilk girişi izleyin ve tek kullanımlık şifreleri güvenle iletin.</p>
        </div>
        <button className="ptc-add" type="button" onClick={openCreate} disabled={submitting}>
          <Plus size={16} />
          Öğretmen ekle
        </button>
      </header>

      <div className="ptc-kpi-grid">
        <article className="ptc-kpi">
          <div className="ptc-kpi-icon">
            <UserRound size={18} />
          </div>
          <span>Toplam öğretmen</span>
          <strong>{teacherStats.total}</strong>
          <small>Kayıtlı kadro</small>
        </article>
        <article className="ptc-kpi">
          <div className="ptc-kpi-icon ptc-kpi-icon--amber">
            <KeyRound size={18} />
          </div>
          <span>İlk giriş bekleyen</span>
          <strong>{teacherStats.pendingFirstLogin}</strong>
          <small>Tek kullanımlık şifre açık</small>
        </article>
        <article className="ptc-kpi">
          <div className="ptc-kpi-icon ptc-kpi-icon--teal">
            <Clock3 size={18} />
          </div>
          <span>Haftalık ders saati</span>
          <strong>{teacherStats.weeklyHoursTotal}</strong>
          <small>Tüm öğretmenler toplamı</small>
        </article>
        <article className="ptc-kpi">
          <div className="ptc-kpi-icon ptc-kpi-icon--violet">
            <Tags size={18} />
          </div>
          <span>Farklı branş</span>
          <strong>{teacherStats.branchCount}</strong>
          <small>{teacherStats.withClass} öğretmen sınıfa bağlı</small>
        </article>
      </div>

      <article className="ptc-card">
        <div className="ptc-toolbar">
          <label className="ptc-search">
            <Search size={16} aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ad, kullanıcı adı, branş veya sınıf ara…"
              type="search"
            />
          </label>
          <select className="ptc-select" value={filterBranch} onChange={(event) => setFilterBranch(event.target.value)} aria-label="Branş filtresi">
            <option value="">Tüm branşlar</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select className="ptc-select" value={filterClassId} onChange={(event) => setFilterClassId(event.target.value)} aria-label="Sınıf filtresi">
            <option value="">Tüm sınıflar</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            className={`ptc-chip${pendingOnly ? " is-active" : ""}`}
            type="button"
            onClick={() => setPendingOnly((current) => !current)}
          >
            İlk giriş bekleyen
          </button>
          <span className="ptc-count">{filtered.length} öğretmen</span>
        </div>

        {filtered.length === 0 ? (
          <p className="ptc-empty">{teachers.length === 0 ? "Henüz öğretmen eklenmedi." : "Filtrelere uyan öğretmen yok."}</p>
        ) : (
          <>
            <div className="ptc-table-wrap">
              <table className="ptc-table">
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
                        <NavLink className="ptc-person" to={`/dashboard/teachers/${row.id}`}>
                          <span className="ptc-avatar">{initials(row.firstName, row.lastName)}</span>
                          <div>
                            <strong>
                              {row.firstName} {row.lastName}
                            </strong>
                            <small>{row.username}</small>
                          </div>
                        </NavLink>
                      </td>
                      <td>
                        <span className="ptc-badge">{row.branch || "—"}</span>
                      </td>
                      <td className="ptc-hours">{row.weeklyLessonHours} sa</td>
                      <td>{row.className ?? "—"}</td>
                      <td>
                        <span className={`ptc-status${row.mustChangePassword ? " ptc-status--wait" : " ptc-status--ok"}`}>
                          {row.mustChangePassword ? (
                            <>
                              <KeyRound size={12} aria-hidden />
                              Şifre bekleniyor
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} aria-hidden />
                              Tamamlandı
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="ptc-actions">
                          <button className="ptc-icon-btn" type="button" onClick={() => openEdit(row)} title="Düzenle" aria-label="Düzenle">
                            <Pencil size={15} />
                          </button>
                          <button
                            className="ptc-icon-btn"
                            type="button"
                            onClick={() => void handleResetPassword(row)}
                            title="Şifre sıfırla"
                            aria-label="Şifre sıfırla"
                          >
                            <RotateCcw size={15} />
                          </button>
                          <button className="ptc-icon-btn ptc-icon-btn--danger" type="button" onClick={() => handleDelete(row)} title="Sil" aria-label="Sil">
                            <Trash2 size={15} />
                          </button>
                          {row.mustChangePassword ? (
                            <button
                              className="ptc-icon-btn"
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
