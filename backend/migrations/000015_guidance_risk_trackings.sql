-- Rehberlikçi tarafından manuel risk takibi
CREATE TABLE IF NOT EXISTS guidance_risk_trackings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    student_id UUID NOT NULL REFERENCES students(id),
    counselor_id UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guidance_risk_trackings_active_student
    ON guidance_risk_trackings (tenant_id, student_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guidance_risk_trackings_tenant_created
    ON guidance_risk_trackings (tenant_id, created_at DESC)
    WHERE deleted_at IS NULL;
