ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS enabled_modules JSONB NOT NULL DEFAULT '["scheduling","attendance","guidance","transport","billing"]'::jsonb;

UPDATE tenants
SET enabled_modules = '["scheduling","attendance","guidance","transport","billing"]'::jsonb
WHERE enabled_modules IS NULL OR enabled_modules = '[]'::jsonb;

