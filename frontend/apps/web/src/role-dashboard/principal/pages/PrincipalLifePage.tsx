import {
  BookOpenCheck,
  CalendarDays,
  Loader2,
  Plus,
  RefreshCw,
  Soup,
  Trash2,
  UsersRound
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  api,
  type Club,
  type ClubMembershipStatus,
  type LifeMealType,
  type MealMenu,
  type StudyAttendanceStatus,
  type StudySession
} from "../../../lib/api";
import "../../guidance/GuidanceDataPage.css";
import type { ClassStudent, PrincipalManagedTeacher, SchoolClass } from "../types";
import "./PrincipalLifePage.css";

const mealTypeLabels: Record<LifeMealType, string> = {
  breakfast: "Kahvaltı",
  lunch: "Öğle",
  snack: "Ara öğün"
};

const attendanceLabels: Record<StudyAttendanceStatus, string> = {
  attended: "Katıldı",
  absent: "Devamsız",
  excused: "Mazeretli"
};

const membershipLabels: Record<ClubMembershipStatus, string> = {
  active: "Aktif",
  waitlisted: "Bekleme",
  left: "Ayrıldı"
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISODate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function localDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", weekday: "short" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function teacherName(teacher: PrincipalManagedTeacher) {
  return `${teacher.firstName} ${teacher.lastName}`.trim() || teacher.username;
}

function studentName(student: ClassStudent) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function StatCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) {
  return (
    <article className={`principal-life-stat principal-life-stat--${tone}`}>
      <div>{icon}</div>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
  );
}

export function PrincipalLifePage({
  classes,
  students,
  teachers
}: {
  classes: SchoolClass[];
  students: ClassStudent[];
  teachers: PrincipalManagedTeacher[];
}) {
  const [meals, setMeals] = useState<MealMenu[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [mealForm, setMealForm] = useState({
    date: todayISODate(),
    mealType: "lunch" as LifeMealType,
    title: "",
    description: "",
    allergens: ""
  });
  const [studyForm, setStudyForm] = useState({
    title: "",
    classId: "",
    teacherUserId: "",
    date: todayISODate(),
    startTime: "15:30",
    endTime: "16:20",
    capacity: "12"
  });
  const [clubForm, setClubForm] = useState({
    name: "",
    description: "",
    advisorUserId: "",
    capacity: "16"
  });
  const [attendanceForm, setAttendanceForm] = useState({
    sessionId: "",
    studentId: "",
    status: "attended" as StudyAttendanceStatus
  });
  const [membershipForm, setMembershipForm] = useState({
    clubId: "",
    studentId: "",
    status: "active" as ClubMembershipStatus
  });

  const teacherOptions = useMemo(() => teachers.filter((teacher) => teacher.userId || teacher.id), [teachers]);
  const activeStudents = useMemo(() => students.filter((student) => student.status === "active"), [students]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextMeals, nextSessions, nextClubs] = await Promise.all([
        api.lifeMeals({ fromDate: todayISODate(), toDate: addDaysISODate(7) }),
        api.studySessions(),
        api.clubs()
      ]);
      setMeals(nextMeals);
      setSessions(nextSessions);
      setClubs(nextClubs);
      setStudyForm((current) => ({
        ...current,
        classId: current.classId || classes[0]?.id || "",
        teacherUserId: current.teacherUserId || teacherOptions[0]?.userId || teacherOptions[0]?.id || ""
      }));
      setAttendanceForm((current) => ({
        ...current,
        sessionId: current.sessionId || nextSessions[0]?.id || "",
        studentId: current.studentId || activeStudents[0]?.id || ""
      }));
      setClubForm((current) => ({
        ...current,
        advisorUserId: current.advisorUserId || teacherOptions[0]?.userId || teacherOptions[0]?.id || ""
      }));
      setMembershipForm((current) => ({
        ...current,
        clubId: current.clubId || nextClubs[0]?.id || "",
        studentId: current.studentId || activeStudents[0]?.id || ""
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Okul yaşamı verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [activeStudents, classes, teacherOptions]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function run(actionKey: string, action: () => Promise<unknown>, successMessage: string) {
    setBusyAction(actionKey);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(successMessage);
      await reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "İşlem tamamlanamadı.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createMeal(event: FormEvent) {
    event.preventDefault();
    await run(
      "createMeal",
      () => {
        if (!mealForm.date || !mealForm.title.trim()) throw new Error("Menü için tarih ve başlık zorunludur.");
        return api.createLifeMeal({
          date: mealForm.date,
          mealType: mealForm.mealType,
          title: mealForm.title.trim(),
          description: mealForm.description.trim(),
          allergens: splitTags(mealForm.allergens)
        });
      },
      "Yemek menüsü yayınlandı."
    );
  }

  async function createStudySession(event: FormEvent) {
    event.preventDefault();
    await run(
      "createStudy",
      () => {
        const capacity = Number.parseInt(studyForm.capacity, 10);
        if (!studyForm.title.trim() || !studyForm.date || !studyForm.startTime || !studyForm.endTime) {
          throw new Error("Etüt için başlık, tarih ve saatler zorunludur.");
        }
        if (!Number.isFinite(capacity) || capacity <= 0) throw new Error("Etüt kontenjanı pozitif sayı olmalıdır.");
        return api.createStudySession({
          title: studyForm.title.trim(),
          classId: studyForm.classId || undefined,
          teacherUserId: studyForm.teacherUserId || undefined,
          startsAt: localDateTime(studyForm.date, studyForm.startTime),
          endsAt: localDateTime(studyForm.date, studyForm.endTime),
          capacity
        });
      },
      "Etüt oturumu oluşturuldu."
    );
  }

  async function recordAttendance(event: FormEvent) {
    event.preventDefault();
    await run(
      "attendance",
      () => {
        if (!attendanceForm.sessionId || !attendanceForm.studentId) throw new Error("Katılım için etüt ve öğrenci seçin.");
        return api.recordStudyAttendance(attendanceForm.sessionId, [
          { studentId: attendanceForm.studentId, status: attendanceForm.status }
        ]);
      },
      "Etüt katılımı işlendi."
    );
  }

  async function createClub(event: FormEvent) {
    event.preventDefault();
    await run(
      "createClub",
      () => {
        const capacity = Number.parseInt(clubForm.capacity, 10);
        if (!clubForm.name.trim()) throw new Error("Kulüp adı zorunludur.");
        if (!Number.isFinite(capacity) || capacity <= 0) throw new Error("Kulüp kontenjanı pozitif sayı olmalıdır.");
        return api.createClub({
          name: clubForm.name.trim(),
          description: clubForm.description.trim(),
          advisorUserId: clubForm.advisorUserId || undefined,
          capacity
        });
      },
      "Kulüp oluşturuldu."
    );
  }

  async function addMembership(event: FormEvent) {
    event.preventDefault();
    await run(
      "membership",
      () => {
        if (!membershipForm.clubId || !membershipForm.studentId) throw new Error("Üyelik için kulüp ve öğrenci seçin.");
        return api.addClubMembership(membershipForm.clubId, {
          studentId: membershipForm.studentId,
          status: membershipForm.status
        });
      },
      "Kulüp üyeliği güncellendi."
    );
  }

  const attendanceCount = sessions.reduce((total, session) => total + session.attendance.length, 0);
  const membershipCount = clubs.reduce((total, club) => total + club.memberships.length, 0);

  return (
    <section className="principal-page-stack guidance-data-page principal-life-page">
      <header className="principal-life-hero">
        <div>
          <span className="sa-kicker">Okul yaşamı</span>
          <h1>Yemek, etüt ve kulüp yönetimi</h1>
          <p>Haftalık menüyü yayınlayın, etüt oturumlarını açın ve kulüp üyeliklerini aynı ekrandan yönetin.</p>
        </div>
        <button className="sa-secondary-btn" type="button" onClick={() => void reload()} disabled={loading}>
          {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          Yenile
        </button>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="principal-life-stats">
        <StatCard icon={<Soup size={18} />} label="Haftalık menü" value={String(meals.length)} detail="Önümüzdeki 7 gün" tone="amber" />
        <StatCard icon={<BookOpenCheck size={18} />} label="Etüt oturumu" value={String(sessions.length)} detail={`${attendanceCount} katılım kaydı`} tone="green" />
        <StatCard icon={<UsersRound size={18} />} label="Kulüp" value={String(clubs.length)} detail={`${membershipCount} üyelik kaydı`} tone="blue" />
        <StatCard icon={<CalendarDays size={18} />} label="Aktif öğrenci" value={String(activeStudents.length)} detail="Üyelik/katılım hedefi" tone="rose" />
      </div>

      <div className="principal-life-layout">
        <div className="principal-life-column">
          <article className="guidance-data-card principal-life-panel">
            <header className="guidance-data-card-head">
              <div>
                <h2>Haftalık yemek menüsü</h2>
                <span>{loading ? "Yükleniyor" : `${meals.length} kayıt`}</span>
              </div>
              <Soup size={18} aria-hidden />
            </header>
            <div className="principal-life-list">
              {meals.length === 0 && !loading ? <p className="guidance-data-empty">Bu hafta için menü kaydı yok.</p> : null}
              {meals.map((meal) => (
                <div className="principal-life-row" key={meal.id}>
                  <div className="principal-life-row-main">
                    <strong>{meal.title}</strong>
                    <span>{formatDate(meal.date)} · {mealTypeLabels[meal.mealType]}</span>
                    {meal.description ? <p>{meal.description}</p> : null}
                    {meal.allergens.length > 0 ? <em>Alerjen: {meal.allergens.join(", ")}</em> : null}
                  </div>
                  <button
                    className="principal-life-icon-btn"
                    type="button"
                    title="Menüyü sil"
                    disabled={busyAction === `delete-${meal.id}`}
                    onClick={() => void run(`delete-${meal.id}`, () => api.deleteLifeMeal(meal.id), "Yemek menüsü silindi.")}
                  >
                    {busyAction === `delete-${meal.id}` ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />}
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="guidance-data-card principal-life-panel">
            <header className="guidance-data-card-head">
              <div>
                <h2>Etüt oturumları</h2>
                <span>{loading ? "Yükleniyor" : `${sessions.length} oturum`}</span>
              </div>
              <BookOpenCheck size={18} aria-hidden />
            </header>
            <div className="principal-life-list">
              {sessions.length === 0 && !loading ? <p className="guidance-data-empty">Etüt oturumu bulunamadı.</p> : null}
              {sessions.slice(0, 8).map((session) => (
                <div className="principal-life-row" key={session.id}>
                  <div className="principal-life-row-main">
                    <strong>{session.title}</strong>
                    <span>
                      {formatDateTime(session.startsAt)} · {session.className || "Genel"} · {session.teacherName || "Öğretmen yok"}
                    </span>
                    <p>{session.attendance.length}/{session.capacity} katılım</p>
                    {session.capacityWarning ? <em>{session.capacityWarning}</em> : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="guidance-data-card principal-life-panel">
            <header className="guidance-data-card-head">
              <div>
                <h2>Kulüpler</h2>
                <span>{loading ? "Yükleniyor" : `${clubs.length} kulüp`}</span>
              </div>
              <UsersRound size={18} aria-hidden />
            </header>
            <div className="principal-life-list">
              {clubs.length === 0 && !loading ? <p className="guidance-data-empty">Kulüp kaydı bulunamadı.</p> : null}
              {clubs.slice(0, 8).map((club) => (
                <div className="principal-life-row" key={club.id}>
                  <div className="principal-life-row-main">
                    <strong>{club.name}</strong>
                    <span>{club.advisorName || "Danışman yok"} · {club.memberships.length}/{club.capacity} üye</span>
                    {club.description ? <p>{club.description}</p> : null}
                    {club.capacityWarning ? <em>{club.capacityWarning}</em> : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="principal-life-forms">
          <article className="guidance-data-card">
            <header className="guidance-data-card-head">
              <h2>Menü yayınla</h2>
              <span>Veli bildirimi oluşturur</span>
            </header>
            <form className="guidance-data-form principal-life-form" onSubmit={createMeal}>
              <label className="guidance-data-field">
                <span>Tarih</span>
                <input type="date" value={mealForm.date} onChange={(event) => setMealForm((current) => ({ ...current, date: event.target.value }))} />
              </label>
              <label className="guidance-data-field">
                <span>Öğün</span>
                <select value={mealForm.mealType} onChange={(event) => setMealForm((current) => ({ ...current, mealType: event.target.value as LifeMealType }))}>
                  {Object.entries(mealTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="guidance-data-field">
                <span>Başlık</span>
                <input value={mealForm.title} onChange={(event) => setMealForm((current) => ({ ...current, title: event.target.value }))} placeholder="Mercimek çorbası, fırın tavuk" />
              </label>
              <label className="guidance-data-field">
                <span>Açıklama</span>
                <textarea value={mealForm.description} onChange={(event) => setMealForm((current) => ({ ...current, description: event.target.value }))} rows={3} />
              </label>
              <label className="guidance-data-field">
                <span>Alerjenler</span>
                <input value={mealForm.allergens} onChange={(event) => setMealForm((current) => ({ ...current, allergens: event.target.value }))} placeholder="Süt, Gluten" />
              </label>
              <button className="primary-action" type="submit" disabled={busyAction === "createMeal"}>
                {busyAction === "createMeal" ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                Menüyü yayınla
              </button>
            </form>
          </article>

          <article className="guidance-data-card">
            <header className="guidance-data-card-head">
              <h2>Etüt oluştur</h2>
              <span>Sınıf ve öğretmen opsiyonel</span>
            </header>
            <form className="guidance-data-form principal-life-form" onSubmit={createStudySession}>
              <label className="guidance-data-field">
                <span>Başlık</span>
                <input value={studyForm.title} onChange={(event) => setStudyForm((current) => ({ ...current, title: event.target.value }))} placeholder="Matematik destek etüdü" />
              </label>
              <label className="guidance-data-field">
                <span>Sınıf</span>
                <select value={studyForm.classId} onChange={(event) => setStudyForm((current) => ({ ...current, classId: event.target.value }))}>
                  <option value="">Genel</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="guidance-data-field">
                <span>Öğretmen</span>
                <select value={studyForm.teacherUserId} onChange={(event) => setStudyForm((current) => ({ ...current, teacherUserId: event.target.value }))}>
                  <option value="">Atanmadı</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.userId || teacher.id} value={teacher.userId || teacher.id}>{teacherName(teacher)}</option>
                  ))}
                </select>
              </label>
              <div className="principal-life-form-grid">
                <label className="guidance-data-field">
                  <span>Tarih</span>
                  <input type="date" value={studyForm.date} onChange={(event) => setStudyForm((current) => ({ ...current, date: event.target.value }))} />
                </label>
                <label className="guidance-data-field">
                  <span>Başlangıç</span>
                  <input type="time" value={studyForm.startTime} onChange={(event) => setStudyForm((current) => ({ ...current, startTime: event.target.value }))} />
                </label>
                <label className="guidance-data-field">
                  <span>Bitiş</span>
                  <input type="time" value={studyForm.endTime} onChange={(event) => setStudyForm((current) => ({ ...current, endTime: event.target.value }))} />
                </label>
                <label className="guidance-data-field">
                  <span>Kontenjan</span>
                  <input inputMode="numeric" value={studyForm.capacity} onChange={(event) => setStudyForm((current) => ({ ...current, capacity: event.target.value }))} />
                </label>
              </div>
              <button className="primary-action" type="submit" disabled={busyAction === "createStudy"}>
                {busyAction === "createStudy" ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                Etüt oluştur
              </button>
            </form>
          </article>

          <article className="guidance-data-card">
            <header className="guidance-data-card-head">
              <h2>Etüt katılımı işle</h2>
              <span>Devamsızlıkta veli bildirimi tetiklenir</span>
            </header>
            <form className="guidance-data-form principal-life-form" onSubmit={recordAttendance}>
              <label className="guidance-data-field">
                <span>Etüt</span>
                <select value={attendanceForm.sessionId} onChange={(event) => setAttendanceForm((current) => ({ ...current, sessionId: event.target.value }))}>
                  <option value="">Etüt seç</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>{session.title}</option>
                  ))}
                </select>
              </label>
              <label className="guidance-data-field">
                <span>Öğrenci</span>
                <select value={attendanceForm.studentId} onChange={(event) => setAttendanceForm((current) => ({ ...current, studentId: event.target.value }))}>
                  <option value="">Öğrenci seç</option>
                  {activeStudents.map((student) => (
                    <option key={student.id} value={student.id}>{studentName(student)} · {student.schoolNumber}</option>
                  ))}
                </select>
              </label>
              <label className="guidance-data-field">
                <span>Durum</span>
                <select value={attendanceForm.status} onChange={(event) => setAttendanceForm((current) => ({ ...current, status: event.target.value as StudyAttendanceStatus }))}>
                  {Object.entries(attendanceLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <button className="primary-action" type="submit" disabled={busyAction === "attendance"}>
                {busyAction === "attendance" ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                Katılımı işle
              </button>
            </form>
          </article>

          <article className="guidance-data-card">
            <header className="guidance-data-card-head">
              <h2>Kulüp oluştur</h2>
              <span>Danışman ve kontenjanla açılır</span>
            </header>
            <form className="guidance-data-form principal-life-form" onSubmit={createClub}>
              <label className="guidance-data-field">
                <span>Kulüp adı</span>
                <input value={clubForm.name} onChange={(event) => setClubForm((current) => ({ ...current, name: event.target.value }))} placeholder="Robotik kulübü" />
              </label>
              <label className="guidance-data-field">
                <span>Açıklama</span>
                <textarea value={clubForm.description} onChange={(event) => setClubForm((current) => ({ ...current, description: event.target.value }))} rows={3} />
              </label>
              <label className="guidance-data-field">
                <span>Danışman</span>
                <select value={clubForm.advisorUserId} onChange={(event) => setClubForm((current) => ({ ...current, advisorUserId: event.target.value }))}>
                  <option value="">Atanmadı</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.userId || teacher.id} value={teacher.userId || teacher.id}>{teacherName(teacher)}</option>
                  ))}
                </select>
              </label>
              <label className="guidance-data-field">
                <span>Kontenjan</span>
                <input inputMode="numeric" value={clubForm.capacity} onChange={(event) => setClubForm((current) => ({ ...current, capacity: event.target.value }))} />
              </label>
              <button className="primary-action" type="submit" disabled={busyAction === "createClub"}>
                {busyAction === "createClub" ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                Kulüp oluştur
              </button>
            </form>
          </article>

          <article className="guidance-data-card">
            <header className="guidance-data-card-head">
              <h2>Kulüp üyeliği</h2>
              <span>Öğrenci durumunu günceller</span>
            </header>
            <form className="guidance-data-form principal-life-form" onSubmit={addMembership}>
              <label className="guidance-data-field">
                <span>Kulüp</span>
                <select value={membershipForm.clubId} onChange={(event) => setMembershipForm((current) => ({ ...current, clubId: event.target.value }))}>
                  <option value="">Kulüp seç</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
              </label>
              <label className="guidance-data-field">
                <span>Öğrenci</span>
                <select value={membershipForm.studentId} onChange={(event) => setMembershipForm((current) => ({ ...current, studentId: event.target.value }))}>
                  <option value="">Öğrenci seç</option>
                  {activeStudents.map((student) => (
                    <option key={student.id} value={student.id}>{studentName(student)} · {student.schoolNumber}</option>
                  ))}
                </select>
              </label>
              <label className="guidance-data-field">
                <span>Durum</span>
                <select value={membershipForm.status} onChange={(event) => setMembershipForm((current) => ({ ...current, status: event.target.value as ClubMembershipStatus }))}>
                  {Object.entries(membershipLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <button className="primary-action" type="submit" disabled={busyAction === "membership"}>
                {busyAction === "membership" ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                Üyeliği kaydet
              </button>
            </form>
          </article>
        </aside>
      </div>
    </section>
  );
}
