-- File upload registry for resource-linked attachments

CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    file_key TEXT NOT NULL,
    original_name TEXT,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (tenant_id, file_key)
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_tenant_uploaded_at
    ON file_uploads (tenant_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_uploads_resource
    ON file_uploads (tenant_id, resource_type, resource_id, uploaded_at DESC);
