/**
 * Phase 3: Multi-Tenant Database Schema
 * Supabase PostgreSQL implementation
 * Org isolation + API keys + usage tracking + billing
 */

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL,

  -- Subscription
  subscription_tier TEXT DEFAULT 'pilot', -- pilot, professional, enterprise
  subscription_status TEXT DEFAULT 'active', -- active, paused, cancelled
  subscription_started_at TIMESTAMP DEFAULT now(),

  -- Data residency & compliance
  region TEXT DEFAULT 'us-east-1', -- us-east-1, eu-west-1, etc
  data_classification TEXT DEFAULT 'standard', -- standard, sensitive, highly_sensitive

  -- Rate limits & quotas
  api_call_quota_monthly INTEGER DEFAULT 100000, -- per month
  api_calls_used_this_month INTEGER DEFAULT 0,
  storage_quota_gb DECIMAL DEFAULT 100,
  storage_used_gb DECIMAL DEFAULT 0,

  -- Configuration
  settings JSONB DEFAULT '{}', -- custom settings per org

  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  -- Audit
  created_by UUID,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_owner ON organizations(owner_id);

-- API Keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  key_prefix TEXT NOT NULL, -- public part (e.g., "sk_prod_abc123")
  key_hash TEXT NOT NULL UNIQUE, -- hashed secret for comparison

  name TEXT NOT NULL, -- "Production", "Staging", etc
  description TEXT,

  -- Permissions
  permissions TEXT[] DEFAULT ARRAY['read', 'write'],

  -- Rate limiting
  rate_limit_rpm INTEGER DEFAULT 60, -- requests per minute
  rate_limit_daily INTEGER DEFAULT 100000,

  -- Lifecycle
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP, -- optional expiration

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Usage tracking
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id),

  -- Request details
  endpoint TEXT NOT NULL, -- e.g., "/v1/predictions/create"
  method TEXT NOT NULL, -- GET, POST, etc

  -- Metrics
  latency_ms INTEGER,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_cents DECIMAL DEFAULT 0,

  -- Status
  status_code INTEGER,
  success BOOLEAN,
  error_message TEXT,

  -- Metadata
  user_id UUID,
  request_id TEXT NOT NULL UNIQUE,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_usage_org ON usage_events(organization_id);
CREATE INDEX idx_usage_created ON usage_events(created_at);
CREATE INDEX idx_usage_endpoint ON usage_events(endpoint);

-- Billing/Invoice tracking
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Amounts
  subtotal_cents DECIMAL NOT NULL,
  tax_cents DECIMAL DEFAULT 0,
  total_cents DECIMAL NOT NULL,

  -- Breakdown
  line_items JSONB NOT NULL, -- [{description, quantity, unit_price_cents, amount_cents}]

  -- Payment
  due_date DATE,
  paid_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Connectors per organization
CREATE TABLE org_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  connector_type TEXT NOT NULL, -- database, helpdesk, github, etc
  connector_name TEXT NOT NULL, -- e.g., "Zendesk Support"

  -- Authentication
  auth_type TEXT NOT NULL, -- oauth, api_key, basic
  oauth_token BYTEA, -- encrypted
  api_key_encrypted BYTEA, -- encrypted

  -- Configuration
  config JSONB DEFAULT '{}',

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  is_syncing BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP,
  last_sync_status TEXT, -- success, failed, partial
  last_error TEXT,

  -- Metrics
  sync_frequency_minutes INTEGER DEFAULT 60,
  data_records_synced INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_org_connectors ON org_connectors(organization_id);
CREATE INDEX idx_org_connectors_type ON org_connectors(connector_type);

-- Learning records per organization
CREATE TABLE org_learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Domain & type
  domain TEXT NOT NULL, -- support, code, automation, business
  record_type TEXT NOT NULL,

  -- Content
  input_text TEXT,
  output_text TEXT,
  context JSONB,

  -- Quality signals
  quality_score INTEGER,
  user_feedback TEXT,
  accepted BOOLEAN,

  -- Source
  source_system TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_org_learning_records ON org_learning_records(organization_id);
CREATE INDEX idx_org_learning_domain ON org_learning_records(domain);

-- Knowledge Base documents per organization
CREATE TABLE org_kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  content TEXT,
  category TEXT,

  -- Classification
  classification TEXT DEFAULT 'internal', -- public, internal, sensitive

  -- Metadata
  source_url TEXT,
  created_by UUID,

  -- Versioning
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMP DEFAULT now(),

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_org_kb_org ON org_kb_documents(organization_id);
CREATE INDEX idx_org_kb_category ON org_kb_documents(category);

-- Audit logs (immutable)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Action details
  action_type TEXT NOT NULL, -- prediction_made, connector_synced, data_accessed, config_changed
  resource_type TEXT NOT NULL,
  resource_id UUID,

  -- Actor
  actor_id UUID,
  actor_type TEXT DEFAULT 'user', -- user, system, api_key

  -- Details
  changes JSONB, -- before/after for updates
  metadata JSONB,

  -- Status
  status TEXT DEFAULT 'success', -- success, failure, partial
  error_message TEXT,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);

-- Row Level Security (RLS) policies

-- Organizations: Users can only see their own org
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their organizations"
  ON organizations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can update their own org"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- API Keys: RLS via organization
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their org's API keys"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Usage Events: RLS via organization
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their org's usage"
  ON usage_events FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Learning Records: Strict isolation
ALTER TABLE org_learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their org's learning records"
  ON org_learning_records FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Audit Logs: Immutable (SELECT only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their org's audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Functions for common operations

-- Calculate org's current usage for the month
CREATE OR REPLACE FUNCTION get_monthly_usage(org_id UUID)
RETURNS TABLE (
  api_calls INTEGER,
  tokens_used INTEGER,
  cost_cents DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as api_calls,
    SUM(COALESCE(tokens_input, 0) + COALESCE(tokens_output, 0))::INTEGER as tokens_used,
    SUM(COALESCE(cost_cents, 0))::DECIMAL as cost_cents
  FROM usage_events
  WHERE organization_id = org_id
    AND created_at >= date_trunc('month', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if org is within rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(org_id UUID, api_key_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  org_quota INTEGER;
  org_used INTEGER;
  key_rpm_limit INTEGER;
  key_rpm_used INTEGER;
BEGIN
  -- Check monthly quota
  SELECT api_call_quota_monthly, api_calls_used_this_month
  INTO org_quota, org_used
  FROM organizations
  WHERE id = org_id;

  IF org_used >= org_quota THEN
    RETURN false;
  END IF;

  -- Check per-key rate limit (requests per minute)
  SELECT rate_limit_rpm
  INTO key_rpm_limit
  FROM api_keys
  WHERE id = api_key_id;

  SELECT COUNT(*)
  INTO key_rpm_used
  FROM usage_events
  WHERE api_key_id = api_key_id
    AND created_at > now() - INTERVAL '1 minute';

  IF key_rpm_used >= key_rpm_limit THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log usage event
CREATE OR REPLACE FUNCTION log_usage_event(
  org_id UUID,
  key_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_latency_ms INTEGER,
  p_tokens_input INTEGER,
  p_tokens_output INTEGER,
  p_cost_cents DECIMAL,
  p_status_code INTEGER,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO usage_events (
    organization_id, api_key_id, endpoint, method,
    latency_ms, tokens_input, tokens_output, cost_cents,
    status_code, success, error_message, request_id
  ) VALUES (
    org_id, key_id, p_endpoint, p_method,
    p_latency_ms, p_tokens_input, p_tokens_output, p_cost_cents,
    p_status_code, p_success, p_error_message, gen_random_uuid()::text
  ) RETURNING id INTO event_id;

  -- Update org usage counters
  UPDATE organizations
  SET
    api_calls_used_this_month = api_calls_used_this_month + 1,
    storage_used_gb = storage_used_gb + (p_tokens_input + p_tokens_output)::DECIMAL / 1000000
  WHERE id = org_id;

  -- Log audit trail
  INSERT INTO audit_logs (
    organization_id, action_type, resource_type, resource_id,
    actor_type, metadata, status
  ) VALUES (
    org_id, 'api_call_made', 'prediction', event_id,
    'api_key', jsonb_build_object(
      'endpoint', p_endpoint,
      'status_code', p_status_code,
      'latency_ms', p_latency_ms
    ), CASE WHEN p_success THEN 'success' ELSE 'failure' END
  );

  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
