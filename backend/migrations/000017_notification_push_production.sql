-- User-level notification preferences (source of truth)
CREATE TABLE IF NOT EXISTS notification_preferences (
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    preferences JSONB NOT NULL DEFAULT '{"attendance":true,"announcements":true,"support":true,"guidance":true,"schedule":true}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);

-- Device token hardening
ALTER TABLE device_tokens
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_device_tokens_active
    ON device_tokens (tenant_id, user_id)
    WHERE revoked_at IS NULL;

-- Push delivery audit trail
CREATE TABLE IF NOT EXISTS push_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    device_token_id UUID REFERENCES device_tokens(id) ON DELETE SET NULL,
    notification_id UUID,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    provider TEXT NOT NULL DEFAULT 'expo',
    provider_receipt_id TEXT,
    error_code TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_tenant_created
    ON push_delivery_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_status
    ON push_delivery_logs (status, created_at DESC);

INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, sensitivity, metadata)
VALUES (
    NULL,
    NULL,
    'migration.notification_push_production',
    'push',
    NULL,
    'operational',
    '{"tables":["notification_preferences","push_delivery_logs"]}'::jsonb
);
