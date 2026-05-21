import { ChevronLeft, ChevronRight } from "lucide-react";
import "./TablePagination.css";

function buildPageNumbers(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
}

export function TablePagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) {
    return null;
  }

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);
  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <nav className="principal-table-pagination" aria-label="Tablo sayfalama">
      <p className="principal-table-pagination-summary">
        <strong>
          {rangeStart}–{rangeEnd}
        </strong>
        <span> / {totalItems} kayıt</span>
        <span className="principal-table-pagination-meta">
          Sayfa {page} / {totalPages}
        </span>
      </p>
      <div className="principal-table-pagination-controls">
        <button
          className="ghost-action principal-table-pagination-nav"
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Önceki sayfa"
        >
          <ChevronLeft size={18} />
          Önceki
        </button>
        <div className="principal-table-pagination-pages" role="group" aria-label="Sayfa numaraları">
          {pageNumbers.map((pageNumber, index) => {
            const prev = pageNumbers[index - 1];
            const showGap = prev !== undefined && pageNumber - prev > 1;
            return (
              <span key={pageNumber} className="principal-table-pagination-page-wrap">
                {showGap ? <span className="principal-table-pagination-gap">…</span> : null}
                <button
                  className={`principal-table-pagination-page${pageNumber === page ? " active" : ""}`}
                  type="button"
                  aria-current={pageNumber === page ? "page" : undefined}
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              </span>
            );
          })}
        </div>
        <button
          className="ghost-action principal-table-pagination-nav"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Sonraki sayfa"
        >
          Sonraki
          <ChevronRight size={18} />
        </button>
      </div>
    </nav>
  );
}
