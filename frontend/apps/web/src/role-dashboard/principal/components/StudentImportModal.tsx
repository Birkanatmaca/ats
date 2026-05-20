import { AlertCircle, CheckCircle2, FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { readSheet } from "read-excel-file/browser";
import { useMemo, useState, type ChangeEvent } from "react";
import type { SchoolClass } from "../types";
import type { StudentFormPayload } from "./StudentFormModal";

type SheetCell = string | number | boolean | Date | null | undefined;

type ImportRowStatus = "valid" | "duplicate" | "invalid";

type ParsedStudentRow = {
  rowNumber: number;
  schoolNumber: string;
  firstName: string;
  lastName: string;
  status: ImportRowStatus;
  reason: string;
};

const SCHOOL_NUMBER_KEYS = ["okulno", "okulnumarasi", "ogrencino", "ogrencinumarasi", "numara", "no", "studentno", "studentnumber"];
const FIRST_NAME_KEYS = ["ad", "adi", "isim", "ogrenciadi", "firstname", "first"];
const LAST_NAME_KEYS = ["soyad", "soyadi", "ogrencisoyadi", "lastname", "last", "surname"];
const FULL_NAME_KEYS = ["adsoyad", "adsoyadi", "advesoyad", "adivesoyadi", "isimsoyisim", "ogrenciadsoyad", "ogrenciadsoyadi", "fullname", "name"];

export function StudentImportModal({
  open,
  classes,
  existingSchoolNumbers,
  onClose,
  onImport
}: {
  open: boolean;
  classes: SchoolClass[];
  existingSchoolNumbers: string[];
  onClose: () => void;
  onImport: (classId: string, payloads: StudentFormPayload[]) => Promise<{ created: number; failed: number; errors?: string[] }>;
}) {
  const [fileName, setFileName] = useState("");
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const stats = useMemo(
    () => ({
      valid: rows.filter((row) => row.status === "valid").length,
      duplicate: rows.filter((row) => row.status === "duplicate").length,
      invalid: rows.filter((row) => row.status === "invalid").length
    }),
    [rows]
  );

  function reset() {
    setFileName("");
    setClassId("");
    setRows([]);
    setError(null);
    setSuccess(null);
    setParsing(false);
    setImporting(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setParsing(true);
    setError(null);
    setRows([]);
    setFileName(file.name);

    try {
      const sheetRows = await readTabularFile(file);
      const parsedRows = parseStudentRows(sheetRows, existingSchoolNumbers);
      setRows(parsedRows);
      if (parsedRows.length === 0) {
        setError("Dosyada öğrenci satırı bulunamadı.");
      } else if (parsedRows.every((row) => row.status !== "valid")) {
        setError("Aktarılabilecek geçerli öğrenci bulunamadı.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dosya okunamadı.");
    } finally {
      setParsing(false);
    }
  }

  async function importValidRows() {
    const validRows = rows.filter((row) => row.status === "valid");
    if (!classId) {
      setError("Lütfen öğrencilerin atanacağı sınıfı seçin.");
      return;
    }
    if (validRows.length === 0) {
      setError("Aktarmak için en az bir geçerli öğrenci satırı olmalı.");
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await onImport(
        classId,
        validRows.map((row) => ({
          classId,
          sectionId: "",
          schoolNumber: row.schoolNumber,
          firstName: row.firstName,
          lastName: row.lastName,
          gender: "",
          birthDate: "",
          guardianName: "",
          guardianPhone: "",
          status: "active"
        }))
      );
      setSuccess(`${result.created} öğrenci eklendi${result.failed > 0 ? `, ${result.failed} satır başarısız` : ""}.`);
      if (result.failed === 0) {
        close();
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "İçe aktarma başarısız.");
    } finally {
      setImporting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="principal-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="principal-modal principal-student-import-modal" role="dialog" aria-modal="true" aria-labelledby="student-import-title">
        <header className="principal-modal-head">
          <h2 id="student-import-title">Öğrenci listesine aktar</h2>
          <button className="principal-modal-close" type="button" onClick={close} aria-label="Kapat">
            <X size={20} />
          </button>
        </header>

        <div className="principal-modal-body principal-student-import-body">
          {error ? (
            <div className="form-error principal-modal-error">
              <AlertCircle size={15} />
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="form-success principal-modal-error">
              <CheckCircle2 size={15} />
              {success}
            </div>
          ) : null}

          <label className="field">
            <span>Hedef sınıf</span>
            <select value={classId} onChange={(event) => setClassId(event.target.value)} required>
              <option value="">Sınıf seçin</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="principal-student-import-drop">
            <input type="file" accept=".xlsx,.csv,text/csv" onChange={(event) => void handleFileChange(event)} />
            <span className="principal-student-import-drop-icon">
              <UploadCloud size={22} />
            </span>
            <strong>{fileName || "Excel dosyası seç"}</strong>
            <small>Kolonlar: Okul No, Ad, Soyad. Tek kolonda “Ad Soyad” da desteklenir.</small>
          </label>

          <div className="principal-student-import-format">
            <FileSpreadsheet size={15} />
            <span>Desteklenen format: .xlsx veya .csv</span>
          </div>

          {parsing ? <p className="empty-text">Dosya okunuyor...</p> : null}

          {rows.length > 0 ? (
            <>
              <div className="principal-student-import-stats" aria-label="Aktarım özeti">
                <span className="principal-student-import-stat principal-student-import-stat--valid">
                  <CheckCircle2 size={13} />
                  {stats.valid} aktarılacak
                </span>
                <span className="principal-student-import-stat principal-student-import-stat--duplicate">{stats.duplicate} tekrar</span>
                <span className="principal-student-import-stat principal-student-import-stat--invalid">{stats.invalid} hatalı</span>
              </div>

              <div className="principal-table-wrap principal-student-import-preview">
                <table className="principal-table">
                  <thead>
                    <tr>
                      <th>Satır</th>
                      <th>Okul no</th>
                      <th>Ad</th>
                      <th>Soyad</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td>
                        <td>
                          <code className="principal-students-number">{row.schoolNumber || "-"}</code>
                        </td>
                        <td>{row.firstName || "-"}</td>
                        <td>{row.lastName || "-"}</td>
                        <td>
                          <span className={`principal-student-import-row-status principal-student-import-row-status--${row.status}`}>
                            {row.reason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <footer className="principal-modal-foot">
          <button className="ghost-action" type="button" onClick={close}>
            Vazgeç
          </button>
          <button className="primary-action" type="button" onClick={() => void importValidRows()} disabled={stats.valid === 0 || parsing || importing}>
            {stats.valid > 0 ? `${stats.valid} öğrenciyi aktar` : "Aktar"}
          </button>
        </footer>
      </div>
    </div>
  );
}

async function readTabularFile(file: File): Promise<SheetCell[][]> {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("tr-TR");
  if (extension === "csv" || file.type === "text/csv") {
    return parseCsv(await file.text());
  }
  if (extension === "xlsx") {
    return (await readSheet(file)) as unknown as SheetCell[][];
  }
  throw new Error("Lütfen .xlsx veya .csv formatında bir öğrenci listesi yükleyin.");
}

function parseStudentRows(rows: SheetCell[][], existingSchoolNumbers: string[]): ParsedStudentRow[] {
  const nonEmptyRows = rows
    .map((row, index) => ({ row, sourceIndex: index }))
    .filter(({ row }) => row.some((cell) => cellToText(cell).length > 0));

  if (nonEmptyRows.length === 0) {
    return [];
  }

  const headerKeys = nonEmptyRows[0].row.map((cell) => normalizeKey(cellToText(cell)));
  const detected = detectColumns(headerKeys);
  const hasHeader = detected.schoolNumber >= 0 && (detected.firstName >= 0 || detected.fullName >= 0);
  const columns = hasHeader ? detected : { schoolNumber: 0, firstName: 1, lastName: 2, fullName: -1 };
  const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;
  const existing = new Set(existingSchoolNumbers.map(normalizeSchoolNumber));
  const seen = new Set<string>();

  return dataRows.map(({ row, sourceIndex }) => {
    const schoolNumber = cellToText(row[columns.schoolNumber]);
    const fullName = columns.fullName >= 0 ? cellToText(row[columns.fullName]) : "";
    const splitName = splitFullName(fullName);
    let firstName = splitName.firstName || cellToText(row[columns.firstName]);
    let lastName = splitName.lastName || (columns.lastName >= 0 ? cellToText(row[columns.lastName]) : "");

    if (!lastName && firstName.includes(" ")) {
      const fallbackName = splitFullName(firstName);
      firstName = fallbackName.firstName;
      lastName = fallbackName.lastName;
    }

    const normalizedSchoolNumber = normalizeSchoolNumber(schoolNumber);
    let status: ImportRowStatus = "valid";
    let reason = "Hazır";

    if (!schoolNumber || !firstName || !lastName) {
      status = "invalid";
      reason = "Eksik bilgi";
    } else if (existing.has(normalizedSchoolNumber) || seen.has(normalizedSchoolNumber)) {
      status = "duplicate";
      reason = "Tekrar";
    } else {
      seen.add(normalizedSchoolNumber);
    }

    return {
      rowNumber: sourceIndex + 1,
      schoolNumber,
      firstName,
      lastName,
      status,
      reason
    };
  });
}

function detectColumns(headerKeys: string[]) {
  return {
    schoolNumber: findColumnIndex(headerKeys, SCHOOL_NUMBER_KEYS),
    firstName: findColumnIndex(headerKeys, FIRST_NAME_KEYS),
    lastName: findColumnIndex(headerKeys, LAST_NAME_KEYS),
    fullName: findColumnIndex(headerKeys, FULL_NAME_KEYS)
  };
}

function findColumnIndex(headerKeys: string[], candidates: string[]) {
  return headerKeys.findIndex((key) => candidates.includes(key));
}

function cellToText(cell: SheetCell) {
  if (cell === null || cell === undefined) {
    return "";
  }
  if (cell instanceof Date) {
    return cell.toLocaleDateString("tr-TR");
  }
  if (typeof cell === "number") {
    return Number.isInteger(cell) ? String(cell) : String(cell).replace(".", ",");
  }
  return String(cell).replace(/\s+/g, " ").trim();
}

function splitFullName(value: string) {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return { firstName: value.trim(), lastName: "" };
  }
  const lastName = tokens.pop() ?? "";
  return { firstName: tokens.join(" "), lastName };
}

function normalizeSchoolNumber(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function normalizeKey(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

function parseCsv(text: string): SheetCell[][] {
  const delimiter = detectCsvDelimiter(text);
  const rows: SheetCell[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        value += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(value.trim());
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value.trim());
  rows.push(row);
  return rows;
}

function detectCsvDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}
