# Phase 3 Implementation Guide
## Enterprise Expansion (Weeks 31-48, 100 hours, $150-200)

---

## Overview

Phase 3 transforms Engine A from a single-tenant system into a production-ready SaaS platform:
- **Multi-tenant data warehouse** with complete org isolation
- **REST API** with authentication, rate limiting, usage tracking
- **Billing & metering** with three pricing tiers
- **Admin console** for customer management
- **Enterprise connectors** with OAuth and webhooks

**Result by Week 48:** Production API ready for commercial customers

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Engine A Phase 3                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  REST API Layer                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ POST /v1/predictions/create                          │ │
│  │ GET  /v1/adapters                                    │ │
│  │ GET  /v1/metrics                                     │ │
│  │ POST /v1/organizations/setup                         │ │
│  │ (+ webhook endpoints for connectors)                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  Authentication & Authorization                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ API Key Validation                                   │ │
│  │ Rate Limiting (RPM + Monthly)                        │ │
│  │ Permission Checks (read, write, admin)               │ │
│  │ Quota Enforcement                                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  Secure Org Wrapper (Multi-Tenant Isolation)             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ enforceOrgContext: Wrap all queries with org_id      │ │
│  │ validateResult: Prevent cross-org data leakage       │ │
│  │ Permission enforcement: can_access, can_export, etc  │ │
│  │ Quota checking: API calls, storage, connectors       │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  Multi-Tenant Database (Supabase PostgreSQL)             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ organizations                 (tenants)              │ │
│  │ api_keys                      (per-org auth)         │ │
│  │ usage_events                  (metering)             │ │
│  │ invoices                      (billing)              │ │
│  │ org_learning_records          (isolated learning)    │ │
│  │ org_kb_documents              (isolated KB)          │ │
│  │ org_connectors                (isolated connectors)  │ │
│  │ audit_logs                    (immutable trail)      │ │
│  │                                                      │ │
│  │ Row-Level Security (RLS):                            │ │
│  │ - SELECT: only own org's rows                        │ │
│  │ - UPDATE: verify org ownership first                 │ │
│  │ - DELETE: only on specific tables                    │ │
│  │ - Audit logs: immutable (no delete)                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  Billing & Metering                                       │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ calculateMonthlyBill: Compute costs + overages       │ │
│  │ generateInvoice: Create line-item invoices           │ │
│  │ checkQuotaExceeded: Monitor usage limits             │ │
│  │ getUsageAnalytics: Trending and reporting            │ │
│  │                                                      │ │
│  │ Pricing Tiers:                                       │ │
│  │ - Pilot: $500/mo, 100k calls, 100GB                 │ │
│  │ - Professional: $999/mo, 1M calls, 500GB             │ │
│  │ - Enterprise: $5000+/mo, unlimited                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 3 Timeline (Weeks 31-48, 100 hours)

### Weeks 31-36: API + Multi-Tenant DB (30h)

**Week 31-32: REST API Implementation (16h)**
- Implement `EngineARestAPI` handler
- POST /v1/predictions/create endpoint
- GET /v1/adapters endpoint
- GET /v1/metrics endpoint
- Authentication middleware
- Rate limiting (per-key RPM, per-org monthly)
- Usage event logging

**Week 33-34: Multi-Tenant Database (14h)**
- Create Supabase schema:
  - `organizations` table
  - `api_keys` table with encryption
  - `usage_events` for metering
  - `invoices` for billing
  - `org_learning_records` (isolated per org)
  - `org_kb_documents` (isolated per org)
  - `org_connectors` (isolated per org)
  - `audit_logs` (immutable)
- Enable Row-Level Security (RLS) on all tables
- Create helper functions:
  - `get_monthly_usage(org_id)`
  - `check_rate_limit(org_id, api_key_id)`
  - `log_usage_event(...)`
- Test RLS policies (no cross-org data leakage)

**Deliverable:** Production REST API with multi-tenant isolation

---

### Weeks 37-42: Enterprise Connectors + Webhooks (30h)

**Week 37-38: Connector OAuth (16h)**
- Upgrade connector stubs to production:
  - Zendesk (helpdesk)
  - GitHub (code repos)
  - Make.com (automation)
  - Slack (team communication)
  - Custom connector template
- Implement OAuth 2.0 authentication
- Encrypt API credentials at rest
- Test connector connections

**Week 39-40: Webhook Sync + Reliability (14h)**
- Implement webhook endpoints for real-time sync
- Retry logic with exponential backoff
- Dead letter queue for failed events
- Circuit breaker pattern for failing connectors
- Automatic recovery and status reporting
- Test connector resilience (failure injection)

**Deliverable:** Enterprise connectors with OAuth + webhooks in production

---

### Weeks 43-48: Admin Console + Billing (40h)

**Week 43-44: Billing Engine (12h)**
- Implement `BillingEngine` (month-end billing automation)
- Calculate overage costs:
  - API call overages
  - Storage overages
  - Additional connector fees
- Generate monthly invoices (JSONL format)
- Store invoices in database
- Implement quota enforcement (soft + hard limits)

**Week 45-46: Admin Dashboard (16h)**
- UI: Connector management (enable/disable, sync logs)
- UI: API key manager (create, rotate, revoke)
- UI: Usage dashboards (API calls, storage, costs)
- UI: Billing & invoices (history, payment tracking)
- UI: Audit log viewer (searchable, immutable)
- UI: Team management (for professional tier)

**Week 47-48: Onboarding + Docs (12h)**
- Onboarding flow for new organizations
- API documentation (OpenAPI/Swagger)
- Customer setup guide
- Billing & usage guide
- Connector setup guide
- Troubleshooting guide

**Deliverable:** Production-ready admin console + billing automation

---

## Component Details

### REST API (`src/engine-a/phase-3/api/rest_api.ts`)

**Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/predictions/create` | POST | Make a prediction with org context |
| `/v1/adapters` | GET | List available adapters |
| `/v1/metrics` | GET | Get org's usage and quota status |
| `/v1/organizations/setup` | POST | Onboard new organization |
| `/v1/organizations` | GET | Get org details + connectors |

**Request Flow:**
1. Authentication: Validate API key against `api_keys` table
2. Rate Limiting: Check `check_rate_limit()` function
3. Permission Check: Verify `permissions` array
4. Route Handler: Call appropriate endpoint handler
5. Usage Logging: `log_usage_event()` with cost calculation
6. Response: Return with request_id, latency, cost

**Example Request:**
```bash
curl -X POST http://api.engine-a.com/v1/predictions/create \
  -H "Authorization: Bearer sk_prod_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "support",
    "input": "Customer: I keep getting authentication errors",
    "context": {"customer_id": "cust_123"}
  }'
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "prediction": "Priority: High. Route to: Auth team. Category: Security",
    "confidence": 0.92,
    "source": "local",
    "latency_ms": 145
  },
  "metadata": {
    "request_id": "req_1719864000123_a1b2c3d4",
    "timestamp": "2024-07-01T12:00:00Z",
    "latency_ms": 145,
    "cost_cents": 0.1
  }
}
```

---

### Multi-Tenant Database (`engine-a/phase-3/database/multi_tenant_schema.sql`)

**Key Tables:**

**organizations**
- `id, name, slug, owner_id`
- `subscription_tier` (pilot, professional, enterprise)
- `region` (us-east-1, eu-west-1, etc) - for data residency
- `api_call_quota_monthly, storage_quota_gb` - from tier
- `api_calls_used_this_month, storage_used_gb` - current usage
- RLS: Users see only their own orgs

**api_keys**
- `id, organization_id, key_prefix, key_hash`
- `permissions` (array: read, write, admin)
- `rate_limit_rpm, rate_limit_daily`
- `is_active, expires_at`
- RLS: Users see only their org's keys

**usage_events**
- `id, organization_id, api_key_id, endpoint, method`
- `latency_ms, tokens_input, tokens_output, cost_cents`
- `status_code, success, error_message`
- `request_id` for tracing
- RLS: Users see only their org's usage

**invoices**
- `id, organization_id, invoice_number`
- `period_start, period_end, due_date`
- `subtotal_cents, tax_cents, total_cents`
- `line_items` (JSONB array)
- `status` (draft, sent, paid, overdue)

**audit_logs** (immutable)
- `id, organization_id, action_type, resource_type, resource_id`
- `actor_id, actor_type` (user, system, api_key)
- `changes` (JSONB with before/after)
- `metadata, status, error_message`
- No DELETE permission (immutable)

---

### Secure Org Wrapper (`src/engine-a/phase-3/wrappers/secure_org_wrapper.ts`)

**Key Methods:**

```typescript
// Enforce org context on all queries
await wrapper.enforceOrgContext('operation_name', async () => {
  // Your query here - automatically wrapped with org_id filter
});

// Query learning records (org-isolated)
const records = await wrapper.queryLearningRecords('support', { priority: 'high' });

// Query knowledge base
const docs = await wrapper.queryKnowledgeBase('authentication', 'security');

// Get connectors
const connectors = await wrapper.getConnectors();

// Export data (with permission check)
const csv = await wrapper.exportData('learning_records', 'csv');

// Check quotas before operation
const withinLimits = await wrapper.checkQuotas('api_call');

// Get audit logs
const logs = await wrapper.getAuditLogs({
  action_type: 'api_call_made',
  start_date: new Date('2024-07-01'),
  end_date: new Date('2024-07-31'),
});
```

**Isolation Guarantees:**
- All queries automatically filtered by `organization_id`
- Results validated to prevent cross-org leakage
- Permissions enforced at operation level
- Audit logs immutable and queryable by customers

---

### Billing Engine (`src/engine-a/phase-3/billing/billing_engine.ts`)

**Pricing Tiers:**

**Pilot** ($500/month)
- 100,000 API calls/month
- 100 GB storage
- 3 active connectors
- 95% SLA
- Email support
- Features: Basic analytics, weekly reports

**Professional** ($999/month)
- 1,000,000 API calls/month
- 500 GB storage
- 5 active connectors
- 99.5% SLA
- Slack integration, team management
- Features: Advanced analytics, daily reports, custom webhooks

**Enterprise** ($5,000+/month)
- Unlimited API calls
- Unlimited storage
- Unlimited connectors
- 99.99% SLA
- Dedicated support
- Features: Real-time analytics, custom integrations, private deployment

**Overage Pricing:**
- API calls: $0.30-0.50 per 1,000 calls (depending on tier)
- Storage: $0.50-1.00 per GB (depending on tier)
- Additional connector: $30-50 each

**Monthly Billing Cycle:**
1. Calculate usage from `usage_events` table
2. Get current quotas from `organizations` table
3. Calculate overages:
   - API calls exceeding tier limit
   - Storage exceeding tier limit
   - Connectors exceeding tier limit
4. Generate line items:
   - Base subscription cost
   - Overage charges
   - Tax
5. Create invoice record
6. Mark as `sent` (ready for payment processing)

---

## Multi-Tenant Isolation Strategy

### Database Level (RLS)
```sql
-- Example: Users see only their org's API keys
CREATE POLICY "Users see only their org's API keys"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );
```

### Application Level (SecureOrgWrapper)
1. Every operation wrapped with `enforceOrgContext`
2. All queries filtered by `organization_id`
3. All results validated against org membership
4. Audit logged for every access

### Data Segregation
- Learning records stored per-org, encrypted at rest
- Knowledge base documents isolated per-org
- Connectors isolated per-org with encrypted credentials
- Audit logs immutable and queryable per-org

### Testing Isolation
```typescript
// Simulate cross-org breach attempt
const org1_data = await org1_wrapper.queryLearningRecords();
// Should only return org1's records, never org2's

const org2_data = await org2_wrapper.queryLearningRecords();
// Should only return org2's records, never org1's

// Attempting direct query with another org's ID should fail RLS
const direct = await supabase
  .from('org_learning_records')
  .select('*')
  .eq('organization_id', 'other_org_id');
// Returns empty (RLS blocks it)
```

---

## Success Metrics (Week 48)

✅ **API Reliability**
- [ ] 99% uptime across all endpoints
- [ ] All endpoints tested with >95% pass rate
- [ ] Rate limiting working correctly
- [ ] Cost tracking accurate within 1%

✅ **Multi-Tenant Isolation**
- [ ] No cross-org data leakage in any test
- [ ] RLS policies enforced on all tables
- [ ] Audit logs immutable and complete
- [ ] Encryption verified at rest

✅ **Billing**
- [ ] Monthly invoices generated automatically
- [ ] Cost calculations verified for all tiers
- [ ] Quota enforcement working (soft limits first)
- [ ] Overages calculated and charged correctly

✅ **Admin Console**
- [ ] Connector management UI working
- [ ] API key manager functional
- [ ] Usage dashboards showing accurate data
- [ ] Audit log viewer queryable
- [ ] Billing history visible

✅ **Documentation**
- [ ] API docs complete (OpenAPI format)
- [ ] Admin guide written
- [ ] Connector setup guide written
- [ ] Troubleshooting guide written

---

## Deployment Checklist (Week 48)

- [ ] Multi-tenant database deployed to Supabase
- [ ] RLS policies tested in production
- [ ] REST API deployed (Vercel/Railway/self-hosted)
- [ ] Admin console deployed
- [ ] Billing automation scheduled
- [ ] Monitoring + alerting configured
- [ ] Customer onboarding flow tested
- [ ] First pilot customer can login and use API
- [ ] Audit logs accessible to customers
- [ ] Documentation live and tested

---

## Next Steps (Phase 4: Weeks 49-60)

After Phase 3 is complete:
1. Load testing (1000 req/sec)
2. Connector resilience testing
3. Security review + penetration testing
4. Compliance preparation (SLA, audit, backup)
5. Go-live readiness check

---

**By end of Week 48:** Engine A is a production-ready SaaS platform with multi-tenant architecture, REST API, and automated billing.

Ready to onboard commercial customers.
