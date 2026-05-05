CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    is_secret BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (key, value, is_secret)
VALUES
    ('maintenance_enabled', 'false', false),
    ('maintenance_message', 'Sistem bakımı devam ediyor. Kısa süre sonra tekrar deneyebilirsiniz.', false),
    ('ai_provider_key', '', true),
    ('sms_provider_key', '', true),
    ('mail_provider_key', '', true),
    ('mail_sender_secret', '', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, sensitivity, metadata)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'migration.platform_settings',
    'platform_settings',
    'system_confidential',
    '{"settings":["maintenance","ai_provider_key","sms_provider_key","mail_provider_key","mail_sender_secret"]}'::jsonb
);
