ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ai_daily_message_limit INTEGER,
  ADD COLUMN IF NOT EXISTS ai_monthly_token_limit INTEGER;

COMMENT ON COLUMN tenants.ai_daily_message_limit IS 'Kurum geneli günlük ogta.ai kullanıcı mesaj limiti; NULL ise platform varsayılanı.';
COMMENT ON COLUMN tenants.ai_monthly_token_limit IS 'Kurum geneli aylık token limiti (input+output); NULL ise sınırsız.';
