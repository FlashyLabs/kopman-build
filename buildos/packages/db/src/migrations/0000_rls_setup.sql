-- Enable Row-Level Security on all tenant-scoped tables
-- All queries must set app.current_tenant_id via SET LOCAL before executing

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_quote_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies: all reads/writes restricted to current_tenant_id

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON contacts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON project_expenses
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON quotes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON referrals
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON media_assets
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON ai_quote_jobs
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Application role (limited privileges, RLS enforced)
CREATE ROLE buildos_app LOGIN PASSWORD 'CHANGE_ME_IN_ENV';
GRANT CONNECT ON DATABASE postgres TO buildos_app;
GRANT USAGE ON SCHEMA public TO buildos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO buildos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO buildos_app;

-- Superuser bypass role for migrations only
CREATE ROLE buildos_migrator LOGIN PASSWORD 'CHANGE_ME_IN_ENV' BYPASSRLS;
GRANT ALL PRIVILEGES ON DATABASE postgres TO buildos_migrator;
