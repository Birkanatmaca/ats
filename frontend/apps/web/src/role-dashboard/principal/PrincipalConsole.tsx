import { GraduationCap, Loader2, LogOut, School } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { AuthSession, PrincipalSchoolRoster, SchoolTeacherRecord, UserAccount } from "../../lib/api";
import { api } from "../../lib/api";
import { NotificationBell } from "../components/NotificationBell";
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
import type { ClassSection, ClassStudent, PrincipalConsoleData, PrincipalManagedTeacher, SchoolClass } from "./types";
import "../../styles/super-admin-app.css";
import "./PrincipalConsole.css";

function mergeTeacherRows(accounts: UserAccount[], records: SchoolTeacherRecord[]): PrincipalManagedTeacher[] {
  const recordByUserId = new Map(records.map((record) => [record.userId, record]));
  return accounts.map((user) => {
    const record = recordByUserId.get(user.id);
    const tokens = user.fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = tokens.shift() ?? user.fullName;
    const lastName = tokens.join(" ");
    return {
      id: record?.id ?? user.id,
      userId: user.id,
      firstName,
      lastName,
      branch: record?.title ?? "",
      weeklyLessonHours: 0,
      classId: null,
      className: null,
      username: user.email,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt
    };
  });
}

function mapRoster(roster: PrincipalSchoolRoster) {
  return {
    classes: roster.classes.map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt
    })),
    sections: roster.sections.map((item) => ({
      id: item.id,
      classId: item.classId,
      name: item.name,
      gradeLevel: item.gradeLevel,
      advisor: item.advisor,
      capacity: item.capacity,
      createdAt: item.createdAt
    })),
    students: roster.students.map((item) => ({
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
}

export function PrincipalConsole({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [data, setData] = useState<PrincipalConsoleData>({ announcements: [] });
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [teachers, setTeachers] = useState<PrincipalManagedTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const location = useLocation();

  const activePath = location.pathname.replace(/^\/dashboard\/?/, "");
  const activeTab = activePath.split("/")[0] || "overview";
  const sectionTeacherOptions = useMemo(() => teachers, [teachers]);

  const reloadTeachers = useCallback(async () => {
    const [accounts, records] = await Promise.allSettled([api.principalTeachers(), api.listTeachers()]);
    if (accounts.status === "fulfilled") {
      const teacherRecords = records.status === "fulfilled" ? (records.value ?? []) : [];
      setTeachers(mergeTeacherRows(accounts.value, teacherRecords));
    }
  }, []);

  const reloadRoster = useCallback(async () => {
    setRosterError(null);
    try {
      const roster = await api.principalRoster();
      const mapped = mapRoster(roster);
      setClasses(mapped.classes);
      setSections(mapped.sections);
      setStudents(mapped.students);
    } catch (loadError) {
      setRosterError(loadError instanceof Error ? loadError.message : "Okul listesi alınamadı.");
    }
  }, []);

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
      const teacherRecords = await api.listTeachers().catch(() => []);
      setTeachers(mergeTeacherRows(teacherAccounts.value, teacherRecords ?? []));
    }

    if (roster.status === "fulfilled") {
      const mapped = mapRoster(roster.value);
      setClasses(mapped.classes);
      setSections(mapped.sections);
      setStudents(mapped.students);
    } else {
      setRosterError("Sınıf ve öğrenci listesi alınamadı.");
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

  async function refreshAnnouncements() {
    try {
      const announcements = await api.announcements();
      setData((current) => ({ ...current, announcements }));
    } catch {
      setError("Duyurular yenilenemedi.");
    }
  }

  async function refreshSchedule() {
    try {
      const schedule = await api.schedule();
      setData((current) => ({ ...current, schedule }));
    } catch {
      setError("Ders programı yenilenemedi.");
    }
  }

  async function addClass(payload: { name: string }) {
    setRosterError(null);
    try {
      await api.createClass({ name: payload.name });
      await reloadRoster();
    } catch (createError) {
      setRosterError(createError instanceof Error ? createError.message : "Sınıf oluşturulamadı.");
    }
  }

  async function deleteClass(classId: string) {
    setClasses((current) => current.filter((item) => item.id !== classId));
    setSections((current) => current.filter((item) => item.classId !== classId));
    setStudents((current) => current.filter((item) => item.classId !== classId));
  }

  function addSection(payload: { classId: string; name: string; gradeLevel: string; advisor: string; capacity: number }) {
    const sectionItem: ClassSection = {
      id: `section-${payload.classId}-${payload.name}`,
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

  async function addStudent(payload: Omit<ClassStudent, "id" | "createdAt">) {
    setRosterError(null);
    try {
      await api.createStudent({
        firstName: payload.firstName,
        lastName: payload.lastName,
        schoolNumber: payload.schoolNumber,
        classId: payload.classId,
        birthDate: payload.birthDate,
        gender: payload.gender,
        status: payload.status,
        guardianName: payload.guardianName,
        guardianPhone: payload.guardianPhone
      });
      await reloadRoster();
    } catch (createError) {
      setRosterError(createError instanceof Error ? createError.message : "Öğrenci oluşturulamadı.");
    }
  }

  async function updateStudent(id: string, payload: StudentFormPayload) {
    setRosterError(null);
    try {
      await api.patchStudent(id, {
        firstName: payload.firstName,
        lastName: payload.lastName,
        schoolNumber: payload.schoolNumber,
        classId: payload.classId,
        birthDate: payload.birthDate,
        gender: payload.gender,
        status: payload.status,
        guardianName: payload.guardianName,
        guardianPhone: payload.guardianPhone
      });
      await reloadRoster();
    } catch (updateError) {
      setRosterError(updateError instanceof Error ? updateError.message : "Öğrenci güncellenemedi.");
    }
  }

  async function deleteStudent(id: string) {
    setRosterError(null);
    try {
      await api.patchStudent(id, { status: "passive" });
      await reloadRoster();
    } catch (deleteError) {
      setRosterError(deleteError instanceof Error ? deleteError.message : "Öğrenci pasifleştirilemedi.");
    }
  }

  async function assignStudentsToSection(studentIds: string[], classId: string, _sectionId: string) {
    setRosterError(null);
    const startsOn = new Date().toISOString().slice(0, 10);
    try {
      for (const studentId of studentIds) {
        await api.assignClassStudent(classId, { studentId, startsOn });
      }
      await reloadRoster();
    } catch (assignError) {
      setRosterError(assignError instanceof Error ? assignError.message : "Öğrenci şubeye atanamadı.");
    }
  }

  async function addManagedTeacher(payload: TeacherFormPayload) {
    setRosterError(null);
    try {
      const email = payload.username.includes("@") ? payload.username : `${payload.username}@ots.local`;
      const result = await api.provisionTeacher({
        email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        title: payload.branch
      });
      await reloadTeachers();
      return result.temporaryPassword;
    } catch (createError) {
      setRosterError(createError instanceof Error ? createError.message : "Öğretmen oluşturulamadı.");
      throw createError;
    }
  }

  async function updateManagedTeacher(
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
    setRosterError(null);
    try {
      await api.updateTeacher(id, { title: payload.branch });
      await reloadTeachers();
    } catch (updateError) {
      setRosterError(updateError instanceof Error ? updateError.message : "Öğretmen güncellenemedi.");
    }
  }

  function deleteManagedTeacher(_id: string) {
    setRosterError("Öğretmen silme henüz API üzerinden desteklenmiyor. Süper admin panelinden pasifleştirebilirsiniz.");
  }

  async function resetManagedTeacherPassword(id: string): Promise<string> {
    setRosterError(null);
    try {
      const result = await api.resetTeacherPassword(id);
      await reloadTeachers();
      return result.temporaryPassword;
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : "Şifre sıfırlanamadı.";
      setRosterError(message);
      throw resetError;
    }
  }

  async function markTeacherFirstLoginComplete(_id: string) {
    await reloadTeachers();
  }

  const workspaceError = error ?? rosterError;

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
          <NotificationBell />
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
          {workspaceError && <div className="form-error workspace-error sa-alert">{workspaceError}</div>}
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
                  onImportComplete={() => void reloadRoster()}
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
                  onScheduleChange={() => void refreshSchedule()}
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
                  onScheduleChange={() => void refreshSchedule()}
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
            <Route
              path="announcements"
              element={<PrincipalAnnouncementsPage data={data} classes={classes} onAnnouncementCreated={() => void refreshAnnouncements()} />}
            />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
