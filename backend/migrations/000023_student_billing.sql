-- Student billing: payment plans, installments, payments and guardian-facing account snapshots

CREATE TABLE IF NOT EXISTS billing_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_accounts_tenant_status
    ON billing_accounts (tenant_id, status);

CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    billing_account_id UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    currency TEXT NOT NULL DEFAULT 'TRY',
    start_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_plans_account_status
    ON payment_plans (tenant_id, billing_account_id, status);

CREATE TABLE IF NOT EXISTS payment_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_installments_tenant_due
    ON payment_installments (tenant_id, due_date, status);

CREATE INDEX IF NOT EXISTS idx_payment_installments_plan
    ON payment_installments (tenant_id, payment_plan_id);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    installment_id UUID NOT NULL REFERENCES payment_installments(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL DEFAULT 'other' CHECK (method IN ('cash', 'bank_transfer', 'card', 'other')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    void BOOLEAN NOT NULL DEFAULT false,
    voided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_installment
    ON payments (tenant_id, installment_id, paid_at DESC);
