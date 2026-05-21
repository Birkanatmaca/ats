import { useEffect, useMemo, useState } from "react";

export const PRINCIPAL_TABLE_PAGE_SIZE = 12;

export function usePaginatedRows<T>(rows: T[], resetKey: string, pageSize = PRINCIPAL_TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  return {
    paginatedRows,
    page: currentPage,
    setPage,
    totalPages,
    pageSize,
    totalItems: rows.length
  };
}
