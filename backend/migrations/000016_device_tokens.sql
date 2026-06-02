CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'expo',
    preferences JSONB NOT NULL DEFAULT '{"attendance":true,"announcements":true,"support":true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_tenant_user ON device_tokens (tenant_id, user_id);

INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, sensitivity, metadata)
VALUES (
    NULL,
    NULL,
    'migration.device_tokens',
    'device_token',
    NULL,
    'operational',
    '{"tables":["device_tokens"]}'::jsonb
);
