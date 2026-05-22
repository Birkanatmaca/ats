-- Rehberlik notları ve destek planları
CREATE TABLE IF NOT EXISTS guidance_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    student_id UUID NOT NULL REFERENCES students(id),
    author_id UUID NOT NULL REFERENCES users(id),
    note_type TEXT NOT NULL DEFAULT 'meeting',
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    sensitivity TEXT NOT NULL DEFAULT 'guidance_confidential',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT guidance_notes_type_check CHECK (
        note_type IN ('meeting', 'parent_contact', 'follow_up', 'observation', 'report')
    )
);

CREATE TABLE IF NOT EXISTS support_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    student_id UUID NOT NULL REFERENCES students(id),
    owner_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT support_plans_status_check CHECK (status IN ('open', 'monitoring', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_guidance_notes_tenant_student ON guidance_notes (tenant_id, student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_plans_tenant_student ON support_plans (tenant_id, student_id, due_date);
