package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	"ots/backend/internal/platform/storage"
)

func (s *Store) SaveFileMeta(ctx context.Context, meta storage.FileMeta) error {
	metadataJSON := "{}"
	if raw, err := json.Marshal(map[string]any{"source": "local_store"}); err == nil {
		metadataJSON = string(raw)
	}

	_, err := s.db.ExecContext(ctx, `
INSERT INTO file_uploads (
	tenant_id, category, resource_type, resource_id, file_key, original_name, content_type, size_bytes, uploaded_by, uploaded_at, metadata
) VALUES (
	$1::uuid, $2, NULLIF($3, ''), NULLIF($4, ''), $5, NULLIF($6, ''), $7, $8, NULLIF($9, '')::uuid, $10, $11::jsonb
)
ON CONFLICT (tenant_id, file_key)
DO UPDATE SET
	category = EXCLUDED.category,
	resource_type = EXCLUDED.resource_type,
	resource_id = EXCLUDED.resource_id,
	original_name = EXCLUDED.original_name,
	content_type = EXCLUDED.content_type,
	size_bytes = EXCLUDED.size_bytes,
	uploaded_by = EXCLUDED.uploaded_by,
	uploaded_at = EXCLUDED.uploaded_at,
	metadata = EXCLUDED.metadata`,
		sanitizeTenantUUID(meta.Key),
		strings.TrimSpace(meta.Category),
		strings.TrimSpace(meta.ResourceType),
		strings.TrimSpace(meta.ResourceID),
		strings.TrimSpace(meta.Key),
		strings.TrimSpace(meta.OriginalName),
		strings.TrimSpace(meta.ContentType),
		meta.SizeBytes,
		strings.TrimSpace(meta.UploadedBy),
		timeOrNow(meta.UploadedAt, s.clock),
		metadataJSON,
	)
	return err
}

func (s *Store) GetFileMeta(ctx context.Context, key string) (storage.FileMeta, bool, error) {
	tenantID := sanitizeTenantUUID(key)
	var out storage.FileMeta
	var uploadedAt time.Time
	err := s.db.QueryRowContext(ctx, `
SELECT
	file_key,
	COALESCE(content_type, ''),
	COALESCE(size_bytes, 0),
	COALESCE(category, ''),
	COALESCE(original_name, ''),
	COALESCE(resource_type, ''),
	COALESCE(resource_id, ''),
	COALESCE(uploaded_by::text, ''),
	uploaded_at
FROM file_uploads
WHERE tenant_id = $1::uuid AND file_key = $2
LIMIT 1`, tenantID, strings.TrimSpace(key)).Scan(
		&out.Key,
		&out.ContentType,
		&out.SizeBytes,
		&out.Category,
		&out.OriginalName,
		&out.ResourceType,
		&out.ResourceID,
		&out.UploadedBy,
		&uploadedAt,
	)
	if err == sql.ErrNoRows {
		return storage.FileMeta{}, false, nil
	}
	if err != nil {
		return storage.FileMeta{}, false, err
	}
	out.UploadedAt = uploadedAt.UTC()
	return out, true, nil
}

func (s *Store) ListFileMetaByResource(ctx context.Context, tenantID, resourceType, resourceID string) ([]storage.FileMeta, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT
	file_key,
	COALESCE(content_type, ''),
	COALESCE(size_bytes, 0),
	COALESCE(category, ''),
	COALESCE(original_name, ''),
	COALESCE(resource_type, ''),
	COALESCE(resource_id, ''),
	COALESCE(uploaded_by::text, ''),
	uploaded_at
FROM file_uploads
WHERE tenant_id = $1::uuid
  AND resource_type = $2
  AND resource_id = $3
ORDER BY uploaded_at DESC`, strings.TrimSpace(tenantID), strings.TrimSpace(resourceType), strings.TrimSpace(resourceID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]storage.FileMeta, 0)
	for rows.Next() {
		var item storage.FileMeta
		if err := rows.Scan(
			&item.Key,
			&item.ContentType,
			&item.SizeBytes,
			&item.Category,
			&item.OriginalName,
			&item.ResourceType,
			&item.ResourceID,
			&item.UploadedBy,
			&item.UploadedAt,
		); err != nil {
			return nil, err
		}
		item.UploadedAt = item.UploadedAt.UTC()
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func sanitizeTenantUUID(key string) string {
	parts := strings.Split(strings.Trim(strings.TrimSpace(key), "/"), "/")
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

func timeOrNow(value time.Time, clock func() time.Time) time.Time {
	if value.IsZero() {
		if clock == nil {
			return time.Now().UTC()
		}
		return clock().UTC()
	}
	return value.UTC()
}
