-- Phase 5: Marketplace, Video Quote Jobs, White-label

-- Enums
CREATE TYPE IF NOT EXISTS marketplace_status AS ENUM ('draft','active','paused','suspended');
CREATE TYPE IF NOT EXISTS lead_route_status AS ENUM ('available','claimed','closed','expired');
CREATE TYPE IF NOT EXISTS video_job_status AS ENUM ('pending','uploading','extracting','analyzing','complete','failed');

-- Marketplace profiles
CREATE TABLE IF NOT EXISTS marketplace_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  status              marketplace_status NOT NULL DEFAULT 'draft',
  display_name        TEXT NOT NULL,
  tagline             TEXT,
  description         TEXT,
  logo_url            TEXT,
  cover_image_url     TEXT,
  service_types       TEXT[] NOT NULL DEFAULT '{}',
  service_areas       TEXT[] NOT NULL DEFAULT '{}',
  avg_rating          REAL,
  review_count        INT NOT NULL DEFAULT 0,
  projects_completed  INT NOT NULL DEFAULT 0,
  lead_price_floor    INT NOT NULL DEFAULT 2500,
  accepting_leads     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marketplace leads
CREATE TABLE IF NOT EXISTS marketplace_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_tenant_id      UUID REFERENCES tenants(id) ON DELETE SET NULL,
  claimed_by_tenant_id  UUID REFERENCES tenants(id) ON DELETE SET NULL,
  status                lead_route_status NOT NULL DEFAULT 'available',
  project_type          TEXT NOT NULL,
  city                  TEXT NOT NULL,
  neighbourhood         TEXT,
  estimated_value       INT,
  summary               TEXT,
  photo_urls            TEXT[] NOT NULL DEFAULT '{}',
  list_price            INT NOT NULL,
  commission_rate       REAL NOT NULL DEFAULT 0.10,
  expires_at            TIMESTAMPTZ NOT NULL,
  claimed_at            TIMESTAMPTZ,
  contact_released_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mp_leads_status_idx ON marketplace_leads(status);
CREATE INDEX IF NOT EXISTS mp_leads_city_type_idx ON marketplace_leads(city, project_type);

-- Lead purchases
CREATE TABLE IF NOT EXISTS lead_purchases (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_lead_id       UUID NOT NULL REFERENCES marketplace_leads(id),
  buyer_tenant_id           UUID NOT NULL REFERENCES tenants(id),
  price_paid_cents          INT NOT NULL,
  platform_fee_cents        INT NOT NULL,
  stripe_payment_intent_id  TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lp_buyer_idx ON lead_purchases(buyer_tenant_id);
CREATE INDEX IF NOT EXISTS lp_lead_idx ON lead_purchases(marketplace_lead_id);

-- Video quote jobs
CREATE TABLE IF NOT EXISTS video_quote_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id               UUID NOT NULL REFERENCES leads(id),
  video_url             TEXT NOT NULL,
  status                video_job_status NOT NULL DEFAULT 'pending',
  extracted_frame_urls  TEXT[] NOT NULL DEFAULT '{}',
  frame_count           INT NOT NULL DEFAULT 0,
  raw_analysis_output   JSONB,
  draft_quote_id        UUID,
  worker_job_id         TEXT,
  error                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS video_jobs_tenant_idx ON video_quote_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS video_jobs_status_idx ON video_quote_jobs(status);

ALTER TABLE video_quote_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON video_quote_jobs
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- White-label configs
CREATE TABLE IF NOT EXISTS whitelabel_configs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  custom_domain  TEXT,
  brand_name     TEXT NOT NULL,
  primary_color  VARCHAR(7) NOT NULL DEFAULT '#14B8A6',
  logo_url       TEXT,
  favicon_url    TEXT,
  support_email  TEXT,
  hide_built_with BOOLEAN NOT NULL DEFAULT FALSE,
  custom_css     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant app role access to new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace_profiles TO buildos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace_leads TO buildos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON lead_purchases TO buildos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON video_quote_jobs TO buildos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON whitelabel_configs TO buildos_app;

-- Expire stale marketplace leads (run as a cron job / pg_cron)
-- SELECT cron.schedule('expire-marketplace-leads', '*/30 * * * *',
--   'UPDATE marketplace_leads SET status = ''expired'' WHERE status = ''available'' AND expires_at < NOW()');
