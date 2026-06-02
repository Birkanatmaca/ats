-- Rehberlik vaka dosyası
CREATE TABLE IF NOT EXISTS guidance_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    student_id UUID NOT NULL REFERENCES students(id),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    sensitivity TEXT NOT NULL DEFAULT 'guidance_confidential',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT guidance_cases_status_check CHECK (status IN ('open', 'monitoring', 'closed')),
    CONSTRAINT guidance_cases_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT guidance_cases_sensitivity_check CHECK (
        sensitivity IN ('standard', 'sensitive_student', 'guidance_confidential')
    )
);

CREATE TABLE IF NOT EXISTS guidance_case_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    case_id UUID NOT NULL REFERENCES guidance_cases(id),
    event_type TEXT NOT NULL DEFAULT 'note',
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    actor_user_id UUID NOT NULL REFERENCES users(id),
    visibility TEXT NOT NULL DEFAULT 'guidance_only',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT guidance_case_events_type_check CHECK (
        event_type IN ('note', 'meeting', 'plan', 'risk', 'status_change', 'file', 'follow_up')
    ),
    CONSTRAINT guidance_case_events_visibility_check CHECK (
        visibility IN ('guidance_only', 'principal_summary', 'shared_with_guardian')
    )
);

CREATE TABLE IF NOT EXISTS guidance_case_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    case_id UUID NOT NULL REFERENCES guidance_cases(id),
    participant_type TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    display_name TEXT NOT NULL DEFAULT '',
    relation TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT guidance_case_participants_type_check CHECK (
        participant_type IN ('teacher', 'guardian', 'counselor', 'principal')
    )
);

CREATE INDEX IF NOT EXISTS idx_guidance_cases_tenant_student ON guidance_cases (tenant_id, student_id, status);
CREATE INDEX IF NOT EXISTS idx_guidance_cases_tenant_status ON guidance_cases (tenant_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_guidance_case_events_case ON guidance_case_events (tenant_id, case_id, occurred_at DESC);
