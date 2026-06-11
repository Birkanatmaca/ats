import { KeyRound, Link2, Pencil, Plus, RotateCcw, Search, Unlink } from "lucide-react";
import { useMemo, useState } from "react";
import type { ManagedGuardian } from "../../../lib/api";
import type { ClassStudent } from "../types";
import { TablePagination } from "../../components/TablePagination";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { CredentialRevealDialog } from "../components/CredentialRevealDialog";
import { GuardianFormModal, type GuardianFormPayload } from "../components/GuardianFormModal";
import { LinkGuardianStudentModal } from "../components/LinkGuardianStudentModal";
import "../../guidance/GuidanceDataPage.css";
import "./PrincipalGuardiansPage.css";

const PAGE_SIZE = 10;

export function PrincipalGuardiansPage({
  guardians,
  students,
  onReload,
  onProvision,
  onUpdate,
  onSetStatus,
  onResetPassword,
  onLinkStudent,
  onUnlinkStudent
}: {
  guardians: ManagedGuardian[];
  students: ClassStudent[];
  onReload: () => Promise<void>;
  onProvision: (payload: GuardianFormPayload) => Promise<{ email: string; temporaryPassword: string }>;
  onUpdate: (id: string, payload: Partial<GuardianFormPayload>) => Promise<void>;
  onSetStatus: (id: string, status: "active" | "passive") => Promise<void>;
  onResetPassword: (id: string) => Promise<string>;
  onLinkStudent: (guardianId: string, payload: { studentId: string; relation: string; isPrimary: boolean }) => Promise<void>;
  onUnlinkStudent: (guardianId: string, studentId: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<ManagedGuardian | null>(null);
  const [linkTarget, setLinkTarget] = useState<ManagedGuardian | null>(null);
  const [credential, setCredential] = useState<{ title: string; username: string; password: string; hint?: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = guardians.filter((item) => item.status === "active").length;
    const linkedStudents = guardians.reduce((sum, item) => sum + item.students.length, 0);
    const multiChild = guardians.filter((item) => item.students.length > 1).length;
    return { total: guardians.length, active, linkedStudents, multiChild };
  }, [guardians]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return guardians.filter((item) => {
      const statusMatch = statusFilter === "all" || item.status === statusFilter;
      if (!statusMatch) return false;
      if (!q) return true;
      const blob = `${item.fullName} ${item.email} ${item.phone} ${item.students.map((s) => `${s.studentName} ${s.className}`).join(" ")}`;
      return blob.toLocaleLowerCase("tr-TR").includes(q);
    });
  }, [guardians, search, statusFilter]);

  const filterKey = `${search}|${statusFilter}`;
  const { paginatedRows, page, setPage, totalPages, pageSize, totalItems } = usePaginatedRows(filtered, filterKey, PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (item: ManagedGuardian) => {
    setEditing(item);
    setModalMode("edit");
    setModalOpen(true);
  };

  const onSubmit = async (payload: GuardianFormPayload) => {
    setError(null);
    setMessage(null);
    try {
      if (modalMode === "create") {
        const result = await onProvision(payload);
        setCredential({
          title: "Veli hesabı oluşturuldu",
          username: result.email,
          password: result.temporaryPassword,
          hint: "Geçici şifreyi veli ile güvenli kanaldan paylaşın."
        });
      } else if (editing) {
        await onUpdate(editing.id, payload);
        setMessage("Veli bilgileri güncellendi.");
      }
      setModalOpen(false);
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem tamamlanamadı.");
    }
  };

  return (
    <section className="guidance-page-stack guidance-data-page principal-guardians-page">
      <div className="principal-guardians-hero">
        <div>
          <h1>Veli yönetimi</h1>
          <p>Veli hesapları, öğrenci bağlantıları ve erişim durumu</p>
        </div>
        <button className="primary-action small-action" onClick={openCreate} type="button">
          <Plus size={16} />
          Veli ekle
        </button>
      </div>

      <div className="principal-guardians-stats">
        <article><small>Toplam veli</small><strong>{stats.total}</strong></article>
        <article><small>Aktif</small><strong>{stats.active}</strong></article>
        <article><small>Bağlı öğrenci</small><strong>{stats.linkedStudents}</strong></article>
        <article><small>Çoklu çocuk</small><strong>{stats.multiChild}</strong></article>
      </div>

      {message ? <div className="sa-alert sa-alert--success">{message}</div> : null}
      {error ? <div className="form-error sa-alert">{error}</div> : null}

      <article className="guidance-data-card">
        <header className="guidance-data-card-head">
          <h2>Veli listesi</h2>
          <span>{filtered.length} kayıt</span>
        </header>

        <div className="guidance-data-toolbar">
          <label className="guidance-data-search">
            <Search size={16} />
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Ad, e-posta veya öğrenci ara…" value={search} />
          </label>
          <div className="guidance-data-filter-chips">
            {(["all", "active", "passive"] as const).map((item) => (
              <button className={statusFilter === item ? "active" : ""} key={item} onClick={() => setStatusFilter(item)} type="button">
                {item === "all" ? "Tümü" : item === "active" ? "Aktif" : "Pasif"}
              </button>
            ))}
          </div>
        </div>

        <div className="guidance-data-table-wrap">
          <table className="guidance-data-table principal-guardians-table">
            <thead>
              <tr>
                <th>Veli</th>
                <th>Öğrenciler</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="guidance-data-primary">{item.fullName}</span>
                    <span className="guidance-data-secondary">{item.email}</span>
                    {item.phone ? <span className="guidance-data-secondary">{item.phone}</span> : null}
                  </td>
                  <td>
                    {item.students.length === 0 ? (
                      <span className="guidance-data-secondary">Bağlı öğrenci yok</span>
                    ) : (
                      item.students.map((student) => (
                        <div className="principal-guardian-student-chip" key={`${item.id}-${student.studentId}`}>
                          <span>
                            {student.studentName} · {student.className}
                            {student.isPrimary ? " · birincil" : ""}
                          </span>
                          <button
                            aria-label="Bağlantıyı kaldır"
                            className="ghost-action icon-action"
                            onClick={() => void onUnlinkStudent(item.id, student.studentId).then(() => onReload())}
                            type="button"
                          >
                            <Unlink size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </td>
                  <td>
                    <span className={item.status === "active" ? "guidance-data-badge guidance-data-badge--emerald" : "guidance-data-badge guidance-data-badge--slate"}>
                      {item.status === "active" ? "Aktif" : "Pasif"}
                    </span>
                    {item.mustChangePassword ? <small>İlk giriş bekliyor</small> : null}
                  </td>
                  <td>
                    <div className="principal-guardian-actions">
                      <button className="ghost-action small-action" onClick={() => openEdit(item)} type="button">
                        <Pencil size={14} />
                        Düzenle
                      </button>
                      <button className="ghost-action small-action" onClick={() => setLinkTarget(item)} type="button">
                        <Link2 size={14} />
                        Öğrenci bağla
                      </button>
                      <button
                        className="ghost-action small-action"
                        onClick={async () => {
                          const temp = await onResetPassword(item.id);
                          setCredential({
                            title: "Veli şifresi sıfırlandı",
                            username: item.email,
                            password: temp,
                            hint: "Yeni geçici şifreyi veli ile paylaşın."
                          });
                        }}
                        type="button"
                      >
                        <KeyRound size={14} />
                        Şifre
                      </button>
                      <button
                        className="ghost-action small-action"
                        onClick={() => void onSetStatus(item.id, item.status === "active" ? "passive" : "active").then(() => onReload())}
                        type="button"
                      >
                        <RotateCcw size={14} />
                        {item.status === "active" ? "Pasifleştir" : "Aktifleştir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination onPageChange={setPage} page={page} pageSize={pageSize} totalItems={totalItems} totalPages={totalPages} />
      </article>

      <GuardianFormModal
        initial={editing}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
        open={modalOpen}
        students={students}
      />

      <LinkGuardianStudentModal
        guardian={linkTarget}
        onClose={() => setLinkTarget(null)}
        onSubmit={async (payload) => {
          if (!linkTarget) return;
          await onLinkStudent(linkTarget.id, payload);
          setLinkTarget(null);
          await onReload();
        }}
        open={Boolean(linkTarget)}
        students={students}
      />

      <CredentialRevealDialog
        hint={credential?.hint}
        onClose={() => setCredential(null)}
        open={Boolean(credential)}
        password={credential?.password ?? ""}
        title={credential?.title ?? ""}
        username={credential?.username ?? ""}
      />
    </section>
  );
}
