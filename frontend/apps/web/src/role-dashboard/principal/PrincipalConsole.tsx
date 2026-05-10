import { GraduationCap, Loader2, LogOut, School } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { AuthSession } from "../../lib/api";
import { api } from "../../lib/api";
import { principalTabs } from "./navTabs";
import { PrincipalAnnouncementsPage } from "./pages/PrincipalAnnouncementsPage";
import { PrincipalAttendancePage } from "./pages/PrincipalAttendancePage";
import { PrincipalClassDetailPage } from "./pages/PrincipalClassDetailPage";
import { PrincipalClassStudentsPage } from "./pages/PrincipalClassStudentsPage";
import { PrincipalClassesPage } from "./pages/PrincipalClassesPage";
import { PrincipalOperationsPage } from "./pages/PrincipalOperationsPage";
import { PrincipalOverviewPage } from "./pages/PrincipalOverviewPage";
import { PrincipalSchedulePage } from "./pages/PrincipalSchedulePage";
import { PrincipalStudentsPage } from "./pages/PrincipalStudentsPage";
import { PrincipalTeachersPage } from "./pages/PrincipalTeachersPage";
import type { TeacherFormPayload } from "./components/TeacherFormModal";
import { generateOneTimePassword } from "./teacherCredentials";
import type { ClassSection, ClassStudent, PrincipalConsoleData, PrincipalManagedTeacher, SchoolClass } from "./types";
import "./PrincipalConsole.css";

function parsePrincipalTeachers(raw: string | null): PrincipalManagedTeacher[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && "id" in row && "username" in row))
      .map((row) => ({
        ...(row as PrincipalManagedTeacher),
        mustChangePassword: Boolean((row as PrincipalManagedTeacher).mustChangePassword)
      }));
  } catch {
    return [];
  }
}

export function PrincipalConsole({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [data, setData] = useState<PrincipalConsoleData>({ announcements: [] });
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const storageKey = `principal.class-management.${session.principal.tenantId}`;
  const teachersStorageKey = `principal.teachers.${session.principal.tenantId}`;
  const [managedTeachers, setManagedTeachers] = useState<PrincipalManagedTeacher[]>(() =>
    typeof window !== "undefined" ? parsePrincipalTeachers(window.localStorage.getItem(`principal.teachers.${session.principal.tenantId}`)) : []
  );

  const activePath = location.pathname.replace(/^\/dashboard\/?/, "");
  const activeTab = activePath.split("/")[0] || "overview";

  async function load() {
    setLoading(true);
    setError(null);
    const [tenant, summary, schedule, announcements] = await Promise.allSettled([api.tenant(), api.dashboard(), api.schedule(), api.announcements()]);

    setData({
      tenant: tenant.status === "fulfilled" ? tenant.value : undefined,
      summary: summary.status === "fulfilled" ? summary.value : undefined,
      schedule: schedule.status === "fulfilled" ? schedule.value : undefined,
      announcements: announcements.status === "fulfilled" ? announcements.value : []
    });

    const failed = [tenant, summary, schedule, announcements].some((result) => result.status === "rejected");
    if (failed) {
      setError("Bazı müdür paneli verileri alınamadı; erişebildiğin alanlar listeleniyor.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [session.principal.userId]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        classes?: SchoolClass[];
        sections?: ClassSection[];
        students?: ClassStudent[];
      };
      setClasses(parsed.classes ?? []);
      setSections(parsed.sections ?? []);
      setStudents(parsed.students ?? []);
    } catch {
      setClasses([]);
      setSections([]);
      setStudents([]);
    }
  }, [storageKey]);

  useEffect(() => {
    setManagedTeachers(parsePrincipalTeachers(window.localStorage.getItem(teachersStorageKey)));
  }, [teachersStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(teachersStorageKey, JSON.stringify(managedTeachers));
  }, [managedTeachers, teachersStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        classes,
        sections,
        students
      })
    );
  }, [classes, sections, students, storageKey]);

  function addClass(payload: { name: string }) {
    const classItem: SchoolClass = {
      id: crypto.randomUUID(),
      name: payload.name,
      createdAt: new Date().toISOString()
    };
    setClasses((current) => [classItem, ...current]);
  }

  function addSection(payload: { classId: string; name: string; gradeLevel: string; advisor: string; capacity: number }) {
    const sectionItem: ClassSection = {
      id: crypto.randomUUID(),
      classId: payload.classId,
      name: payload.name,
      gradeLevel: payload.gradeLevel,
      advisor: payload.advisor,
      capacity: payload.capacity,
      createdAt: new Date().toISOString()
    };
    setSections((current) => [sectionItem, ...current]);
  }

  function deleteSection(sectionId: string) {
    setSections((current) => current.filter((item) => item.id !== sectionId));
    setStudents((current) => current.filter((item) => item.sectionId !== sectionId));
  }

  function addStudent(payload: Omit<ClassStudent, "id" | "createdAt">) {
    const student: ClassStudent = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setStudents((current) => [student, ...current]);
  }

  function addManagedTeacher(payload: TeacherFormPayload) {
    const className = payload.classId ? classes.find((c) => c.id === payload.classId)?.name ?? null : null;
    const row: PrincipalManagedTeacher = {
      id: crypto.randomUUID(),
      firstName: payload.firstName,
      lastName: payload.lastName,
      branch: payload.branch,
      weeklyLessonHours: payload.weeklyLessonHours,
      classId: payload.classId,
      className,
      username: payload.username,
      mustChangePassword: true,
      createdAt: new Date().toISOString()
    };
    setManagedTeachers((current) => [row, ...current]);
  }

  function updateManagedTeacher(
    id: string,
    payload: {
      firstName: string;
      lastName: string;
      branch: string;
      weeklyLessonHours: number;
      classId: string | null;
      className: string | null;
    }
  ) {
    const now = new Date().toISOString();
    setManagedTeachers((current) =>
      current.map((item) => (item.id === id ? { ...item, ...payload, updatedAt: now } : item))
    );
  }

  function deleteManagedTeacher(id: string) {
    setManagedTeachers((current) => current.filter((item) => item.id !== id));
  }

  function resetManagedTeacherPassword(id: string): string {
    const pwd = generateOneTimePassword();
    const now = new Date().toISOString();
    setManagedTeachers((current) =>
      current.map((item) => (item.id === id ? { ...item, mustChangePassword: true, updatedAt: now } : item))
    );
    return pwd;
  }

  function markTeacherFirstLoginComplete(id: string) {
    const now = new Date().toISOString();
    setManagedTeachers((current) =>
      current.map((item) => (item.id === id ? { ...item, mustChangePassword: false, updatedAt: now } : item))
    );
  }

  return (
    <div className="admin-shell principal-console">
      <header className="admin-navbar">
        <div className="navbar-brand">
          <div className="admin-mark">
            <GraduationCap size={22} />
          </div>
          <div>
            <strong>ÖTS</strong>
            <span>{data.tenant?.name ?? "Müdür paneli"}</span>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="navbar-profile" aria-label="Profil">
            <div className="profile-avatar">{session.principal.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</div>
            <div className="navbar-profile-text">
              <strong>{session.principal.name}</strong>
              <span>{roleLabel(session.principal.role)}</span>
            </div>
          </div>
          <button className="ghost-action navbar-logout" type="button" onClick={onLogout}>
            <LogOut size={17} />
            Çıkış
          </button>
        </div>
      </header>

      <aside className="admin-sidebar">
        <nav className="admin-nav" aria-label="Müdür menüsü">
          {principalTabs.map((tab) => (
            <NavLink className={({ isActive }) => (isActive ? "nav-button active" : "nav-button")} key={tab.id} to={`/dashboard/${tab.id}`} end={tab.id !== "classes"}>
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="developer-note">
          <School size={18} />
          <div>
            <strong>Müdür görünümü</strong>
            <span>Operasyon, yoklama ve sınıf denetimi.</span>
          </div>
        </div>
      </aside>

      <main className={`admin-workspace ${activeTab}-workspace`}>
        <div className="sa-main">
          {error && <div className="form-error workspace-error sa-alert">{error}</div>}
          {loading && (
            <div className="loading-line">
              <Loader2 className="spin" size={18} />
              Müdür paneli hazırlanıyor
            </div>
          )}

          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<PrincipalOverviewPage data={data} />} />
            <Route
              path="teachers"
              element={
                <PrincipalTeachersPage
                  teachers={managedTeachers}
                  classes={classes}
                  onAddTeacher={addManagedTeacher}
                  onUpdateTeacher={updateManagedTeacher}
                  onDeleteTeacher={deleteManagedTeacher}
                  onResetPassword={resetManagedTeacherPassword}
                  onMarkFirstLoginComplete={markTeacherFirstLoginComplete}
                />
              }
            />
            <Route path="students" element={<PrincipalStudentsPage classes={classes} sections={sections} students={students} />} />
            <Route path="schedule" element={<PrincipalSchedulePage data={data} />} />
            <Route path="attendance" element={<PrincipalAttendancePage data={data} />} />
            <Route path="classes" element={<PrincipalClassesPage classes={classes} sections={sections} students={students} onAddClass={addClass} />} />
            <Route
              path="classes/:classId/:sectionId"
              element={<PrincipalClassStudentsPage classes={classes} sections={sections} students={students} onAddStudent={addStudent} />}
            />
            <Route
              path="classes/:classId"
              element={
                <PrincipalClassDetailPage
                  classes={classes}
                  sections={sections}
                  students={students}
                  onAddSection={addSection}
                  onDeleteSection={deleteSection}
                />
              }
            />
            <Route path="operations" element={<PrincipalOperationsPage data={data} />} />
            <Route path="announcements" element={<PrincipalAnnouncementsPage data={data} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
