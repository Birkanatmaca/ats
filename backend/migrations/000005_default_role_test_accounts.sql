-- Default role test accounts for local/demo environments.
-- These accounts are intentionally non-secret and documented in TEST_CREDENTIALS.txt.

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
        '00000000-0000-0000-0000-000000010110',
        'mudur@atlas.k12.tr',
        'sha256$ots-default-principal$401f5e4ee34b5a978ba7ab29eb4ed4cadb5910308c145270a5dad16b1c8b958c',
        'Cem Arslan',
        true,
        false
    ),
    (
        '00000000-0000-0000-0000-000000010111',
        'rehberlik@atlas.k12.tr',
        'sha256$ots-default-guidance$389229a241807a39d991e63a0a0fb5bfe712edbddb0e972451f57dec88001187',
        'Selin Ergin',
        true,
        false
    ),
    (
        '00000000-0000-0000-0000-000000010112',
        'ogretmen@atlas.k12.tr',
        'sha256$ots-default-teacher$f9b1789ca13b599d8d79aef4747c4b727087a9331a5f021fca6138037b18d28b',
        'Ayşe Kara',
        true,
        false
    ),
    (
        '00000000-0000-0000-0000-000000010113',
        'veli@atlas.k12.tr',
        'sha256$ots-default-guardian$b68306fe713a56eadf2f649a2c1ad73766e3f7fb005772ed560eaeef9c20fcb4',
        'Merve Demir',
        true,
        false
    )
ON CONFLICT (email) DO NOTHING;

INSERT INTO tenant_memberships (id, tenant_id, user_id, status)
VALUES
    ('00000000-0000-0000-0000-000000010210', '00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010110', 'active'),
    ('00000000-0000-0000-0000-000000010211', '00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010111', 'active'),
    ('00000000-0000-0000-0000-000000010212', '00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010112', 'active'),
    ('00000000-0000-0000-0000-000000010213', '00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010113', 'active')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

INSERT INTO user_roles (tenant_id, user_id, role_id)
VALUES
    ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010110', '00000000-0000-0000-0000-000000010301'),
    ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010111', '00000000-0000-0000-0000-000000010302'),
    ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010112', '00000000-0000-0000-0000-000000010303'),
    ('00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010113', '00000000-0000-0000-0000-000000010304')
ON CONFLICT DO NOTHING;

INSERT INTO teachers (id, tenant_id, user_id, title)
VALUES
    ('00000000-0000-0000-0000-000000010411', '00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010111', 'Rehber Öğretmen'),
    ('00000000-0000-0000-0000-000000010412', '00000000-0000-0000-0000-000000010001', '00000000-0000-0000-0000-000000010112', 'Matematik Öğretmeni')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

INSERT INTO guardians (id, tenant_id, user_id, full_name, email)
VALUES (
    '00000000-0000-0000-0000-000000010413',
    '00000000-0000-0000-0000-000000010001',
    '00000000-0000-0000-0000-000000010113',
    'Merve Demir',
    'veli@atlas.k12.tr'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, sensitivity, metadata)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'migration.seed_default_role_credentials',
    'user',
    'system_confidential',
    '{"roles":["principal","guidance","teacher","guardian"],"credential_scope":"development"}'::jsonb
);
