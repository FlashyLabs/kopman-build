-- Phase 4: Billing + Connect account tracking

-- Add connect account ID to tenant_settings
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN NOT NULL DEFAULT FALSE;

-- RLS for tenant_settings (only allow own tenant)
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenant_settings
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

GRANT SELECT, INSERT, UPDATE ON tenant_settings TO buildos_app;

-- Add plan enum value if not exists (idempotent approach)
-- Note: Drizzle handles enum creation; this is for manual migration safety
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'plan'
  ) THEN
    CREATE TYPE plan AS ENUM ('starter', 'growth', 'enterprise');
  END IF;
END$$;

-- Index for webhook lookups by stripe_subscription_id
CREATE INDEX IF NOT EXISTS tenants_stripe_subscription_idx
  ON tenants (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tenants_stripe_customer_idx
  ON tenants (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
