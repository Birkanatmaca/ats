CREATE TABLE IF NOT EXISTS homework_assignments (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    class_id UUID,
    course TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    attachment_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homework_assignments_tenant_due ON homework_assignments (tenant_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_tenant_class_due ON homework_assignments (tenant_id, class_id, due_date DESC);

CREATE TABLE IF NOT EXISTS homework_submissions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content TEXT NOT NULL DEFAULT '',
    file_key TEXT NOT NULL DEFAULT '',
    score NUMERIC(5,2),
    feedback TEXT NOT NULL DEFAULT '',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_homework_submissions_tenant_assignment ON homework_submissions (tenant_id, assignment_id, submitted_at DESC);
