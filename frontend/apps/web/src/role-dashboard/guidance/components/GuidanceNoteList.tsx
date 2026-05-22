import type { GuidanceNote } from "../../../lib/api";
import { formatGuidanceDate } from "../utils";
import { noteTypeLabel } from "../data";
import { sensitivityBadgeClass, sensitivityLabel } from "../utils/sensitivity";

export function GuidanceNoteList({
  notes,
  onDelete
}: {
  notes: GuidanceNote[];
  onDelete?: (note: GuidanceNote) => void;
}) {
  if (notes.length === 0) {
    return <p className="empty-text guidance-empty-pad">Henüz rehberlik notu yok.</p>;
  }

  return (
    <div className="guidance-note-list">
      {notes.map((note) => (
        <article className="guidance-note-row" key={note.id}>
          <div className="guidance-note-head">
            <div>
              <strong>{note.studentName}</strong>
              <span>
                {note.className} · {noteTypeLabel(note.noteType)}
                {note.title ? ` · ${note.title}` : ""} · {note.authorName}
              </span>
            </div>
            <span className={sensitivityBadgeClass(note.sensitivity)}>{sensitivityLabel(note.sensitivity)}</span>
          </div>
          <p>{note.body}</p>
          <div className="guidance-note-footer">
            <small>{formatGuidanceDate(note.createdAt)}</small>
            {onDelete ? (
              <button className="ghost-action small-action" type="button" onClick={() => onDelete(note)}>
                Sil
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
