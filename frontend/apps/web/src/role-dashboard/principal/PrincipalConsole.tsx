import { Loader2 } from "lucide-react";
import { AppBrand } from "../../components/AppBrand";
import { NavbarUserMenu, SidebarFooter } from "../../components/ShellChrome";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { roleLabel } from "../../admin/utils/labels";
import type { AuthSession, ManagedGuardian, PrincipalSchoolRoster, SchoolTeacherRecord, UserAccount } from "../../lib/api";
import { api } from "../../lib/api";
import { principalTabs } from "./navTabs";
import { GuidanceCaseDetailPage } from "../guidance/pages/GuidanceCaseDetailPage";
import { GuidanceCasesPage } from "../guidance/pages/GuidanceCasesPage";
import { PrincipalAnnouncementsPage } from "./pages/PrincipalAnnouncementsPage";
import { PrincipalAttendancePage } from "./pages/PrincipalAttendancePage";
import { PrincipalBillingPage } from "./pages/PrincipalBillingPage";
import { PrincipalClassDetailPage } from "./pages/PrincipalClassDetailPage";
import { PrincipalClassStudentsPage } from "./pages/PrincipalClassStudentsPage";
import { PrincipalClassesPage } from "./pages/PrincipalClassesPage";
import { PrincipalGuardiansPage } from "./pages/PrincipalGuardiansPage";
import { PrincipalOperationsPage } from "./pages/PrincipalOperationsPage";
import { PrincipalOverviewPage } from "./pages/PrincipalOverviewPage";
import { PrincipalServiceDriversPage } from "./pages/PrincipalServiceDriversPage";
import { PrincipalScheduleInputsPage } from "./pages/PrincipalScheduleInputsPage";
import { PrincipalSchedulePage } from "./pages/PrincipalSchedulePage";
import { PrincipalStudentsPage } from "./pages/PrincipalStudentsPage";
import { PrincipalTeachersPage } from "./pages/PrincipalTeachersPage";
import { ProfilePage } from "../pages/ProfilePage";
import type { StudentFormPayload } from "./components/StudentFormModal";
import type { TeacherFormPayload } from "./components/TeacherFormModal";
import type { ClassSection, ClassStudent, PrincipalConsoleData, PrincipalManagedTeacher, SchoolClass } from "./types";
import { OgtaAiDock } from "../ai/OgtaAiDock";
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

export function PrincipalConsole({
  session,
  onLogout,
  onSessionUpdate
}: {
  session: AuthSession;
  onLogout: () => void;
  onSessionUpdate: (session: AuthSession) => void;
}) {
  const [data, setData] = useState<PrincipalConsoleData>({ announcements: [] });
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [teachers, setTeachers] = useState<PrincipalManagedTeacher[]>([]);
  const [guardians, setGuardians] = useState<ManagedGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const location = useLocation();

  const activePath = location.pathname.replace(/^\/dashboard\/?/, "");
  const activeTab = activePath.split("/")[0] || "overview";
  const sectionTeacherOptions = useMemo(() => teachers, [teachers]);
  const visibleTabs = useMemo(() => {
    const modules = data.tenant?.enabledModules ?? ["billing"];
    const billingEnabled = modules.includes("billing");
    return principalTabs.filter((tab) => tab.id !== "billing" || billingEnabled);
  }, [data.tenant?.enabledModules]);

  const reloadGuardians = useCallback(async () => {
    try {
      const items = await api.principalGuardians();
      setGuardians(items);
    } catch {
      setGuardians([]);
    }
  }, []);

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
    const [tenant, summary, schedule, announcements, teacherAccounts, roster, guardianItems] = await Promise.allSettled([
      api.tenant(),
      api.dashboard(),
      api.schedule(),
      api.announcements({ manage: true }),
      api.principalTeachers(),
      api.principalRoster(),
      api.principalGuardians()
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

    if (guardianItems.status === "fulfilled") {
      setGuardians(guardianItems.value);
    }

    const failed = [tenant, summary, schedule, announcements, teacherAccounts, roster, guardianItems].some((result) => result.status === "rejected");
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
      const announcements = await api.announcements({ manage: true });
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

  async function provisionManagedGuardian(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    relation: string;
    studentIds: string[];
  }) {
    const result = await api.provisionGuardian({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      studentIds: payload.studentIds,
      relation: payload.relation
    });
    await reloadGuardians();
    return { email: result.email, temporaryPassword: result.temporaryPassword };
  }

  async function updateManagedGuardian(guardianId: string, payload: Partial<{ firstName: string; lastName: string; phone: string }>) {
    await api.updatePrincipalGuardian(guardianId, payload);
    await reloadGuardians();
  }

  async function setManagedGuardianStatus(guardianId: string, status: "active" | "passive") {
    await api.setPrincipalGuardianStatus(guardianId, status);
    await reloadGuardians();
  }

  async function resetManagedGuardianPassword(guardianId: string) {
    const result = await api.resetPrincipalGuardianPassword(guardianId);
    await reloadGuardians();
    return result.temporaryPassword;
  }

  async function linkManagedGuardianStudent(
    guardianId: string,
    payload: { studentId: string; relation: string; isPrimary: boolean }
  ) {
    await api.linkPrincipalGuardianStudent(guardianId, payload);
    await reloadGuardians();
  }

  async function unlinkManagedGuardianStudent(guardianId: string, studentId: string) {
    await api.unlinkPrincipalGuardianStudent(guardianId, studentId);
    await reloadGuardians();
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
          <AppBrand />
        </div>

        <NavbarUserMenu name={session.principal.name} meta={roleLabel(session.principal.role)} />
      </header>

      <aside className="admin-sidebar">
        <nav className="admin-nav" aria-label="Müdür menüsü">
          {visibleTabs.map((tab) => (
            <NavLink className={({ isActive }) => (isActive ? "nav-button active" : "nav-button")} key={tab.id} to={`/dashboard/${tab.id}`} end={tab.id !== "classes"}>
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <SidebarFooter tenantName={data.tenant?.name ?? "Kurum"} onLogout={onLogout} />
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
              path="guardians"
              element={
                <PrincipalGuardiansPage
                  guardians={guardians}
                  onLinkStudent={linkManagedGuardianStudent}
                  onProvision={provisionManagedGuardian}
                  onReload={reloadGuardians}
                  onResetPassword={resetManagedGuardianPassword}
                  onSetStatus={setManagedGuardianStatus}
                  onUnlinkStudent={unlinkManagedGuardianStudent}
                  onUpdate={updateManagedGuardian}
                  students={students}
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
              path="schedule/inputs"
              element={<PrincipalScheduleInputsPage classes={classes} teachers={sectionTeacherOptions} />}
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
            <Route path="billing" element={<PrincipalBillingPage students={students} classes={classes} />} />
            <Route
              path="classes"
              element={
                <PrincipalClassesPage
                  schoolName={data.tenant?.name ?? "Okul"}
                  stats={{
                    classes: classes.length,
                    sections: sections.length,
                    students: students.length,
                    teachers: data.summary?.activeTeachers ?? teachers.length
                  }}
                  classes={classes}
                  sections={sections}
                  students={students}
                  onAddClass={addClass}
                  onDeleteClass={deleteClass}
                />
              }
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
              path="guidance-cases"
              element={<GuidanceCasesPage detailBasePath="/dashboard/guidance-cases" readOnly />}
            />
            <Route
              path="guidance-cases/:caseId"
              element={<GuidanceCaseDetailPage listPath="/dashboard/guidance-cases" readOnly />}
            />
            <Route path="services" element={<PrincipalServiceDriversPage />} />
            <Route
              path="announcements"
              element={
                <PrincipalAnnouncementsPage
                  data={data}
                  classes={classes}
                  sections={sections}
                  students={students}
                  onAnnouncementCreated={() => void refreshAnnouncements()}
                />
              }
            />
            <Route path="profile" element={<ProfilePage session={session} onSessionUpdate={onSessionUpdate} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
      <OgtaAiDock onActionCompleted={() => void load()} />
    </div>
  );
}
