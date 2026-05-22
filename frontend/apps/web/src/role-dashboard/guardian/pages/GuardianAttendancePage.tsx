import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type { GuardianAttendanceRecord } from "../../../lib/api";
import { GuidanceKpiCard } from "../../guidance/components/GuidanceKpiCard";
import { GuidanceMetricGrid } from "../../guidance/components/GuidanceMetricGrid";
import "../../guidance/GuidanceDataPage.css";
import "../../guidance/GuidanceSurface.css";
import { GuardianAttendanceDonut } from "../components/GuardianAttendanceDonut";
import { GuardianAttendanceList } from "../components/GuardianAttendanceList";
import type { GuardianChild } from "../types";
import "../GuardianAttendancePage.css";

type StatusFilter = "all" | GuardianAttendanceRecord["status"];

const filterOptions: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "Tümü" },
  { id: "absent", label: "Gelmedi" },
  { id: "late", label: "Geç" },
  { id: "present", label: "Geldi" },
  { id: "excused", label: "İzinli" }
];

export function GuardianAttendancePage({ records }: { child: GuardianChild; records: GuardianAttendanceRecord[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const stats = useMemo(() => {
    const presentCount = records.filter((record) => record.status === "present").length;
    const absentCount = records.filter((record) => record.status === "absent").length;
    const lateCount = records.filter((record) => record.status === "late").length;
    const excusedCount = records.filter((record) => record.status === "excused").length;
    return { presentCount, absentCount, lateCount, excusedCount };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (statusFilter === "all") {
      return records;
    }
    return records.filter((record) => record.status === statusFilter);
  }, [records, statusFilter]);

  return (
    <section className="guidance-page-stack guidance-surface-page guidance-data-page guardian-attendance-page">
      <GuidanceMetricGrid>
        <GuidanceKpiCard icon={<CheckCircle2 size={20} />} label="Geldi" value={stats.presentCount} detail="Tamamlanan yoklama" tone="emerald" />
        <GuidanceKpiCard icon={<XCircle size={20} />} label="Gelmedi" value={stats.absentCount} detail="Veli bilgilendirme gerektirir" tone="amber" />
        <GuidanceKpiCard icon={<Clock3 size={20} />} label="Geç" value={stats.lateCount} detail="Derse geç katılım" tone="sky" />
        <GuidanceKpiCard icon={<AlertCircle size={20} />} label="İzinli" value={stats.excusedCount} detail="İzinli kayıt" tone="violet" />
      </GuidanceMetricGrid>

      <article className="guidance-data-card guardian-attendance-summary-card">
        <GuardianAttendanceDonut
          stats={{
            presentCount: stats.presentCount,
            absentCount: stats.absentCount,
            lateCount: stats.lateCount,
            excusedCount: stats.excusedCount
          }}
        />
      </article>

      <article className="guidance-data-card guardian-attendance-records-card">
        <header className="guidance-data-card-head">
          <h2>Yoklama kayıtları</h2>
          <div className="guardian-attendance-filters">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                className={statusFilter === option.id ? "is-active" : ""}
                type="button"
                onClick={() => setStatusFilter(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span>{filteredRecords.length} kayıt</span>
        </header>

        <GuardianAttendanceList records={filteredRecords} variant="table" />
      </article>
    </section>
  );
}
