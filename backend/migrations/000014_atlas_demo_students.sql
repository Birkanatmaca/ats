-- Özel Atlas Koleji: demo sınıflar, 24 örnek öğrenci, veli bağlantısı.
-- Tenant: 00000000-0000-0000-0000-000000010001
-- Veli hesabı (veli@atlas.k12.tr) Efe Demir ile eşleştirilir.

INSERT INTO academic_years (id, tenant_id, name, starts_on, ends_on, is_active)
VALUES (
    '00000000-0000-0000-0000-000000010401',
    '00000000-0000-0000-0000-000000010001',
    '2025-2026',
    '2025-09-08',
    '2026-06-19',
    true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO terms (id, tenant_id, academic_year_id, name, starts_on, ends_on, is_active)
VALUES (
    '00000000-0000-0000-0000-000000010402',
    '00000000-0000-0000-0000-000000010001',
    '00000000-0000-0000-0000-000000010401',
    '1. Dönem',
    '2025-09-08',
    '2026-01-23',
    true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO classes (id, tenant_id, name, level, branch)
VALUES
    ('00000000-0000-0000-0000-000000010501', '00000000-0000-0000-0000-000000010001', '5/A', 'Ortaokul', 'A'),
    ('00000000-0000-0000-0000-000000010502', '00000000-0000-0000-0000-000000010001', '5/B', 'Ortaokul', 'B'),
    ('00000000-0000-0000-0000-000000010503', '00000000-0000-0000-0000-000000010001', '6/A', 'Ortaokul', 'A'),
    ('00000000-0000-0000-0000-000000010504', '00000000-0000-0000-0000-000000010001', '6/B', 'Ortaokul', 'B'),
    ('00000000-0000-0000-0000-000000010505', '00000000-0000-0000-0000-000000010001', '7/A', 'Ortaokul', 'A'),
    ('00000000-0000-0000-0000-000000010506', '00000000-0000-0000-0000-000000010001', 'Ana Sınıfı', 'Okul Öncesi', 'A')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subjects (id, tenant_id, name, code)
VALUES
    ('00000000-0000-0000-0000-000000010601', '00000000-0000-0000-0000-000000010001', 'Matematik', 'MAT'),
    ('00000000-0000-0000-0000-000000010602', '00000000-0000-0000-0000-000000010001', 'Türkçe', 'TRK'),
    ('00000000-0000-0000-0000-000000010603', '00000000-0000-0000-0000-000000010001', 'Fen Bilimleri', 'FEN'),
    ('00000000-0000-0000-0000-000000010604', '00000000-0000-0000-0000-000000010001', 'Yaşam Becerileri', 'YAS')
ON CONFLICT (id) DO NOTHING;

UPDATE guardians
SET phone = '5320000001'
WHERE id = '00000000-0000-0000-0000-000000010413'
  AND (phone IS NULL OR phone = '');

INSERT INTO students (id, tenant_id, full_name, student_number, birth_date, status)
SELECT
    ('00000000-0000-0000-0100-' || lpad(n::text, 12, '0'))::uuid,
    '00000000-0000-0000-0000-000000010001',
    (ARRAY[
        'Defne Yılmaz',
        'Efe Demir',
        'Mina Kaya',
        'Kerem Akın',
        'Zeynep Şahin',
        'Emir Polat',
        'Selin Güneş',
        'Arda Yıldız',
        'Aras Çelik',
        'Elif Aydın',
        'Deniz Arslan',
        'Can Koç',
        'Ece Demir',
        'Burak Öztürk',
        'Gamze Kaya',
        'Hakan Çelik',
        'İrem Güneş',
        'Mehmet Yılmaz',
        'Ayşe Kara',
        'Fatma Polat',
        'Ali Demir',
        'Aylin Koç',
        'Doruk Aydın',
        'Eylül Şahin'
    ])[n],
    (ARRAY[
        'ATL5001', 'ATL5002', 'ATL5003', 'ATL5004',
        'ATL5005', 'ATL5006', 'ATL5007', 'ATL5008',
        'ATL6001', 'ATL6002', 'ATL6003', 'ATL6004',
        'ATL6005', 'ATL6006', 'ATL6007', 'ATL6008',
        'ATL7001', 'ATL7002', 'ATL7003', 'ATL7004',
        'ATLA001', 'ATLA002', 'ATLA003', 'ATLA004'
    ])[n],
    DATE '2014-03-15' + ((n - 1) * INTERVAL '47 days'),
    CASE WHEN n = 19 THEN 'passive' ELSE 'active' END
FROM generate_series(1, 24) AS n
WHERE NOT EXISTS (
    SELECT 1
    FROM students s
    WHERE s.tenant_id = '00000000-0000-0000-0000-000000010001'
      AND s.student_number = (ARRAY[
        'ATL5001', 'ATL5002', 'ATL5003', 'ATL5004',
        'ATL5005', 'ATL5006', 'ATL5007', 'ATL5008',
        'ATL6001', 'ATL6002', 'ATL6003', 'ATL6004',
        'ATL6005', 'ATL6006', 'ATL6007', 'ATL6008',
        'ATL7001', 'ATL7002', 'ATL7003', 'ATL7004',
        'ATLA001', 'ATLA002', 'ATLA003', 'ATLA004'
    ])[n]
);

INSERT INTO class_students (tenant_id, class_id, student_id, starts_on)
SELECT
    '00000000-0000-0000-0000-000000010001',
    (ARRAY[
        '00000000-0000-0000-0000-000000010501'::uuid,
        '00000000-0000-0000-0000-000000010501'::uuid,
        '00000000-0000-0000-0000-000000010501'::uuid,
        '00000000-0000-0000-0000-000000010501'::uuid,
        '00000000-0000-0000-0000-000000010502'::uuid,
        '00000000-0000-0000-0000-000000010502'::uuid,
        '00000000-0000-0000-0000-000000010502'::uuid,
        '00000000-0000-0000-0000-000000010502'::uuid,
        '00000000-0000-0000-0000-000000010503'::uuid,
        '00000000-0000-0000-0000-000000010503'::uuid,
        '00000000-0000-0000-0000-000000010503'::uuid,
        '00000000-0000-0000-0000-000000010503'::uuid,
        '00000000-0000-0000-0000-000000010504'::uuid,
        '00000000-0000-0000-0000-000000010504'::uuid,
        '00000000-0000-0000-0000-000000010504'::uuid,
        '00000000-0000-0000-0000-000000010504'::uuid,
        '00000000-0000-0000-0000-000000010505'::uuid,
        '00000000-0000-0000-0000-000000010505'::uuid,
        '00000000-0000-0000-0000-000000010505'::uuid,
        '00000000-0000-0000-0000-000000010505'::uuid,
        '00000000-0000-0000-0000-000000010506'::uuid,
        '00000000-0000-0000-0000-000000010506'::uuid,
        '00000000-0000-0000-0000-000000010506'::uuid,
        '00000000-0000-0000-0000-000000010506'::uuid
    ])[n],
    ('00000000-0000-0000-0100-' || lpad(n::text, 12, '0'))::uuid,
    DATE '2025-09-08'
FROM generate_series(1, 24) AS n
ON CONFLICT DO NOTHING;

INSERT INTO student_guardians (tenant_id, student_id, guardian_id, relation, is_primary)
VALUES (
    '00000000-0000-0000-0000-000000010001',
    '00000000-0000-0000-0100-000000000002',
    '00000000-0000-0000-0000-000000010413',
    'anne',
    true
)
ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, tenant_id, term_id, name, status, version, published_at, created_by)
VALUES (
    '00000000-0000-0000-0000-000000010701',
    '00000000-0000-0000-0000-000000010001',
    '00000000-0000-0000-0000-000000010402',
    '2025-2026 Güz Programı',
    'published',
    1,
    now(),
    '00000000-0000-0000-0000-000000010110'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO schedule_lessons (id, tenant_id, schedule_id, class_id, teacher_id, subject_id, day_of_week, starts_at, ends_at, room)
VALUES
    (
        '00000000-0000-0000-0107-000000000001',
        '00000000-0000-0000-0000-000000010001',
        '00000000-0000-0000-0000-000000010701',
        '00000000-0000-0000-0000-000000010501',
        '00000000-0000-0000-0000-000000010412',
        '00000000-0000-0000-0000-000000010601',
        1,
        TIME '09:00',
        TIME '09:40',
        'Derslik 5A'
    ),
    (
        '00000000-0000-0000-0107-000000000002',
        '00000000-0000-0000-0000-000000010001',
        '00000000-0000-0000-0000-000000010701',
        '00000000-0000-0000-0000-000000010501',
        '00000000-0000-0000-0000-000000010412',
        '00000000-0000-0000-0000-000000010602',
        1,
        TIME '10:00',
        TIME '10:40',
        'Derslik 5A'
    ),
    (
        '00000000-0000-0000-0107-000000000003',
        '00000000-0000-0000-0000-000000010001',
        '00000000-0000-0000-0000-000000010701',
        '00000000-0000-0000-0000-000000010503',
        '00000000-0000-0000-0000-000000010412',
        '00000000-0000-0000-0000-000000010601',
        2,
        TIME '09:00',
        TIME '09:40',
        'Derslik 6A'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, tenant_id, title, body, audience, published_at, created_by)
VALUES (
    '00000000-0000-0000-0000-000000010801',
    '00000000-0000-0000-0000-000000010001',
    'Atlas Koleji demo ortamı hazır',
    'Örnek sınıflar ve öğrenciler yüklendi. Müdür, öğretmen, rehberlik ve veli hesaplarıyla test edebilirsiniz.',
    'all',
    now() - INTERVAL '1 day',
    '00000000-0000-0000-0000-000000010110'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, sensitivity, metadata)
VALUES (
    '00000000-0000-0000-0000-000000010001',
    '00000000-0000-0000-0000-000000010110',
    'seed.demo_students',
    'students',
    'normal',
    '{"students":24,"classes":6,"guardian_links":1}'::jsonb
);
