INSERT INTO platform_settings (key, value, is_secret, updated_at)
VALUES
  ('mail_config', '{"enabled":false,"provider":"smtp","port":587,"useTls":true}', false, now()),
  ('sms_config', '{"enabled":false,"provider":"netgsm"}', false, now())
ON CONFLICT (key) DO NOTHING;
