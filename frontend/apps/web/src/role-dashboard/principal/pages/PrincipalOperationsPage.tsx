import { ArrowRight, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import { statusLabel } from "../../../admin/utils/labels";
import { PrincipalPendingAttendancePanel } from "../components/PrincipalPendingAttendancePanel";
import type { PrincipalConsoleData } from "../types";

const priorityTone: Record<string, string> = {
  urgent: "principal-op-priority--urgent",
  high: "principal-op-priority--high",
  normal: "principal-op-priority--normal"
};

export function PrincipalOperationsPage({ data }: { data: PrincipalConsoleData }) {
  const operations = data.summary?.operations ?? [];

  return (
    <section className="principal-page-stack">
      <header className="sa-page-header">
        <span className="sa-kicker">Operasyon</span>
        <h1>Aksiyon bekleyen işler</h1>
        <p>Öncelik ve durum bilgisine göre takip edilmesi gereken operasyonları sırala ve ilgili sayfaya geç.</p>
      </header>

      <PrincipalPendingAttendancePanel summary={data.summary} variant="card" showClassList />

      <article className="principal-surface-card">
        {operations.length === 0 ? (
          <p className="empty-text">Aksiyon bekleyen operasyon bulunmuyor.</p>
        ) : (
          <div className="principal-operations-list">
            {operations.map((item) => {
              const target = item.targetPath ?? "/dashboard/operations";
              const priorityClass = priorityTone[item.priority] ?? priorityTone.normal;
              return (
                <NavLink className="principal-operation-row" key={item.id} to={target}>
                  <div className="principal-operation-main">
                    <strong>{item.title}</strong>
                    <div className="principal-operation-meta">
                      <span className={`principal-op-priority ${priorityClass}`}>{statusLabel(item.priority)}</span>
                      <span>{statusLabel(item.status)}</span>
                    </div>
                  </div>
                  <span className="principal-operation-action">
                    Git
                    <ChevronRight size={16} />
                  </span>
                </NavLink>
              );
            })}
          </div>
        )}
      </article>

      <article className="principal-surface-card principal-operation-hint">
        <ArrowRight size={18} aria-hidden />
        <p>Yoklama ve program işlemleri için önce yayınlanmış ders programının hazır olduğundan emin olun.</p>
      </article>
    </section>
  );
}
