INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES
  ('billing_price_per_student_usd', '15', false, now()),
  ('billing_usd_try_rate', '34.50', false, now()),
  ('billing_quote_validity_days', '30', false, now()),
  ('billing_company_name', 'OGTA Platform', false, now()),
  ('billing_company_email', 'billing@ogta.ai', false, now())
ON CONFLICT (key) DO NOTHING;
