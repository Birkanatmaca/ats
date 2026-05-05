ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user ON user_roles(tenant_id, user_id);

INSERT INTO tenants (id, name, plan, timezone)
VALUES ('00000000-0000-0000-0000-000000010001', 'Özel Atlas Koleji', 'MVP Pilot', 'Europe/Istanbul')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (id, tenant_id, code, name)
VALUES
    ('00000000-0000-0000-0000-000000010301', '00000000-0000-0000-0000-000000010001', 'principal', 'Müdür'),
    ('00000000-0000-0000-0000-000000010302', '00000000-0000-0000-0000-000000010001', 'guidance', 'Rehberlik'),
    ('00000000-0000-0000-0000-000000010303', '00000000-0000-0000-0000-000000010001', 'teacher', 'Öğretmen'),
    ('00000000-0000-0000-0000-000000010304', '00000000-0000-0000-0000-000000010001', 'guardian', 'Veli')
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name, is_active, must_change_password)
VALUES
    (
        '00000000-0000-0000-0000-000000010101',
        'cem.arslan@atlas.k12.tr',
        'sha256$ots-demo-user$aca1b9e76772d2346ed95877dcb2325596ef5494de3b8efbccded4f0c1fcf8e0',
        'Cem Arslan',
        true,
        false
    ),
    (
        '00000000-0000-0000-0000-000000010102',
        'ayse.kara@atlas.k12.tr',
        'sha256$ots-demo-teacher$c766ed727e7c8a80297d99b2628fa607c7fc3947e669d0e1cbe2e52573846b25',
        'Ayşe Kara',
        true,
        false
    )
ON CONFLICT (email) DO NOTHING;

INSERT INTO tenant_memberships (id, tenant_id, user_id, status)
VALUES
    ('00000000-0000-0000-0000-000000010201', '00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010101', 'active'),
    ('00000000-0000-0000-0000-000000010202', '00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010102', 'active')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

INSERT INTO user_roles (tenant_id, user_id, role_id)
VALUES
    ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010101', '00000000-0000-0000-0000-000000010301'),
    ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010102', '00000000-0000-0000-0000-000000010303')
ON CONFLICT DO NOTHING;

INSERT INTO teachers (id, tenant_id, user_id, title)
VALUES ('00000000-0000-0000-0000-000000010401', '00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010102', 'Matematik Öğretmeni')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, sensitivity, metadata)
VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000101',
        'migration.seed_demo_institution',
        'tenant',
        '00000000-0000-0000-0000-000000010001',
        'system_confidential',
        '{"tenant":"Özel Atlas Koleji"}'::jsonb
    );
