import { AlertCircle, CheckCircle2, FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { readSheet } from "read-excel-file/browser";
import { useMemo, useState, type ChangeEvent } from "react";
import {
  api,
  type StudentImportCommitPreview,
  type StudentImportJob,
  type StudentImportRow
} from "../../../lib/api";
import type { SchoolClass } from "../types";

type SheetCell = string | number | boolean | Date | null | undefined;

type ImportRowStatus = "valid" | "duplicate" | "invalid";

type ParsedStudentRow = {
  rowNumber: number;
  schoolNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  status: ImportRowStatus;
  reason: string;
};

const SCHOOL_NUMBER_KEYS = ["okulno", "okulnumarasi", "ogrencino", "ogrencinumarasi", "numara", "no", "studentno", "studentnumber", "schoolnumber"];
const FIRST_NAME_KEYS = ["ad", "adi", "isim", "ogrenciadi", "firstname", "first"];
const LAST_NAME_KEYS = ["soyad", "soyadi", "ogrencisoyadi", "lastname", "last", "surname"];
const FULL_NAME_KEYS = ["adsoyad", "adsoyadi", "advesoyad", "adivesoyadi", "isimsoyisim", "ogrenciadsoyad", "ogrenciadsoyadi", "fullname", "name"];
const CLASS_NAME_KEYS = ["sinif", "sinifadi", "sinifadi", "classname", "class", "class_name"];
const SECTION_NAME_KEYS = ["sube", "subeadi", "section", "sectionname", "section_name", "branch"];
const GUARDIAN_NAME_KEYS = ["veli", "veliadi", "veliad", "guardian", "guardianname", "guardian_name"];
const GUARDIAN_PHONE_KEYS = ["velitelefon", "telefon", "phone", "guardianphone", "guardian_phone"];
const GUARDIAN_EMAIL_KEYS = ["veliemail", "eposta", "email", "guardianemail", "guardian_email"];

export function StudentImportModal({
  open,
  classes,
  existingSchoolNumbers,
  onClose,
  onComplete
}: {
  open: boolean;
  classes: SchoolClass[];
  existingSchoolNumbers: string[];
  onClose: () => void;
  onComplete?: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [defaultClassId, setDefaultClassId] = useState("");
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [createMissingClasses, setCreateMissingClasses] = useState(true);
  const [inviteGuardians, setInviteGuardians] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "validated">("upload");
  const [job, setJob] = useState<StudentImportJob | null>(null);
  const [serverRows, setServerRows] = useState<StudentImportRow[]>([]);
  const [preview, setPreview] = useState<StudentImportCommitPreview | null>(null);

  const defaultClassName = useMemo(
    () => classes.find((item) => item.id === defaultClassId)?.name ?? "",
    [classes, defaultClassId]
  );

  const stats = useMemo(
    () => ({
      valid: rows.filter((row) => row.status === "valid").length,
      duplicate: rows.filter((row) => row.status === "duplicate").length,
      invalid: rows.filter((row) => row.status === "invalid").length
    }),
    [rows]
  );

  const displayRows = step === "validated" ? serverRows : null;

  function reset() {
    setFileName("");
    setDefaultClassId("");
    setRows([]);
    setError(null);
    setSuccess(null);
    setParsing(false);
    setImporting(false);
    setStep("upload");
    setJob(null);
    setServerRows([]);
    setPreview(null);
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
    setStep("upload");
    setJob(null);
    setServerRows([]);
    setPreview(null);
    setFileName(file.name);

    try {
      const sheetRows = await readTabularFile(file);
      const parsedRows = parseStudentRows(sheetRows, existingSchoolNumbers, defaultClassName);
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

  function buildRawRows(validRows: ParsedStudentRow[]) {
    return validRows.map((row) => ({
      school_number: row.schoolNumber,
      first_name: row.firstName,
      last_name: row.lastName,
      class_name: row.className || defaultClassName,
      section_name: row.sectionName,
      guardian_name: row.guardianName,
      guardian_phone: row.guardianPhone,
      guardian_email: row.guardianEmail
    }));
  }

  async function validateAndPreview() {
    const validRows = rows.filter((row) => row.status === "valid");
    if (validRows.length === 0) {
      setError("Aktarmak için en az bir geçerli öğrenci satırı olmalı.");
      return;
    }
    if (!validRows.some((row) => row.className || defaultClassName) && !createMissingClasses) {
      setError("Sınıf bilgisi olmayan satırlar için varsayılan sınıf seçin veya eksik sınıf oluşturmayı açın.");
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await api.createStudentImportJob({
        fileName: fileName || "ogrenci-import.csv",
        rows: buildRawRows(validRows),
        options: { createMissingClasses, inviteGuardians }
      });
      const importedRows = await api.listStudentImportRows(created.id);
      const commitPreview = await api.previewStudentImportJob(created.id);
      setJob(created);
      setServerRows(importedRows);
      setPreview(commitPreview);
      setStep("validated");
      if (created.status === "failed") {
        setError("Tüm satırlarda hata var; commit yapılamaz.");
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Doğrulama başarısız.");
    } finally {
      setImporting(false);
    }
  }

  async function commitImport() {
    if (!job || job.status !== "ready") {
      setError("Import işi commit için hazır değil.");
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const result = await api.commitStudentImportJob(job.id);
      setSuccess(
        `${result.createdStudents} öğrenci eklendi${result.createdGuardians > 0 ? `, ${result.createdGuardians} veli daveti` : ""}${
          result.failedRows > 0 ? `, ${result.failedRows} satır başarısız` : ""
        }.`
      );
      onComplete?.();
      if (result.failedRows === 0) {
        close();
      } else {
        setJob(result.job);
        setServerRows(await api.listStudentImportRows(job.id));
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
          <h2 id="student-import-title">{step === "validated" ? "Import doğrulama özeti" : "Öğrenci listesine aktar"}</h2>
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

          {step === "upload" ? (
            <>
              <label className="field">
                <span>Varsayılan sınıf (dosyada sınıf kolonu yoksa)</span>
                <select value={defaultClassId} onChange={(event) => setDefaultClassId(event.target.value)}>
                  <option value="">Dosyadan oku / boş bırak</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="principal-student-import-option">
                <input
                  checked={createMissingClasses}
                  type="checkbox"
                  onChange={(event) => setCreateMissingClasses(event.target.checked)}
                />
                <span>Eksik sınıfları otomatik oluştur</span>
              </label>
              <label className="principal-student-import-option">
                <input checked={inviteGuardians} type="checkbox" onChange={(event) => setInviteGuardians(event.target.checked)} />
                <span>Veli e-postası varsa davet gönder</span>
              </label>

              <label className="principal-student-import-drop">
                <input type="file" accept=".xlsx,.csv,text/csv" onChange={(event) => void handleFileChange(event)} />
                <span className="principal-student-import-drop-icon">
                  <UploadCloud size={22} />
                </span>
                <strong>{fileName || "Excel dosyası seç"}</strong>
                <small>Kolonlar: Okul No, Ad, Soyad, Sınıf, Şube, Veli adı/telefon/e-posta</small>
              </label>

              <div className="principal-student-import-format">
                <FileSpreadsheet size={15} />
                <span>Desteklenen format: .xlsx veya .csv</span>
              </div>
            </>
          ) : null}

          {parsing ? <p className="empty-text">Dosya okunuyor...</p> : null}

          {step === "validated" && job && preview ? (
            <div className="principal-student-import-commit-summary" aria-label="Commit özeti">
              <p>
                <strong>{preview.studentsToCreate}</strong> öğrenci oluşturulacak
                {preview.guardiansToInvite > 0 ? (
                  <>
                    , <strong>{preview.guardiansToInvite}</strong> veli daveti
                  </>
                ) : null}
                {preview.skippedRows > 0 ? (
                  <>
                    , <strong>{preview.skippedRows}</strong> satır atlanacak
                  </>
                ) : null}
              </p>
              <p className="empty-text">
                Durum: {job.status} · {job.validRows} geçerli · {job.warningRows} uyarı · {job.errorRows} hata
              </p>
            </div>
          ) : null}

          {(step === "upload" ? rows.length > 0 : displayRows && displayRows.length > 0) ? (
            <>
              <div className="principal-student-import-stats" aria-label="Aktarım özeti">
                {step === "upload" ? (
                  <>
                    <span className="principal-student-import-stat principal-student-import-stat--valid">
                      <CheckCircle2 size={13} />
                      {stats.valid} aktarılacak
                    </span>
                    <span className="principal-student-import-stat principal-student-import-stat--duplicate">{stats.duplicate} tekrar</span>
                    <span className="principal-student-import-stat principal-student-import-stat--invalid">{stats.invalid} hatalı</span>
                  </>
                ) : job ? (
                  <>
                    <span className="principal-student-import-stat principal-student-import-stat--valid">{job.validRows} geçerli</span>
                    <span className="principal-student-import-stat principal-student-import-stat--duplicate">{job.warningRows} uyarı</span>
                    <span className="principal-student-import-stat principal-student-import-stat--invalid">{job.errorRows} hata</span>
                  </>
                ) : null}
              </div>

              <div className="principal-table-wrap principal-student-import-preview">
                <table className="principal-table">
                  <thead>
                    <tr>
                      <th>Satır</th>
                      <th>Okul no</th>
                      <th>Ad</th>
                      <th>Soyad</th>
                      <th>Sınıf</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {step === "upload"
                      ? rows.map((row) => (
                          <tr key={row.rowNumber}>
                            <td>{row.rowNumber}</td>
                            <td>
                              <code className="principal-students-number">{row.schoolNumber || "-"}</code>
                            </td>
                            <td>{row.firstName || "-"}</td>
                            <td>{row.lastName || "-"}</td>
                            <td>{row.className || defaultClassName || "-"}</td>
                            <td>
                              <span className={`principal-student-import-row-status principal-student-import-row-status--${row.status}`}>
                                {row.reason}
                              </span>
                            </td>
                          </tr>
                        ))
                      : displayRows?.map((row) => (
                          <tr key={row.id}>
                            <td>{row.rowNumber}</td>
                            <td>
                              <code className="principal-students-number">{row.normalizedData.schoolNumber || "-"}</code>
                            </td>
                            <td>{row.normalizedData.firstName || "-"}</td>
                            <td>{row.normalizedData.lastName || "-"}</td>
                            <td>{row.normalizedData.className || "-"}</td>
                            <td>
                              <span className={`principal-student-import-row-status principal-student-import-row-status--${row.status}`}>
                                {row.errorMessages.join(" · ") || row.status}
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
          {step === "validated" ? (
            <button className="ghost-action" type="button" onClick={() => setStep("upload")} disabled={importing}>
              Geri
            </button>
          ) : (
            <button className="ghost-action" type="button" onClick={close}>
              Vazgeç
            </button>
          )}
          {step === "upload" ? (
            <button
              className="primary-action"
              type="button"
              onClick={() => void validateAndPreview()}
              disabled={stats.valid === 0 || parsing || importing}
            >
              {stats.valid > 0 ? `${stats.valid} satırı doğrula` : "Doğrula"}
            </button>
          ) : (
            <button
              className="primary-action"
              type="button"
              onClick={() => void commitImport()}
              disabled={!job || job.status !== "ready" || importing}
            >
              {preview && preview.studentsToCreate > 0 ? `${preview.studentsToCreate} öğrenciyi onayla` : "Onayla ve aktar"}
            </button>
          )}
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

function parseStudentRows(rows: SheetCell[][], existingSchoolNumbers: string[], defaultClassName: string): ParsedStudentRow[] {
  const nonEmptyRows = rows
    .map((row, index) => ({ row, sourceIndex: index }))
    .filter(({ row }) => row.some((cell) => cellToText(cell).length > 0));

  if (nonEmptyRows.length === 0) {
    return [];
  }

  const headerKeys = nonEmptyRows[0].row.map((cell) => normalizeKey(cellToText(cell)));
  const detected = detectColumns(headerKeys);
  const hasHeader = detected.schoolNumber >= 0 && (detected.firstName >= 0 || detected.fullName >= 0);
  const columns = hasHeader ? detected : { ...detected, schoolNumber: 0, firstName: 1, lastName: 2 };
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

    const className = columns.className >= 0 ? cellToText(row[columns.className]) : defaultClassName;
    const sectionName = columns.sectionName >= 0 ? cellToText(row[columns.sectionName]) : "";
    const guardianName = columns.guardianName >= 0 ? cellToText(row[columns.guardianName]) : "";
    const guardianPhone = columns.guardianPhone >= 0 ? cellToText(row[columns.guardianPhone]) : "";
    const guardianEmail = columns.guardianEmail >= 0 ? cellToText(row[columns.guardianEmail]) : "";

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
      className,
      sectionName,
      guardianName,
      guardianPhone,
      guardianEmail,
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
    fullName: findColumnIndex(headerKeys, FULL_NAME_KEYS),
    className: findColumnIndex(headerKeys, CLASS_NAME_KEYS),
    sectionName: findColumnIndex(headerKeys, SECTION_NAME_KEYS),
    guardianName: findColumnIndex(headerKeys, GUARDIAN_NAME_KEYS),
    guardianPhone: findColumnIndex(headerKeys, GUARDIAN_PHONE_KEYS),
    guardianEmail: findColumnIndex(headerKeys, GUARDIAN_EMAIL_KEYS)
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
