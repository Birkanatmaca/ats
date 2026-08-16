INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES ('ai_provider_keys', '[]', true, now())
ON CONFLICT (key) DO NOTHING;
