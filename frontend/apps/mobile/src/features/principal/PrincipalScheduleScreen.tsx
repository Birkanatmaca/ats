import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarDays, History, Minus, Plus, Sparkles, Wand2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { sortClasses, sortSections } from "@/features/principal/classUtils";
import {
  PrincipalScheduleCalendar,
  type SectionOption,
  type TeacherOption
} from "@/features/principal/PrincipalScheduleCalendar";
import { PrincipalScheduleConflictsPanel } from "@/features/principal/PrincipalScheduleConflictsPanel";
import { PrincipalScheduleLessonModal } from "@/features/principal/PrincipalScheduleLessonModal";
import { PrincipalTeacherAvailabilityPanel } from "@/features/principal/PrincipalTeacherAvailabilityPanel";
import { usePrincipalRoster } from "@/features/principal/usePrincipalRoster";
import { api } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import type {
  Lesson,
  RequirementInput,
  Schedule,
  ScheduleChangeLog,
  ScheduleConflictsResult,
  ScheduleValidationResult,
  SchedulingRequirement
} from "@/shared/api/types";
import { colors } from "@/shared/theme/colors";
import { DetailBackBar } from "@/shared/ui/DetailBackBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { Screen } from "@/shared/ui/Screen";
import { platformShadow } from "@/shared/ui/platformShadow";
import { sortLessons } from "@/shared/utils/lessonSchedule";

type TabMode = "program" | "planlama" | "musaitlik";
type ViewMode = "class" | "teacher";

function computeStats(lessons: Lesson[]) {
  const classIds = new Set(lessons.map((l) => l.classId));
  const teacherIds = new Set(lessons.map((l) => l.teacherId));
  return {
    lessonCount: lessons.length,
    classCount: classIds.size,
    teacherCount: teacherIds.size
  };
}

function groupRequirementsByClass(requirements: SchedulingRequirement[]) {
  const map = new Map<string, { className: string; items: SchedulingRequirement[]; totalHours: number }>();
  for (const item of requirements) {
    const existing = map.get(item.classId);
    if (existing) {
      existing.items.push(item);
      existing.totalHours += item.weeklyHours;
    } else {
      map.set(item.classId, { className: item.className, items: [item], totalHours: item.weeklyHours });
    }
  }
  return [...map.entries()]
    .map(([classId, value]) => ({ classId, ...value }))
    .sort((a, b) => a.className.localeCompare(b.className, "tr", { numeric: true }));
}

export function PrincipalScheduleScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabMode>("program");
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionOption | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherOption | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [requirementDraft, setRequirementDraft] = useState<RequirementInput[]>([]);
  const [requirementsDirty, setRequirementsDirty] = useState(false);
  const [validation, setValidation] = useState<ScheduleValidationResult | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleConflictsResult | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const rosterQ = usePrincipalRoster();
  const publishedQ = useQuery({ queryKey: queryKeys.schedule, queryFn: () => api.scheduleOptional() });
  const draftQ = useQuery({
    queryKey: queryKeys.scheduleById(draftId ?? ""),
    queryFn: () => api.getSchedule(draftId!),
    enabled: Boolean(draftId)
  });
  const requirementsQ = useQuery({
    queryKey: queryKeys.schedulingRequirements,
    queryFn: () => api.listSchedulingRequirements()
  });
  const teachersQ = useQuery({ queryKey: queryKeys.principalTeachers, queryFn: () => api.principalTeachers() });

  const workingSchedule: Schedule | null = useMemo(() => {
    if (draftId && draftQ.data) return draftQ.data;
    return publishedQ.data ?? null;
  }, [draftId, draftQ.data, publishedQ.data]);

  const isDraft = workingSchedule?.status === "draft";
  const editable = Boolean(workingSchedule && isDraft);
  const scheduleId = workingSchedule?.id ?? draftId ?? publishedQ.data?.id ?? null;
  const changeLogQ = useQuery({
    queryKey: queryKeys.scheduleChangeLog(scheduleId ?? ""),
    queryFn: () => api.scheduleChangeLog(scheduleId!),
    enabled: Boolean(scheduleId)
  });

  const lessons = useMemo(() => sortLessons(workingSchedule?.lessons ?? []), [workingSchedule?.lessons]);
  const stats = useMemo(() => computeStats(lessons), [lessons]);

  const sectionOptions = useMemo(() => {
    const classNameById = new Map((rosterQ.data?.classes ?? []).map((item) => [item.id, item.name]));
    const sections = sortSections(rosterQ.data?.sections ?? []);
    const fromRoster: SectionOption[] = sections.map((section) => ({
      id: section.id,
      classId: section.classId,
      className: classNameById.get(section.classId) ?? "Sınıf",
      sectionName: section.name,
      label: `${classNameById.get(section.classId) ?? "Sınıf"} / ${section.name}`
    }));

    if (fromRoster.length > 0) return fromRoster;

    const fromLessons = new Map<string, string>();
    for (const lesson of lessons) {
      fromLessons.set(lesson.classId, lesson.className);
    }
    return sortClasses(
      [...fromLessons.entries()].map(([classId, className]) => ({
        id: classId,
        classId,
        className,
        name: className,
        sectionName: "A",
        label: className
      }))
    );
  }, [rosterQ.data?.classes, rosterQ.data?.sections, lessons]);

  useEffect(() => {
    if (sectionOptions.length === 0) {
      setSelectedSection(null);
      return;
    }
    if (!selectedSection || !sectionOptions.some((item) => item.id === selectedSection.id)) {
      setSelectedSection(sectionOptions[0]);
    }
  }, [sectionOptions, selectedSection]);

  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const teacher of teachersQ.data ?? []) {
      map.set(teacher.id, teacher.fullName);
    }
    for (const lesson of lessons) {
      if (!map.has(lesson.teacherId)) {
        map.set(lesson.teacherId, lesson.teacherName);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [teachersQ.data, lessons]);

  useEffect(() => {
    if (teacherOptions.length === 0) {
      setSelectedTeacher(null);
      return;
    }
    if (!selectedTeacher || !teacherOptions.some((item) => item.id === selectedTeacher.id)) {
      setSelectedTeacher(teacherOptions[0]);
    }
  }, [teacherOptions, selectedTeacher]);

  const requirementGroups = useMemo(() => groupRequirementsByClass(requirementsQ.data ?? []), [requirementsQ.data]);

  useEffect(() => {
    if (!requirementsQ.data) return;
    setRequirementDraft(
      requirementsQ.data.map((item) => ({
        classId: item.classId,
        subjectId: item.subjectId,
        weeklyHours: item.weeklyHours
      }))
    );
    setRequirementsDirty(false);
  }, [requirementsQ.data]);

  const invalidateSchedule = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
    if (draftId) void queryClient.invalidateQueries({ queryKey: queryKeys.scheduleById(draftId) });
    if (scheduleId) void queryClient.invalidateQueries({ queryKey: queryKeys.scheduleChangeLog(scheduleId) });
  };

  const saveRequirementsMut = useMutation({
    mutationFn: () => api.saveSchedulingRequirements(requirementDraft),
    onSuccess: () => {
      setRequirementsDirty(false);
      setBanner("Ders saat ihtiyaçları kaydedildi.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.schedulingRequirements });
    },
    onError: (e) => setBanner(e instanceof Error ? e.message : "İhtiyaçlar kaydedilemedi.")
  });

  const generateMut = useMutation({
    mutationFn: () => api.generateSchedule(),
    onSuccess: (result) => {
      if (result.schedule?.id) setDraftId(result.schedule.id);
      setValidation(null);
      setTab("program");
      const parts = [
        `${result.schedule?.lessons?.length ?? 0} ders yerleştirildi.`,
        result.hardConflicts > 0 ? `${result.hardConflicts} sert çakışma.` : null,
        result.recommendation || null,
        result.softWarnings?.[0] ?? null
      ].filter(Boolean);
      setBanner(parts.join(" "));
      invalidateSchedule();
    },
    onError: (e) => setBanner(e instanceof Error ? e.message : "Program oluşturulamadı.")
  });

  const validateMut = useMutation({
    mutationFn: async () => {
      const id = scheduleId;
      if (!id) throw new Error("Doğrulanacak program yok.");
      const [result, conflictResult] = await Promise.all([api.validateSchedule(id), api.scheduleConflicts(id)]);
      return { result, conflictResult };
    },
    onSuccess: ({ result, conflictResult }) => {
      setValidation(result);
      setConflicts(conflictResult);
      setBanner(result.valid ? "Program doğrulandı, yayına hazır." : "Doğrulama sorunları bulundu.");
    },
    onError: (e) => setBanner(e instanceof Error ? e.message : "Doğrulama başarısız.")
  });

  const cloneMut = useMutation({
    mutationFn: async () => {
      const id = scheduleId;
      if (!id) throw new Error("Kopyalanacak program yok.");
      return api.cloneSchedule(id);
    },
    onSuccess: (schedule) => {
      setDraftId(schedule.id);
      setValidation(null);
      setConflicts(null);
      setTab("program");
      setBanner("Program taslağa kopyalandı.");
      invalidateSchedule();
    },
    onError: (e) => setBanner(e instanceof Error ? e.message : "Kopyalama başarısız.")
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      const id = scheduleId;
      if (!id) throw new Error("Yayınlanacak program yok.");
      const result = validation ?? (await api.validateSchedule(id));
      if (!result.valid) {
        throw new Error([...result.hardConflicts, ...result.softWarnings].join(" · ") || "Doğrulama başarısız");
      }
      if (result.softWarnings.length > 0) {
        await new Promise<void>((resolve, reject) => {
          Alert.alert("Uyarılar var", result.softWarnings.join("\n"), [
            { text: "İptal", style: "cancel", onPress: () => reject(new Error("İptal")) },
            { text: "Yine de yayınla", onPress: () => resolve() }
          ]);
        });
      }
      return api.publishSchedule(id);
    },
    onSuccess: () => {
      setDraftId(null);
      setValidation(null);
      setBanner("Program yayınlandı.");
      invalidateSchedule();
    },
    onError: (e) => setBanner(e instanceof Error ? e.message : "Yayınlama başarısız.")
  });

  const lessonMut = useMutation({
    mutationFn: (payload: {
      lessonId: string;
      data: { teacherId: string; dayOfWeek: number; startTime: string; endTime: string; room: string };
    }) => {
      if (!scheduleId) throw new Error("Program bulunamadı.");
      return api.updateScheduleLesson(scheduleId, payload.lessonId, payload.data);
    },
    onSuccess: async () => {
      setBanner("Ders güncellendi.");
      setValidation(null);
      invalidateSchedule();
      if (scheduleId) {
        try {
          setConflicts(await api.scheduleConflicts(scheduleId));
        } catch {
          setConflicts(null);
        }
      }
    }
  });

  function updateRequirementHours(classId: string, subjectId: string, delta: number) {
    setRequirementDraft((current) =>
      current.map((item) => {
        if (item.classId !== classId || item.subjectId !== subjectId) return item;
        return { ...item, weeklyHours: Math.max(0, Math.min(20, item.weeklyHours + delta)) };
      })
    );
    setRequirementsDirty(true);
  }

  const refreshing =
    publishedQ.isRefetching ||
    draftQ.isRefetching ||
    requirementsQ.isRefetching ||
    teachersQ.isRefetching ||
    changeLogQ.isRefetching;

  const onRefresh = () => {
    void publishedQ.refetch();
    if (draftId) void draftQ.refetch();
    void requirementsQ.refetch();
    void teachersQ.refetch();
    if (scheduleId) void changeLogQ.refetch();
  };

  const loading = publishedQ.isLoading || requirementsQ.isLoading;
  const fatalError = publishedQ.isError && !publishedQ.data;

  if (loading) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Daha Fazla" />
        <LoadingBlock />
      </Screen>
    );
  }

  if (fatalError) {
    return (
      <Screen layout="stack">
        <DetailBackBar label="Daha Fazla" />
        <ErrorState message={publishedQ.error.message} onRetry={() => void publishedQ.refetch()} />
      </Screen>
    );
  }

  const statusLabel = !workingSchedule
    ? "Program yok"
    : isDraft
      ? "Taslak"
      : workingSchedule.status === "published"
        ? "Yayında"
        : workingSchedule.status;

  return (
    <>
      <Screen layout="stack" refreshing={refreshing} topInsetExtra={6} onRefresh={onRefresh}>
        <DetailBackBar label="Daha Fazla" />

        <View style={styles.heroShell}>
          <View
            style={[
              styles.hero,
              platformShadow("0 14px 32px rgba(28,53,87,0.18)", {
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.16,
                shadowRadius: 18,
                elevation: 8
              })
            ]}
          >
            <View pointerEvents="none" style={[styles.heroBlob, styles.heroBlobSky]} />
            <View pointerEvents="none" style={[styles.heroBlob, styles.heroBlobIndigo]} />

            <View style={styles.heroTop}>
              <View style={styles.heroIconWrap}>
                <CalendarDays color="#fff" size={22} strokeWidth={2.2} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Ders programı</Text>
                <Text style={styles.heroSubtitle}>Oluştur, düzenle ve yayınla</Text>
              </View>
              <View style={[styles.statusPill, isDraft ? styles.statusPillDraft : styles.statusPillLive]}>
                <Text style={[styles.statusPillText, isDraft ? styles.statusPillTextDraft : styles.statusPillTextLive]}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{stats.lessonCount}</Text>
                <Text style={styles.heroStatLabel}>ders</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{stats.classCount}</Text>
                <Text style={styles.heroStatLabel}>sınıf</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{workingSchedule?.score ?? 0}</Text>
                <Text style={styles.heroStatLabel}>puan</Text>
              </View>
            </View>

            <View style={styles.heroActions}>
              <Pressable
                disabled={generateMut.isPending}
                onPress={() => generateMut.mutate()}
                style={({ pressed }) => [styles.heroBtn, styles.heroBtnPrimary, pressed && styles.heroBtnPressed]}
              >
                {generateMut.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Wand2 color={colors.primary} size={16} strokeWidth={2.2} />
                    <Text style={styles.heroBtnPrimaryText}>Otomatik oluştur</Text>
                  </>
                )}
              </Pressable>
              <View style={styles.heroBtnRow}>
                <Pressable
                  disabled={!scheduleId || validateMut.isPending}
                  onPress={() => validateMut.mutate()}
                  style={({ pressed }) => [styles.heroBtnSmall, pressed && styles.heroBtnPressed]}
                >
                  {validateMut.isPending ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.heroBtnSmallText}>Doğrula</Text>
                  )}
                </Pressable>
                <Pressable
                  disabled={!scheduleId || !isDraft || publishMut.isPending}
                  onPress={() => publishMut.mutate()}
                  style={({ pressed }) => [styles.heroBtnSmall, styles.heroBtnPublish, pressed && styles.heroBtnPressed]}
                >
                  {publishMut.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.heroBtnPublishText}>Yayınla</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {banner ? (
          <View style={styles.banner}>
            <Sparkles color={colors.accent} size={14} strokeWidth={2.2} />
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}

        <PrincipalScheduleConflictsPanel result={conflicts} />
        {scheduleId ? <PrincipalScheduleChangeLogPanel items={changeLogQ.data ?? []} loading={changeLogQ.isLoading} /> : null}

        <View style={styles.tabs}>
          <Pressable onPress={() => setTab("program")} style={[styles.tab, tab === "program" && styles.tabActive]}>
            <Text style={[styles.tabText, tab === "program" && styles.tabTextActive]}>Program</Text>
          </Pressable>
          <Pressable onPress={() => setTab("planlama")} style={[styles.tab, tab === "planlama" && styles.tabActive]}>
            <Text style={[styles.tabText, tab === "planlama" && styles.tabTextActive]}>Planlama</Text>
          </Pressable>
          <Pressable onPress={() => setTab("musaitlik")} style={[styles.tab, tab === "musaitlik" && styles.tabActive]}>
            <Text style={[styles.tabText, tab === "musaitlik" && styles.tabTextActive]}>Müsaitlik</Text>
          </Pressable>
        </View>

        {tab === "program" ? (
          <>
            {!workingSchedule ? (
              <View style={styles.emptyCard}>
                <BookOpen color={colors.textMuted} size={28} strokeWidth={1.8} />
                <Text style={styles.emptyTitle}>Henüz program yok</Text>
                <Text style={styles.emptyHint}>Planlama sekmesinden ihtiyaçları kontrol edin, ardından otomatik oluşturun.</Text>
              </View>
            ) : (
              <>
                <View style={styles.viewModeRow}>
                  <Pressable
                    onPress={() => setViewMode("class")}
                    style={[styles.viewModeBtn, viewMode === "class" && styles.viewModeBtnActive]}
                  >
                    <Text style={[styles.viewModeBtnText, viewMode === "class" && styles.viewModeBtnTextActive]}>Sınıf</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setViewMode("teacher")}
                    style={[styles.viewModeBtn, viewMode === "teacher" && styles.viewModeBtnActive]}
                  >
                    <Text style={[styles.viewModeBtnText, viewMode === "teacher" && styles.viewModeBtnTextActive]}>Öğretmen</Text>
                  </Pressable>
                  {scheduleId && !isDraft ? (
                    <Pressable
                      disabled={cloneMut.isPending}
                      onPress={() => cloneMut.mutate()}
                      style={styles.cloneBtn}
                    >
                      <Text style={styles.cloneBtnText}>{cloneMut.isPending ? "..." : "Taslak oluştur"}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <PrincipalScheduleCalendar
                  editable={editable}
                  lessons={lessons}
                  onSelectLesson={setSelectedLesson}
                  onSelectSection={setSelectedSection}
                  onSelectTeacher={setSelectedTeacher}
                  sectionOptions={sectionOptions}
                  selectedSection={selectedSection}
                  selectedTeacher={selectedTeacher}
                  teacherOptions={teacherOptions}
                  viewMode={viewMode}
                />
              </>
            )}
          </>
        ) : tab === "musaitlik" ? (
          <PrincipalTeacherAvailabilityPanel teachers={teachersQ.data ?? []} />
        ) : (
          <>
            <View style={styles.planIntro}>
              <Text style={styles.planIntroTitle}>Haftalık ders ihtiyaçları</Text>
              <Text style={styles.planIntroHint}>
                Her sınıf ve ders için haftalık saatleri ayarlayın. Kaydettikten sonra otomatik program motoru bu kurallara göre
                yerleştirme yapar.
              </Text>
            </View>

            {requirementsQ.isError ? (
              <ErrorState message={requirementsQ.error.message} onRetry={() => void requirementsQ.refetch()} />
            ) : null}

            {requirementGroups.map((group) => (
              <View key={group.classId} style={styles.requirementCard}>
                <View style={styles.requirementHead}>
                  <Text style={styles.requirementClass}>{group.className}</Text>
                  <Text style={styles.requirementTotal}>{group.totalHours} saat/hafta</Text>
                </View>
                {group.items
                  .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "tr"))
                  .map((item) => {
                    const draft = requirementDraft.find(
                      (row) => row.classId === item.classId && row.subjectId === item.subjectId
                    );
                    const hours = draft?.weeklyHours ?? item.weeklyHours;
                    return (
                      <View key={item.id} style={styles.requirementRow}>
                        <View style={styles.requirementCopy}>
                          <Text style={styles.requirementSubject}>{item.subjectName}</Text>
                          <Text style={styles.requirementHint}>Haftalık saat</Text>
                        </View>
                        <View style={styles.stepper}>
                          <Pressable
                            onPress={() => updateRequirementHours(item.classId, item.subjectId, -1)}
                            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                          >
                            <Minus color={colors.primary} size={16} strokeWidth={2.4} />
                          </Pressable>
                          <Text style={styles.stepperValue}>{hours}</Text>
                          <Pressable
                            onPress={() => updateRequirementHours(item.classId, item.subjectId, 1)}
                            style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
                          >
                            <Plus color={colors.primary} size={16} strokeWidth={2.4} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
              </View>
            ))}

            {requirementGroups.length === 0 && !requirementsQ.isLoading ? (
              <Text style={styles.emptyHint}>Henüz ders ihtiyacı tanımlı değil. Program oluşturulunca varsayılanlar yüklenebilir.</Text>
            ) : null}

            <Pressable
              disabled={!requirementsDirty || saveRequirementsMut.isPending}
              onPress={() => saveRequirementsMut.mutate()}
              style={({ pressed }) => [
                styles.saveRequirementsBtn,
                (!requirementsDirty || saveRequirementsMut.isPending) && styles.saveRequirementsBtnDisabled,
                pressed && requirementsDirty && styles.heroBtnPressed
              ]}
            >
              {saveRequirementsMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveRequirementsText}>İhtiyaçları kaydet</Text>
              )}
            </Pressable>

            <View style={styles.planFooter}>
              <Text style={styles.planFooterTitle}>Sonraki adım</Text>
              <Text style={styles.planFooterHint}>
                İhtiyaçları kaydettikten sonra üstteki «Otomatik oluştur» ile programı üretin, Program sekmesinde sınıf seçerek
                takvimden dersleri düzenleyin ve yayınlayın.
              </Text>
            </View>
          </>
        )}
      </Screen>

      <PrincipalScheduleLessonModal
        editable={editable}
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
        onSave={async (data) => {
          if (!selectedLesson) return;
          await lessonMut.mutateAsync({ lessonId: selectedLesson.id, data });
        }}
        saving={lessonMut.isPending}
        teachers={teachersQ.data ?? []}
        visible={Boolean(selectedLesson)}
      />
    </>
  );
}

function PrincipalScheduleChangeLogPanel({ items, loading }: { items: ScheduleChangeLog[]; loading: boolean }) {
  const visible = items.slice(0, 4);
  return (
    <View style={styles.changeLogCard}>
      <View style={styles.changeLogHead}>
        <History color={colors.primaryLight} size={16} strokeWidth={2.2} />
        <Text style={styles.changeLogTitle}>Değişiklik geçmişi</Text>
        <Text style={styles.changeLogMeta}>{loading ? "Yükleniyor" : `${items.length} kayıt`}</Text>
      </View>

      {visible.length === 0 ? (
        <Text style={styles.changeLogEmpty}>Bu programda henüz ders düzenleme kaydı yok.</Text>
      ) : (
        visible.map((item) => (
          <View key={item.id} style={styles.changeLogRow}>
            <View style={styles.changeLogDot} />
            <View style={styles.changeLogCopy}>
              <Text style={styles.changeLogAction}>{scheduleChangeLabel(item.changeType)}</Text>
              <Text style={styles.changeLogDetail}>{scheduleChangeSummary(item)}</Text>
              <Text style={styles.changeLogDate}>{formatScheduleChangeDate(item.createdAt)}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function scheduleChangeLabel(changeType: string) {
  switch (changeType) {
    case "lesson.update":
      return "Ders güncellendi";
    default:
      return changeType;
  }
}

function scheduleChangeSummary(item: ScheduleChangeLog) {
  const before = item.before ?? {};
  const after = item.after ?? {};
  const parts: string[] = [];
  if (before.dayOfWeek !== after.dayOfWeek || before.startTime !== after.startTime || before.endTime !== after.endTime) {
    parts.push(`${after.dayOfWeek ?? "-"}. gün ${after.startTime ?? "-"}-${after.endTime ?? "-"}`);
  }
  if (before.teacherId !== after.teacherId) {
    parts.push("öğretmen değişti");
  }
  if (before.room !== after.room) {
    parts.push(`oda: ${String(after.room ?? "belirtilmedi")}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Ders bilgileri güncellendi.";
}

function formatScheduleChangeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  heroShell: { marginBottom: 12 },
  hero: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#1d4ed8",
    overflow: "hidden",
    gap: 14
  },
  heroBlob: { position: "absolute", borderRadius: 999 },
  heroBlobSky: { width: 120, height: 120, backgroundColor: "rgba(255,255,255,0.12)", top: -30, right: -20 },
  heroBlobIndigo: { width: 90, height: 90, backgroundColor: "rgba(99,102,241,0.35)", bottom: -20, left: -10 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.82)" },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillLive: { backgroundColor: "rgba(34,197,94,0.22)" },
  statusPillDraft: { backgroundColor: "rgba(251,191,36,0.24)" },
  statusPillText: { fontSize: 11, fontWeight: "800" },
  statusPillTextLive: { color: "#dcfce7" },
  statusPillTextDraft: { color: "#fef3c7" },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  heroStat: { flex: 1, alignItems: "center", gap: 2 },
  heroStatValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.78)", fontWeight: "600" },
  heroStatDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.18)" },
  heroActions: { gap: 8 },
  heroBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  heroBtnPrimary: { backgroundColor: "#fff" },
  heroBtnPrimaryText: { color: colors.primary, fontWeight: "800", fontSize: 15 },
  heroBtnRow: { flexDirection: "row", gap: 8 },
  heroBtnSmall: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)"
  },
  heroBtnSmallText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  heroBtnPublish: { backgroundColor: "#15803d", borderColor: "#15803d" },
  heroBtnPublishText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  heroBtnPressed: { opacity: 0.88 },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.accentLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10
  },
  bannerText: { flex: 1, fontSize: 13, color: colors.accent, lineHeight: 18, fontWeight: "600" },
  validationCard: { borderRadius: 14, padding: 12, gap: 6, marginBottom: 10, borderWidth: 1 },
  validationOk: { backgroundColor: "#ecfdf5", borderColor: "#bbf7d0" },
  validationBad: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  validationHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  validationTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  validationItem: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  viewModeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  viewModeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  viewModeBtnActive: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  viewModeBtnText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  viewModeBtnTextActive: { color: colors.accent },
  cloneBtn: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border
  },
  cloneBtnText: { fontSize: 12, fontWeight: "800", color: colors.primaryLight },
  changeLogCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 9,
    marginBottom: 10
  },
  changeLogHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  changeLogTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.text },
  changeLogMeta: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  changeLogEmpty: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  changeLogRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  changeLogDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.accent,
    marginTop: 6
  },
  changeLogCopy: { flex: 1, gap: 2 },
  changeLogAction: { fontSize: 12, fontWeight: "800", color: colors.text },
  changeLogDetail: { fontSize: 12, color: colors.textMuted, lineHeight: 16 },
  changeLogDate: { fontSize: 10, fontWeight: "700", color: colors.primaryLight },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  tabTextActive: { color: "#fff" },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    padding: 24,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptyHint: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 18 },
  planIntro: { gap: 6, marginBottom: 12 },
  planIntroTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  planIntroHint: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  requirementCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 10
  },
  requirementHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  requirementClass: { fontSize: 15, fontWeight: "800", color: colors.text },
  requirementTotal: { fontSize: 12, fontWeight: "700", color: colors.accent },
  requirementRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  requirementCopy: { flex: 1, gap: 2 },
  requirementSubject: { fontSize: 14, fontWeight: "600", color: colors.text },
  requirementHint: { fontSize: 11, color: colors.textMuted },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  stepperBtnPressed: { opacity: 0.85, backgroundColor: colors.accentLight },
  stepperValue: { minWidth: 24, textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.text },
  saveRequirementsBtn: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  saveRequirementsBtnDisabled: { opacity: 0.45 },
  saveRequirementsText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  planFooter: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6
  },
  planFooterTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  planFooterHint: { fontSize: 13, color: colors.textMuted, lineHeight: 18 }
});
