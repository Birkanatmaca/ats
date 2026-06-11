INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES
  ('ai_model', 'gpt-4o-mini', false, now()),
  ('ai_use_llm', 'true', false, now())
ON CONFLICT (key) DO NOTHING;
