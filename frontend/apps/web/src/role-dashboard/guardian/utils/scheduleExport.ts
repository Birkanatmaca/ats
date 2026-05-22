import type { Lesson } from "../../../lib/api";
import { sortLessons, weekdayLabel } from "../../teacher/utils/lessonSchedule";
import type { GuardianChild } from "../types";

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadGuardianSchedule(lessons: Lesson[], child: GuardianChild) {
  const sorted = sortLessons(lessons);
  const lines = [
    `Öğrenci,${escapeCsv(child.fullName)}`,
    `Sınıf,${escapeCsv(child.className)}`,
    `Okul no,${escapeCsv(child.schoolNumber)}`,
    "",
    "Gün,Başlangıç,Bitiş,Ders,Öğretmen,Derslik",
    ...sorted.map((lesson) =>
      [
        escapeCsv(weekdayLabel(lesson.dayOfWeek)),
        escapeCsv(lesson.startTime),
        escapeCsv(lesson.endTime),
        escapeCsv(lesson.subjectName),
        escapeCsv(lesson.teacherName),
        escapeCsv(lesson.room || "")
      ].join(",")
    )
  ];

  const blob = new Blob(["\ufeff", lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${child.fullName.replace(/\s+/g, "-")}-${child.className}-program.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function printGuardianSchedule() {
  window.print();
}
