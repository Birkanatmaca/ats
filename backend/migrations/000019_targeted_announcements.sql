-- Targeted announcements: audiences, reads, templates, lifecycle status.

ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE announcements
SET status = CASE
    WHEN published_at IS NOT NULL THEN 'published'
    ELSE 'draft'
END
WHERE status IS NULL OR status = 'published';

CREATE TABLE IF NOT EXISTS announcement_audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    audience_type TEXT NOT NULL,
    audience_id UUID,
    role_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_audiences_announcement
    ON announcement_audiences (tenant_id, announcement_id);

CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement
    ON announcement_reads (tenant_id, announcement_id);

CREATE TABLE IF NOT EXISTS announcement_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_templates_tenant
    ON announcement_templates (tenant_id, category);

-- Backfill audiences from legacy audience string column.
INSERT INTO announcement_audiences (tenant_id, announcement_id, audience_type, audience_id, role_code)
SELECT
    a.tenant_id,
    a.id,
    CASE
        WHEN a.audience = 'all' THEN 'all'
        WHEN a.audience IN ('teachers', 'guardians', 'guidance', 'principal') THEN 'role'
        WHEN a.audience LIKE 'class:%' THEN 'class'
        ELSE 'role'
    END,
    CASE
        WHEN a.audience LIKE 'class:%' THEN NULLIF(split_part(a.audience, ':', 2), '')::uuid
        ELSE NULL
    END,
    CASE
        WHEN a.audience = 'all' THEN NULL
        WHEN a.audience = 'teachers' THEN 'teacher'
        WHEN a.audience = 'guardians' THEN 'guardian'
        WHEN a.audience IN ('guidance', 'principal') THEN a.audience
        WHEN a.audience LIKE 'class:%' THEN NULL
        ELSE a.audience
    END
FROM announcements a
WHERE NOT EXISTS (
    SELECT 1 FROM announcement_audiences aa
    WHERE aa.announcement_id = a.id AND aa.tenant_id = a.tenant_id
);
