import { Loader2, NotebookPen } from "lucide-react";
import type { FormEvent } from "react";
import type { GuidanceStudent } from "../../../lib/api";
import { guidanceNoteTypes } from "../data";

export function GuidanceNoteForm({
  students,
  form,
  loading,
  message,
  error,
  onChange,
  onSubmit,
  onCancel
}: {
  students: GuidanceStudent[];
  form: { studentId: string; noteType: string; title: string; body: string };
  loading: boolean;
  message: string | null;
  error: string | null;
  onChange: (next: { studentId: string; noteType: string; title: string; body: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  return (
    <form className="guidance-note-form" onSubmit={onSubmit}>
      {message && <div className="form-success">{message}</div>}
      {error && <div className="form-error">{error}</div>}
      <label className="field">
        <span>Öğrenci</span>
        <select value={form.studentId} onChange={(e) => onChange({ ...form, studentId: e.target.value })} required>
          <option value="">Seçin</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.fullName} · {student.className || "—"}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Not türü</span>
        <select value={form.noteType} onChange={(e) => onChange({ ...form, noteType: e.target.value })} required>
          {guidanceNoteTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Başlık (isteğe bağlı)</span>
        <input
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="Örn. Veli görüşmesi özeti"
          maxLength={200}
        />
      </label>
      <label className="field">
        <span>Not / rapor metni</span>
        <textarea
          value={form.body}
          onChange={(e) => onChange({ ...form, body: e.target.value })}
          placeholder="Görüşme, izleme veya müdahale notunu yazın"
          rows={6}
          maxLength={4000}
          required
        />
      </label>
      {onCancel ? (
        <div className="guidance-modal-actions">
          <button className="ghost-action" type="button" onClick={onCancel} disabled={loading}>
            İptal
          </button>
          <button className="primary-action" type="submit" disabled={loading || students.length === 0}>
            {loading ? <Loader2 className="spin" size={17} /> : <NotebookPen size={17} />}
            Kaydet
          </button>
        </div>
      ) : (
        <button className="primary-action" type="submit" disabled={loading || students.length === 0}>
          {loading ? <Loader2 className="spin" size={17} /> : <NotebookPen size={17} />}
          Kaydet
        </button>
      )}
    </form>
  );
}
