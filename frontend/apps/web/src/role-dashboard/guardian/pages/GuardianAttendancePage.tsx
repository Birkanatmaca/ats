import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { guardianAttendanceRecords } from "../data";
import { GuardianAttendanceList } from "../components/GuardianAttendanceList";
import { GuardianKpiCard } from "../components/GuardianKpiCard";
import type { GuardianChild } from "../types";

export function GuardianAttendancePage({ child }: { child: GuardianChild }) {
  const presentCount = guardianAttendanceRecords.filter((record) => record.status === "present").length;
  const absentCount = guardianAttendanceRecords.filter((record) => record.status === "absent").length;
  const lateCount = guardianAttendanceRecords.filter((record) => record.status === "late").length;
  const excusedCount = guardianAttendanceRecords.filter((record) => record.status === "excused").length;

  return (
    <section className="guardian-page-stack">
      <div className="guardian-page-title">
        <span className="section-kicker">Devamsızlık</span>
        <h1>{child.fullName}</h1>
      </div>

      <div className="guardian-kpi-grid">
        <GuardianKpiCard icon={<CheckCircle2 size={17} />} label="Geldi" value={presentCount} detail="Tamamlanan yoklama" tone="emerald" />
        <GuardianKpiCard icon={<XCircle size={17} />} label="Gelmedi" value={absentCount} detail="Veli bilgilendirme gerektirir" tone="amber" />
        <GuardianKpiCard icon={<Clock3 size={17} />} label="Geç" value={lateCount} detail="Derse geç katılım" tone="sky" />
        <GuardianKpiCard icon={<AlertCircle size={17} />} label="İzinli" value={excusedCount} detail="İzinli kayıt" tone="violet" />
      </div>

      <section className="principal-surface-card">
        <div className="guardian-card-head">
          <div>
            <h2>Yoklama geçmişi</h2>
            <p>Öğretmenlerin aldığı yoklamalardan veliye yansıyan kayıtlar.</p>
          </div>
        </div>
        <GuardianAttendanceList records={guardianAttendanceRecords} />
      </section>
    </section>
  );
}
