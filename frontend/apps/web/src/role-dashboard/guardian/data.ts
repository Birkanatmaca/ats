import type { GuardianAttendanceRecord, GuardianChild, GuardianNotice } from "./types";

export const guardianChildren: GuardianChild[] = [
  {
    id: "student-2",
    fullName: "Efe Demir",
    className: "5/A",
    schoolNumber: "502",
    tenantName: "Özel Atlas Koleji",
    avatarTone: "amber"
  }
];

export const guardianAttendanceRecords: GuardianAttendanceRecord[] = [
  {
    id: "att-child-1",
    date: "2026-05-14",
    lesson: "Matematik",
    status: "present",
    note: "Yoklama tamamlandı"
  },
  {
    id: "att-child-2",
    date: "2026-05-13",
    lesson: "Türkçe",
    status: "late",
    note: "İlk derse geç katılım"
  },
  {
    id: "att-child-3",
    date: "2026-05-10",
    lesson: "Matematik",
    status: "present",
    note: "Yoklama tamamlandı"
  },
  {
    id: "att-child-4",
    date: "2026-05-08",
    lesson: "Türkçe",
    status: "absent",
    note: "Veli bilgilendirmesi gönderildi"
  }
];

export const guardianNotices: GuardianNotice[] = [
  {
    id: "notice-1",
    title: "Devamsızlık bildirimi",
    body: "Son devamsızlık kaydı veli ekranına işlendi.",
    tone: "warning"
  },
  {
    id: "notice-2",
    title: "Program güncellendi",
    body: "Yayınlanan ders programındaki değişiklikler çocuğun takvimine yansıdı.",
    tone: "info"
  },
  {
    id: "notice-3",
    title: "Duyuru okunmayı bekliyor",
    body: "Kurumdan gelen son bülteni duyurular sayfasında görüntüleyebilirsiniz.",
    tone: "success"
  }
];
