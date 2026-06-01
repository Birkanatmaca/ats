import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  PencilLine,
  Search,
  XCircle
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type { AttendanceRecord, AttendanceSession, Lesson } from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { attendanceLabel } from "@/shared/utils/labels";
import {
  attendanceWindowLabel,
  currentWeekday,
  formatLessonRange,
  isLessonInAttendanceWindow,
  lessonsForDay,
  sortLessons,
  weekdayLabel
} from "@/shared/utils/lessonSchedule";

type Status = AttendanceRecord["status"];

const statuses: Array<{ value: Status; label: string; color: string; bg: string }> = [
  { value: "present", label: "Geldi", color: "#16a34a", bg: "#ecfdf5" },
  { value: "absent", label: "Gelmedi", color: "#dc2626", bg: "#fef2f2" },
  { value: "late", label: "Geç", color: "#d97706", bg: "#fffbeb" },
  { value: "excused", label: "İzinli", color: colors.accent, bg: "#eff6ff" }
];

const HERO = "#059669";

async function openSession(lesson: Lesson): Promise<AttendanceSession> {
  try {
    return await api.getAttendanceSessionByLesson(lesson.id);
  } catch {
    return await api.createAttendanceSession(lesson.id);
  }
}

function statusIcon(value: Status, active = false, size = 14) {
  const tone = active ? "#fff" : undefined;
  switch (value) {
    case "present":
      return <CheckCircle2 color={tone ?? "#16a34a"} size={size} strokeWidth={2.2} />;
    case "absent":
      return <XCircle color={tone ?? "#dc2626"} size={size} strokeWidth={2.2} />;
    case "late":
      return <Clock3 color={tone ?? "#d97706"} size={size} strokeWidth={2.2} />;
    case "excused":
      return <AlertCircle color={tone ?? colors.accent} size={size} strokeWidth={2.2} />;
    default:
      return <Clock3 color="#94a3b8" size={size} strokeWidth={2.2} />;
  }
}

function sessionStatusTone(params: {
  sessionMatches: boolean;
  windowOpen: boolean;
  isFinalized: boolean;
}): { text: string; detail: string; tone: "closed" | "done" | "pending" } {
  const { sessionMatches, windowOpen, isFinalized } = params;
  if (!sessionMatches && !windowOpen) {
    return { text: "Yoklama alınmadı", detail: "Yoklama penceresi kapalı", tone: "closed" };
  }
  if (sessionMatches && isFinalized) {
    return { text: "Yoklama alındı", detail: "Kayıt tamamlandı", tone: "done" };
  }
  return {
    text: "Yoklama alınmadı",
    detail: sessionMatches ? "Liste açık — kaydı tamamlayın" : "Listeyi açın",
    tone: "pending"
  };
}

export function TeacherAttendanceScreen() {
  const queryClient = useQueryClient();
  const today = currentWeekday();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const autoOpenedRef = useRef<string | null>(null);

  const calendarQ = useQuery({ queryKey: queryKeys.teacherCalendar, queryFn: () => api.teacherCalendar() });
  const currentQ = useQuery({ queryKey: queryKeys.teacherCurrentLesson, queryFn: () => api.currentLesson() });

  const lessons = sortLessons(calendarQ.data ?? []);
  const todayLessons = lessonsForDay(lessons, today);
  const activeLesson = currentQ.data?.found ? currentQ.data.lesson : undefined;

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const lesson of todayLessons) {
      map.set(lesson.classId, lesson.className);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr", { numeric: true }));
  }, [todayLessons]);

  const defaultLesson =
    activeLesson && todayLessons.some((l) => l.id === activeLesson.id)
      ? activeLesson
      : todayLessons.find((l) => isLessonInAttendanceWindow(l, now)) ?? todayLessons[0];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!defaultLesson) return;
    setSelectedClassId((current) => current || defaultLesson.classId);
    setSelectedLessonId((current) => (todayLessons.some((l) => l.id === current) ? current : defaultLesson.id));
  }, [defaultLesson, todayLessons]);

  const lessonOptions = useMemo(
    () => todayLessons.filter((lesson) => !selectedClassId || lesson.classId === selectedClassId),
    [selectedClassId, todayLessons]
  );

  const selectedLesson = lessonOptions.find((l) => l.id === selectedLessonId) ?? lessonOptions[0];

  const windowOpen = selectedLesson ? isLessonInAttendanceWindow(selectedLesson, now) : false;
  const sessionMatches = Boolean(session && selectedLesson && session.lessonId === selectedLesson.id);
  const isFinalized = Boolean(session?.finalizedAt);
  const canEdit = sessionMatches && windowOpen && !isFinalized;
  const canReopen = sessionMatches && windowOpen && isFinalized;

  useEffect(() => {
    if (session && selectedLesson && !isLessonInAttendanceWindow(selectedLesson, now)) {
      setSession(null);
      setMessage(null);
    }
  }, [session, selectedLesson, now]);

  const openMutation = useMutation({
    mutationFn: (lesson: Lesson) => openSession(lesson),
    onSuccess: (loaded) => {
      setSession(loaded);
      setMessage(`${loaded.className} · ${loaded.subjectName} listesi hazır.`);
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Oturum açılamadı.")
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Oturum yok");
      const saved = await api.updateAttendanceRecords(session.id, session.records);
      return api.finalizeAttendanceSession(saved.id);
    },
    onSuccess: (finalized) => {
      setSession(finalized);
      setMessage("Yoklama kaydedildi.");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacherCalendar });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Kayıt başarısız.")
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Oturum yok");
      return api.reopenAttendanceSession(session.id);
    },
    onSuccess: (reopened) => {
      setSession(reopened);
      setMessage("Yoklama düzenleme için yeniden açıldı.");
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Yeniden açılamadı.")
  });

  const handleOpenLesson = useCallback(
    (lesson: Lesson) => {
      if (!isLessonInAttendanceWindow(lesson, now)) {
        setError("Yoklama penceresi kapalı (ders başlangıcından 10 dk önce – bitişinden 10 dk sonra).");
        return;
      }
      setSelectedLessonId(lesson.id);
      setSelectedClassId(lesson.classId);
      setError(null);
      openMutation.mutate(lesson);
    },
    [now, openMutation]
  );

  useEffect(() => {
    if (!activeLesson || !isLessonInAttendanceWindow(activeLesson, now)) return;
    if (session?.lessonId === activeLesson.id) return;
    if (autoOpenedRef.current === activeLesson.id) return;
    autoOpenedRef.current = activeLesson.id;
    handleOpenLesson(activeLesson);
  }, [activeLesson, now, session?.lessonId, handleOpenLesson]);

  const completedCount = session?.records.filter((r) => r.status !== "unknown").length ?? 0;
  const absentCount = session?.records.filter((r) => r.status === "absent").length ?? 0;
  const totalRecords = session?.records.length ?? 0;
  const pendingCount = totalRecords - completedCount;
  const progressPct = totalRecords > 0 ? Math.round((completedCount / totalRecords) * 100) : 0;

  const filteredRecords = useMemo(() => {
    if (!session) return [];
    const q = search.trim().toLocaleLowerCase("tr-TR");
    if (!q) return session.records;
    return session.records.filter(
      (r) =>
        r.studentName.toLocaleLowerCase("tr-TR").includes(q) ||
        r.number.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [session, search]);

  const updateStatus = useCallback((studentId: string, status: Status) => {
    setSession((current) =>
      current
        ? {
            ...current,
            records: current.records.map((r) => (r.studentId === studentId ? { ...r, status } : r))
          }
        : current
    );
  }, []);

  const markAllPresent = () => {
    setSession((current) =>
      current ? { ...current, records: current.records.map((r) => ({ ...r, status: "present" as const })) } : current
    );
  };

  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    const nextLesson = todayLessons.find((lesson) => lesson.classId === classId);
    if (nextLesson) {
      if (session && session.lessonId !== nextLesson.id) {
        setSession(null);
        setMessage(null);
      }
      setSelectedLessonId(nextLesson.id);
    }
  }

  function handleLessonSelect(lesson: Lesson) {
    if (session && session.lessonId !== lesson.id) {
      setSession(null);
      setMessage(null);
    }
    setSelectedLessonId(lesson.id);
  }

  const statusInfo = sessionStatusTone({ sessionMatches, windowOpen, isFinalized });
  const loading = openMutation.isPending || saveMutation.isPending || reopenMutation.isPending;
  const refreshing = calendarQ.isRefetching;
  const onRefresh = () => void calendarQ.refetch();

  if (calendarQ.isLoading) {
    return (
      <Screen layout="tab" topInsetExtra={6}>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen layout="tab" refreshing={refreshing} topInsetExtra={6} onRefresh={onRefresh}>
      <View style={styles.heroShell}>
        <View
          style={[
            styles.hero,
            platformShadow("0 14px 32px rgba(5,150,105,0.22)", {
              shadowColor: HERO,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              elevation: 8
            })
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <ClipboardCheck color="#a7f3d0" size={22} strokeWidth={2.4} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Yoklama</Text>
              <Text style={styles.heroSubtitle}>
                {selectedLesson
                  ? `${selectedLesson.className} · ${selectedLesson.subjectName}`
                  : "Bugünkü dersleriniz için devam takibi"}
              </Text>
            </View>
          </View>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{sessionMatches ? completedCount : "—"}</Text>
              <Text style={styles.heroMetaLabel}>işaretli</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{sessionMatches ? absentCount : "—"}</Text>
              <Text style={styles.heroMetaLabel}>gelmedi</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{sessionMatches ? pendingCount : "—"}</Text>
              <Text style={styles.heroMetaLabel}>bekleyen</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaValue}>{todayLessons.length}</Text>
              <Text style={styles.heroMetaLabel}>bugün</Text>
            </View>
          </View>
        </View>
      </View>

      {calendarQ.isError ? <ErrorState message={calendarQ.error.message} onRetry={onRefresh} /> : null}

      {!calendarQ.isError ? (
        <>
          <View style={styles.statusCard}>
            <View style={[styles.statusBadge, styles[`statusBadge_${statusInfo.tone}`]]}>
              <Text style={[styles.statusBadgeText, styles[`statusBadgeText_${statusInfo.tone}`]]}>
                {statusInfo.text}
              </Text>
            </View>
            <Text style={styles.statusDetail}>{statusInfo.detail}</Text>
            {sessionMatches && totalRecords > 0 ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                  {completedCount}/{totalRecords} öğrenci · %{progressPct}
                </Text>
              </View>
            ) : null}
          </View>

          {message ? (
            <View style={styles.bannerOk}>
              <CheckCircle2 color="#16a34a" size={16} strokeWidth={2.2} />
              <Text style={styles.bannerOkText}>{message}</Text>
            </View>
          ) : null}
          {error ? (
            <View style={styles.bannerErr}>
              <AlertCircle color="#dc2626" size={16} strokeWidth={2.2} />
              <Text style={styles.bannerErrText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.filtersCard}>
            <Text style={styles.sectionLabel}>Sınıf</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable
                onPress={() => setSelectedClassId("")}
                style={[styles.filterChip, !selectedClassId && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, !selectedClassId && styles.filterChipTextActive]}>Tümü</Text>
              </Pressable>
              {classOptions.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => handleClassChange(option.id)}
                  style={[styles.filterChip, selectedClassId === option.id && styles.filterChipActive]}
                >
                  <Text
                    style={[styles.filterChipText, selectedClassId === option.id && styles.filterChipTextActive]}
                  >
                    {option.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Ders seçimi</Text>
            {todayLessons.length === 0 ? (
              <Text style={styles.emptyHint}>Bugün planlanmış ders bulunmuyor.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {lessonOptions.map((lesson) => {
                  const active = lesson.id === selectedLessonId;
                  const open = isLessonInAttendanceWindow(lesson, now);
                  const isActiveNow = activeLesson?.id === lesson.id;
                  return (
                    <Pressable
                      key={lesson.id}
                      onPress={() => handleLessonSelect(lesson)}
                      style={[
                        styles.lessonChip,
                        active && styles.lessonChipActive,
                        !open && styles.lessonChipDisabled,
                        isActiveNow && styles.lessonChipLive
                      ]}
                    >
                      {isActiveNow ? (
                        <View style={styles.liveDot}>
                          <Text style={styles.liveDotText}>CANLI</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.lessonChipTitle, active && styles.lessonChipTextActive]}>
                        {lesson.className}
                      </Text>
                      <Text style={[styles.lessonChipSub, active && styles.lessonChipTextActive]}>
                        {lesson.subjectName}
                      </Text>
                      <Text style={[styles.lessonChipTime, active && styles.lessonChipTextActive]}>
                        {formatLessonRange(lesson)}
                        {!open ? " · kapalı" : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {selectedLesson ? (
              <View style={styles.windowNote}>
                <CalendarDays color={windowOpen ? HERO : colors.textMuted} size={15} strokeWidth={2.2} />
                <Text style={styles.windowNoteText}>
                  <Text style={styles.windowNoteStrong}>
                    {selectedLesson.className} · {selectedLesson.subjectName}
                  </Text>
                  {" · "}
                  Pencere: {attendanceWindowLabel(selectedLesson)}
                  {!windowOpen ? " · şu an erişilemez" : ""}
                </Text>
              </View>
            ) : null}

            <View style={styles.toolbarActions}>
              {!sessionMatches ? (
                <Pressable
                  disabled={!selectedLesson || !windowOpen || loading}
                  onPress={() => selectedLesson && handleOpenLesson(selectedLesson)}
                  style={[styles.primaryAction, (!selectedLesson || !windowOpen || loading) && styles.actionDisabled]}
                >
                  {openMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <ClipboardCheck color="#fff" size={16} strokeWidth={2.2} />
                      <Text style={styles.primaryActionText}>Listeyi aç</Text>
                    </>
                  )}
                </Pressable>
              ) : canReopen ? (
                <Pressable
                  disabled={loading}
                  onPress={() => reopenMutation.mutate()}
                  style={[styles.primaryAction, loading && styles.actionDisabled]}
                >
                  {reopenMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <PencilLine color="#fff" size={16} strokeWidth={2.2} />
                      <Text style={styles.primaryActionText}>Yoklamayı düzenle</Text>
                    </>
                  )}
                </Pressable>
              ) : canEdit ? (
                <View style={styles.editActions}>
                  <Pressable disabled={loading} onPress={markAllPresent} style={styles.secondaryAction}>
                    <Text style={styles.secondaryActionText}>Hepsi geldi</Text>
                  </Pressable>
                  <Pressable
                    disabled={loading}
                    onPress={() => saveMutation.mutate()}
                    style={[styles.primaryAction, styles.primaryActionFlex, loading && styles.actionDisabled]}
                  >
                    {saveMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <CheckCircle2 color="#fff" size={16} strokeWidth={2.2} />
                        <Text style={styles.primaryActionText}>Tamamla</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>

          {openMutation.isPending ? <LoadingBlock /> : null}

          {sessionMatches && !openMutation.isPending ? (
            <>
              <View style={styles.searchCard}>
                <Search color={HERO} size={18} strokeWidth={2.2} />
                <TextInput
                  editable={Boolean(session)}
                  onChangeText={setSearch}
                  placeholder="Öğrenci ara…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  value={search}
                />
              </View>

              {filteredRecords.length === 0 ? (
                <EmptyState
                  message={search ? "Aramanızla eşleşen öğrenci yok." : "Bu derste öğrenci kaydı bulunamadı."}
                  title="Kayıt yok"
                />
              ) : (
                filteredRecords.map((record) => (
                  <View key={record.studentId} style={styles.studentCard}>
                    <View style={styles.studentHead}>
                      <View>
                        <Text style={styles.studentName}>{record.studentName}</Text>
                        <Text style={styles.studentNo}>No {record.number}</Text>
                      </View>
                      <View style={styles.currentStatus}>
                        {statusIcon(record.status)}
                        <Text style={styles.currentStatusText}>{attendanceLabel(record.status)}</Text>
                      </View>
                    </View>
                    <View style={styles.statusGrid}>
                      {statuses.map((item) => {
                        const selected = record.status === item.value;
                        return (
                          <Pressable
                            key={item.value}
                            disabled={!canEdit}
                            onPress={() => updateStatus(record.studentId, item.value)}
                            style={[
                              styles.statusOption,
                              selected && { backgroundColor: item.color, borderColor: item.color },
                              !canEdit && styles.statusOptionDisabled
                            ]}
                          >
                            {statusIcon(item.value, selected, 13)}
                            <Text style={[styles.statusOptionText, selected && styles.statusOptionTextActive]}>
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}

              {isFinalized ? (
                <View style={styles.finalizedBanner}>
                  <CheckCircle2 color="#16a34a" size={18} strokeWidth={2.2} />
                  <Text style={styles.finalizedText}>Bu yoklama kesinleştirildi · {weekdayLabel(today)}</Text>
                </View>
              ) : null}
            </>
          ) : !openMutation.isPending && todayLessons.length > 0 ? (
            <EmptyState
              message={
                windowOpen
                  ? "Yukarıdan ders seçip listeyi açarak yoklama alabilirsiniz."
                  : "Seçili ders için yoklama penceresi henüz açılmadı veya kapandı."
              }
              title="Liste bekleniyor"
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroShell: { marginBottom: 2 },
  hero: {
    backgroundColor: HERO,
    borderRadius: 20,
    padding: 18,
    gap: 16
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  heroSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.86)", lineHeight: 18 },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  heroMetaPill: { flex: 1, alignItems: "center", gap: 2 },
  heroMetaValue: { fontSize: 18, fontWeight: "800", color: "#fff" },
  heroMetaLabel: { fontSize: 11, color: "rgba(255,255,255,0.78)", fontWeight: "600" },
  heroMetaDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.18)" },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusBadge_closed: { backgroundColor: "#f1f5f9" },
  statusBadge_done: { backgroundColor: "#ecfdf5" },
  statusBadge_pending: { backgroundColor: "#fffbeb" },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  statusBadgeText_closed: { color: "#64748b" },
  statusBadgeText_done: { color: "#047857" },
  statusBadgeText_pending: { color: "#b45309" },
  statusDetail: { fontSize: 13, color: colors.textMuted },
  progressBlock: { gap: 6, marginTop: 2 },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: HERO
  },
  progressLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  bannerOk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0"
  },
  bannerOkText: { flex: 1, color: "#047857", fontSize: 13, fontWeight: "600" },
  bannerErr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca"
  },
  bannerErrText: { flex: 1, color: "#b91c1c", fontSize: 13, fontWeight: "600" },
  filtersCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  chipRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f8fafc"
  },
  filterChipActive: { backgroundColor: HERO, borderColor: HERO },
  filterChipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  filterChipTextActive: { color: "#fff" },
  lessonChip: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    minWidth: 120,
    gap: 2
  },
  lessonChipActive: { backgroundColor: HERO, borderColor: HERO },
  lessonChipDisabled: { opacity: 0.62 },
  lessonChipLive: { borderColor: "#fde68a" },
  liveDot: {
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2
  },
  liveDotText: { fontSize: 9, fontWeight: "800", color: "#b45309", letterSpacing: 0.3 },
  lessonChipTitle: { fontWeight: "700", fontSize: 13, color: colors.text },
  lessonChipSub: { fontSize: 11, color: colors.textMuted },
  lessonChipTime: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  lessonChipTextActive: { color: "#fff" },
  windowNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0"
  },
  windowNoteText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 18 },
  windowNoteStrong: { fontWeight: "700" },
  toolbarActions: { marginTop: 4 },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: HERO,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16
  },
  primaryActionFlex: { flex: 1.2 },
  primaryActionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: "#f8fafc"
  },
  secondaryActionText: { fontWeight: "700", color: colors.text, fontSize: 14 },
  editActions: { flexDirection: "row", gap: 8 },
  actionDisabled: { opacity: 0.55 },
  emptyHint: { fontSize: 13, color: colors.textMuted },
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 2 },
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12
  },
  studentHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  studentName: { fontWeight: "700", fontSize: 15, color: colors.text },
  studentNo: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  currentStatus: { flexDirection: "row", alignItems: "center", gap: 4 },
  currentStatusText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusOption: {
    flexGrow: 1,
    flexBasis: "47%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#f8fafc"
  },
  statusOptionDisabled: { opacity: 0.55 },
  statusOptionText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  statusOptionTextActive: { color: "#fff" },
  finalizedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0"
  },
  finalizedText: { color: "#047857", fontWeight: "600", fontSize: 13 }
});
