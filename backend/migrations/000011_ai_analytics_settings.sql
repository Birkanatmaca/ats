INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES
  ('ai_input_cost_per_1m_usd', '0.15', false, now()),
  ('ai_output_cost_per_1m_usd', '0.60', false, now()),
  ('ai_usd_try_rate', '34.50', false, now())
ON CONFLICT (key) DO NOTHING;
