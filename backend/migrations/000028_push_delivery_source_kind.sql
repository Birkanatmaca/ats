-- Link push delivery logs to originating notification/event kinds.

ALTER TABLE push_delivery_logs
    ADD COLUMN IF NOT EXISTS source_kind TEXT;

CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_source_kind
    ON push_delivery_logs (tenant_id, source_kind)
    WHERE source_kind IS NOT NULL;

UPDATE notification_preferences
SET preferences = preferences || '{"transport":true}'::jsonb
WHERE NOT (preferences ? 'transport');
