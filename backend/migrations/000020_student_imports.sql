CREATE TABLE IF NOT EXISTS student_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    status TEXT NOT NULL DEFAULT 'draft',
    file_name TEXT NOT NULL DEFAULT '',
    uploaded_by UUID REFERENCES users(id),
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    warning_rows INT NOT NULL DEFAULT 0,
    error_rows INT NOT NULL DEFAULT 0,
    imported_rows INT NOT NULL DEFAULT 0,
    options JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_import_jobs_tenant
    ON student_import_jobs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS student_import_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    job_id UUID NOT NULL REFERENCES student_import_jobs(id) ON DELETE CASCADE,
    row_number INT NOT NULL,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'valid',
    error_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_student_id UUID REFERENCES students(id),
    created_guardian_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_import_rows_job
    ON student_import_rows (tenant_id, job_id, row_number);
