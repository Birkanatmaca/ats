import { GraduationCap, Loader2, LogOut, School } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { AuthSession, UserAccount } from "../../lib/api";
import { api } from "../../lib/api";
import { createClientId } from "../../lib/id";
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
import type { StudentFormPayload } from "./components/StudentFormModal";
import type { TeacherFormPayload } from "./components/TeacherFormModal";
import { generateOneTimePassword } from "./teacherCredentials";
import type { ClassSection, ClassStudent, PrincipalConsoleData, PrincipalManagedTeacher, SchoolClass } from "./types";
import "../../styles/super-admin-app.css";
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

function teacherAccountToManagedTeacher(user: UserAccount): PrincipalManagedTeacher {
  const tokens = user.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = tokens.shift() ?? user.fullName;
  const lastName = tokens.join(" ");
  return {
    id: user.id,
    firstName,
    lastName,
    branch: "",
    weeklyLessonHours: 0,
    classId: null,
    className: null,
    username: user.email,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt
  };
}

function mergeTeacherOptions(dbTeachers: PrincipalManagedTeacher[], localTeachers: PrincipalManagedTeacher[]) {
  const seen = new Set<string>();
  const merged: PrincipalManagedTeacher[] = [];
  for (const teacher of [...dbTeachers, ...localTeachers]) {
    const key = (teacher.username || teacher.id).toLocaleLowerCase("tr-TR");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(teacher);
  }
  return merged;
}

export function PrincipalConsole({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [data, setData] = useState<PrincipalConsoleData>({ announcements: [] });
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [directoryTeachers, setDirectoryTeachers] = useState<PrincipalManagedTeacher[]>([]);
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
  const sectionTeacherOptions = useMemo(() => mergeTeacherOptions(directoryTeachers, managedTeachers), [directoryTeachers, managedTeachers]);

  function applyRosterFromApi(roster: {
    classes: SchoolClass[];
    sections: ClassSection[];
    students: ClassStudent[];
  }) {
    if (roster.students.length === 0 && roster.classes.length === 0) {
      return;
    }
    setClasses(roster.classes);
    setSections(roster.sections);
    setStudents(roster.students);
  }

  function loadClassManagementFromStorage() {
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
  }

  async function load() {
    setLoading(true);
    setError(null);
    const [tenant, summary, schedule, announcements, teacherAccounts, roster] = await Promise.allSettled([
      api.tenant(),
      api.dashboard(),
      api.schedule(),
      api.announcements(),
      api.principalTeachers(),
      api.principalRoster()
    ]);

    setData({
      tenant: tenant.status === "fulfilled" ? tenant.value : undefined,
      summary: summary.status === "fulfilled" ? summary.value : undefined,
      schedule: schedule.status === "fulfilled" ? schedule.value : undefined,
      announcements: announcements.status === "fulfilled" ? (announcements.value ?? []) : []
    });

    if (teacherAccounts.status === "fulfilled") {
      setDirectoryTeachers(teacherAccounts.value.map(teacherAccountToManagedTeacher));
    }

    if (roster.status === "fulfilled") {
      const mapped = {
        classes: roster.value.classes.map((item) => ({
          id: item.id,
          name: item.name,
          createdAt: item.createdAt
        })),
        sections: roster.value.sections.map((item) => ({
          id: item.id,
          classId: item.classId,
          name: item.name,
          gradeLevel: item.gradeLevel,
          advisor: item.advisor,
          capacity: item.capacity,
          createdAt: item.createdAt
        })),
        students: roster.value.students.map((item) => ({
          id: item.id,
          classId: item.classId,
          sectionId: item.sectionId,
          schoolNumber: item.schoolNumber,
          firstName: item.firstName,
          lastName: item.lastName,
          gender: item.gender,
          birthDate: item.birthDate,
          guardianName: item.guardianName,
          guardianPhone: item.guardianPhone,
          status: (item.status === "passive" ? "passive" : "active") as ClassStudent["status"],
          createdAt: item.createdAt
        }))
      };
      if (mapped.students.length > 0 || mapped.classes.length > 0) {
        applyRosterFromApi(mapped);
      } else {
        loadClassManagementFromStorage();
      }
    } else {
      loadClassManagementFromStorage();
    }

    const failed = [tenant, summary, schedule, announcements, teacherAccounts, roster].some((result) => result.status === "rejected");
    if (failed) {
      setError("Bazı müdür paneli verileri alınamadı; erişebildiğin alanlar listeleniyor.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [session.principal.userId]);

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
      id: createClientId("class"),
      name: payload.name,
      createdAt: new Date().toISOString()
    };
    setClasses((current) => [classItem, ...current]);
  }

  function deleteClass(classId: string) {
    setClasses((current) => current.filter((item) => item.id !== classId));
    setSections((current) => current.filter((item) => item.classId !== classId));
    setStudents((current) => current.filter((item) => item.classId !== classId));
    setManagedTeachers((current) =>
      current.map((item) => (item.classId === classId ? { ...item, classId: null, className: null } : item))
    );
  }

  function addSection(payload: { classId: string; name: string; gradeLevel: string; advisor: string; capacity: number }) {
    const sectionItem: ClassSection = {
      id: createClientId("section"),
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
      id: createClientId("student"),
      createdAt: new Date().toISOString()
    };
    setStudents((current) => [student, ...current]);
  }

  function updateStudent(id: string, payload: StudentFormPayload) {
    const now = new Date().toISOString();
    setStudents((current) => current.map((item) => (item.id === id ? { ...item, ...payload, updatedAt: now } : item)));
  }

  function deleteStudent(id: string) {
    setStudents((current) => current.filter((item) => item.id !== id));
  }

  function assignStudentsToSection(studentIds: string[], classId: string, sectionId: string) {
    const selected = new Set(studentIds);
    const now = new Date().toISOString();
    setStudents((current) =>
      current.map((item) => (selected.has(item.id) ? { ...item, classId, sectionId, updatedAt: now } : item))
    );
  }

  function addManagedTeacher(payload: TeacherFormPayload) {
    const className = payload.classId ? classes.find((c) => c.id === payload.classId)?.name ?? null : null;
    const row: PrincipalManagedTeacher = {
      id: createClientId("teacher"),
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
                  teachers={sectionTeacherOptions}
                  classes={classes}
                  onAddTeacher={addManagedTeacher}
                  onUpdateTeacher={updateManagedTeacher}
                  onDeleteTeacher={deleteManagedTeacher}
                  onResetPassword={resetManagedTeacherPassword}
                  onMarkFirstLoginComplete={markTeacherFirstLoginComplete}
                />
              }
            />
            <Route
              path="students"
              element={
                <PrincipalStudentsPage
                  classes={classes}
                  sections={sections}
                  students={students}
                  onAddStudent={addStudent}
                  onUpdateStudent={updateStudent}
                  onDeleteStudent={deleteStudent}
                />
              }
            />
            <Route
              path="schedule"
              element={
                <PrincipalSchedulePage
                  mode="overview"
                  data={data}
                  classes={classes}
                  sections={sections}
                  students={students}
                  teachers={sectionTeacherOptions}
                  storageKey={`principal.schedule-builder.${session.principal.tenantId}`}
                />
              }
            />
            <Route
              path="schedule/builder"
              element={
                <PrincipalSchedulePage
                  mode="builder"
                  data={data}
                  classes={classes}
                  sections={sections}
                  students={students}
                  teachers={sectionTeacherOptions}
                  storageKey={`principal.schedule-builder.${session.principal.tenantId}`}
                />
              }
            />
            <Route path="attendance" element={<PrincipalAttendancePage data={data} classes={classes} sections={sections} students={students} />} />
            <Route
              path="classes"
              element={<PrincipalClassesPage classes={classes} sections={sections} students={students} onAddClass={addClass} onDeleteClass={deleteClass} />}
            />
            <Route
              path="classes/:classId/:sectionId"
              element={
                <PrincipalClassStudentsPage
                  classes={classes}
                  sections={sections}
                  students={students}
                  onAssignStudentsToSection={assignStudentsToSection}
                />
              }
            />
            <Route
              path="classes/:classId"
              element={
                <PrincipalClassDetailPage
                  classes={classes}
                  sections={sections}
                  students={students}
                  teachers={sectionTeacherOptions}
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
