# Phase 1: Operationalization & Framework Intelligence Layer

**Timeline:** Weeks 5-12 (8 weeks, 60 hours solo)  
**Budget:** $0-50 (optional Claude reviews)  
**Goal:** Transform Phase 0 inventory into executable Engine A core

---

## What Phase 1 Delivers

✅ **Framework Intelligence Layer** - 150+ frameworks cleaned, normalized, operationalized with selection logic  
✅ **Workflow Operationalization** - 5+ priority workflows with executable specifications  
✅ **Standalone Analyzer** - Classify → Retrieve → Route logic (no LLM calls)  
✅ **Business Guardrails** - Validation ensuring Engine A stays business-focused  
✅ **Learning System** - Capture 100+ records/month for Phase 2 retraining  
✅ **Org Wrapper Template** - Multi-tenant isolation ready for Phase 3

---

## Architecture

### 1. Framework Intelligence Layer

**File:** `framework/framework-operationalization.ts`

Transform raw frameworks into operational intelligence:

```
Framework → Use Case → Recommended When → Required Evidence → Output Type
           ↓
      Selection Logic (40% domain + 30% type + 30% confidence)
           ↓
      Top 3 Matches with Evidence Fit Score
```

**Key Functions:**
- `selectBestFrameworks()` - Rank frameworks by domain/type/evidence match
- `validateFramework()` - Check completeness
- `findDuplicates()` - Identify merge candidates
- `operationalizeFrameworkDatabase()` - Batch process all 150+ frameworks

**Success Criteria:**
- All 150+ frameworks cleaned and normalized
- Framework selection accuracy >85% on 50 test problems
- All frameworks linked to related workflows

### 2. Workflow Operationalization

**File:** `workflows/workflow-operationalization.ts`

Define 5 priority workflows as executable specifications:

1. **Operational Health Assessment**
   - Input: scope (team/dept/org), time_period (week/month/quarter)
   - Output: health_score (0-100), risk_level, alerts, recommendations
   - Frameworks: Theory of Constraints, Balanced Scorecard, Process Capability
   - Success: Score ±5% accurate vs manual

2. **Process Bottleneck Detection**
   - Input: process_name, baseline_throughput
   - Output: bottleneck_step, constraint_magnitude, improvement_potential
   - Frameworks: TOC, Value Stream Mapping
   - Success: Identifies actual bottleneck

3. **Root Cause Analysis**
   - Input: problem_statement, impact_level
   - Output: root_cause, contributing_factors, recommended_fix, prevention_plan
   - Frameworks: 5-Why, Fishbone, Fault Tree
   - Success: Fix addresses root cause, not symptom

4. **Project Prioritization**
   - Input: projects[], effort[], business_value[]
   - Output: prioritized_projects[], justification, timeline
   - Frameworks: RICE, Value vs Effort, Strategic Alignment
   - Success: Alignment with strategic goals, realistic timeline

5. **Risk Classification**
   - Input: risk_description, potential_impact, likelihood
   - Output: risk_score (0-100), risk_level, mitigation_plan, monitoring_plan
   - Frameworks: Risk Matrix, FMEA, Risk Heat Map
   - Success: Score consistent with org risk appetite

**Each Workflow Includes:**
- Trigger conditions (manual/scheduled/event/threshold)
- Input/output JSON schemas
- Execution steps with framework references
- Success criteria for validation
- Follow-up workflows (chaining)
- Approval requirements

### 3. Standalone Analyzer

**File:** `analyzer/analyzer.ts`

POST /engine-a/analyze endpoint with zero LLM calls:

```typescript
analyzeRequest(problem, context, org_id) →
  1. Business context gate (validate business-focused)
  2. Classify problem (domain + type)
  3. Select frameworks (top 3 matches)
  4. Route to workflow (if confidence >85%)
  5. Score confidence & risk
  6. Generate recommendations
  7. Create learning record
  8. Return audit trail
```

**Confidence Scoring:**
- Framework matching: 40% domain + 30% type + 30% source quality
- Evidence fit: 0-100 based on available data
- Risk assessment: by problem severity
- Business impact: by domain

**Output:**
```json
{
  "result": {
    "classification": { "domain", "type", "business_focused", "severity" },
    "frameworks": [{ "id", "name", "confidence" }],
    "workflow": "workflow-id",
    "recommendations": ["..."]
  },
  "confidence": 0.82,
  "audit_id": "uuid"
}
```

**Success Criteria:**
- 80%+ confidence on 50 test problems
- Domain classification accuracy >85%
- Framework selection relevance >80%

### 4. Business Guardrails

**File:** `guardrails/business-guardrails.ts`

Prevent Engine A from drifting toward general knowledge:

**Business Keywords:** operations, workflow, process, revenue, cost, team, project, support, diagnose, decision, etc.

**Forbidden Keywords:** poem, story, joke, game, math homework, trivia, general knowledge, etc.

**Logic:**
- 2+ business keywords → allow (business-focused)
- 0-1 business keywords → reject (use Claude)
- Any forbidden keywords → reject immediately
- Drift detection: warn if <70% recent requests are business-focused

**Success Criteria:**
- 95%+ accuracy on 200+ test cases
- Zero drift to general knowledge
- Monitoring and logging in place

### 5. Learning System

**Files:**
- `learning/phase-1-learning-schema.sql` - Database schema
- `learning/phase-1-consolidation.ts` - Pattern extraction

**Capture 100+ records/month from:**
- Engine A analyzer usage
- Workflow executions
- User feedback (accepted/rejected)
- Framework/workflow pairing patterns

**Weekly Consolidation:**
```
100+ records → group by framework/workflow → extract statistics
             ↓
Framework Usage: count, avg_confidence, success_rate, top_patterns
Workflow Exec: executions, avg_time, success_rate
Insights: top performers, anomalies, trends
```

**Monthly Consolidation:**
```
4 weeks of weekly data → aggregate trends → identify high-quality records
                      ↓
Top frameworks/workflows by usage & success
Confidence/success trends (improving/stable/declining)
Retraining candidates (high-quality + accepted + reusable)
```

**Success Criteria:**
- 100+ learning records captured per month
- Monthly consolidation automated and running
- Learning patterns visible (what frameworks succeed)

### 6. Organization Wrapper Template

**File:** `wrappers/org-wrapper-template.ts`

Define org isolation for Phase 3:

```typescript
OrgWrapper {
  connectors: { database, helpdesk, github, crm, custom[] }
  data_access: { allowed_datasets, forbidden_datasets, pii_handling }
  workflows: { enabled_workflows, disabled_workflows, required_approval_workflows }
  approval_gates: { workflow, action, export, high_risk }
  audit_rules: { log_all, retention_days, encryption }
  learning_rules: { 
    capture_learning: true,
    share_with_other_orgs: FALSE (CRITICAL),
    training_data_usage: "org_only"
  }
}
```

**Enforcement:**
- Verify org_id matches request
- Check if workflow enabled for org
- Apply data filters from wrapper
- Determine if approval required
- Create audit trail
- Enforce learning isolation (never share with other orgs)

**Success Criteria:**
- Org wrapper template complete
- Connector stubs defined
- Isolation boundaries proven

---

## Implementation Timeline

| Week | Focus | Deliverable |
|------|-------|-------------|
| 5-6 | Framework Intelligence | Frameworks operationalized, selection logic working |
| 5-6 | Workflow Specs | 5 priority workflows with full specs |
| 7-8 | Guardrails | Business context gate, drift detection |
| 7-8 | Learning Capture | Schema created, extraction logic ready |
| 9-10 | Analyzer | POST /analyze endpoint working on 50 problems |
| 9-10 | Consolidation | Weekly/monthly consolidation automated |
| 11-12 | Org Wrapper | Template complete, enforcement proven |
| 11-12 | Testing & Docs | All tested, docs generated, ready for Phase 2 |

---

## File Structure

```
phase-1/
├── analyzer/
│   └── analyzer.ts                    # Lightweight analyzer (no LLM calls)
│
├── framework/
│   └── framework-operationalization.ts # Framework selection logic
│
├── workflows/
│   └── workflow-operationalization.ts  # 5 priority workflows
│
├── guardrails/
│   └── business-guardrails.ts         # Business context validation
│
├── wrappers/
│   └── org-wrapper-template.ts        # Org isolation template
│
├── learning/
│   ├── phase-1-learning-schema.sql    # Database schema (tables, functions, indexes)
│   └── phase-1-consolidation.ts       # Weekly/monthly pattern extraction
│
├── PHASE_1_BUILD_PLAN.md              # Original 12-week plan
├── PHASE_1_OPERATIONALIZATION.md      # Extended specification
└── README.md                           # This file
```

---

## Success Criteria Checklist

### Framework Intelligence
- [ ] Framework DB cleaned (all 150+ normalized)
- [ ] All frameworks have use_case, evidence requirements, output types
- [ ] Framework selection logic works (test on 50 problems)
- [ ] Framework accuracy >85%

### Workflows Operationalized
- [ ] 5+ priority workflows with complete specs
- [ ] Each workflow has trigger, input, output, execution, success criteria
- [ ] Workflow routing works (test on 50 problems)
- [ ] Workflow accuracy >80%

### Standalone Analyzer
- [ ] POST /engine-a/analyze endpoint working
- [ ] Classifies problem → selects frameworks → routes to workflow
- [ ] Returns reasoning + audit trail
- [ ] Works on 50 test problems with 80%+ confidence

### Business Guardrails
- [ ] Business context gate working
- [ ] Non-business questions rejected cleanly
- [ ] 95%+ accuracy on 200+ test cases
- [ ] No drift to general knowledge

### Learning System
- [ ] 100+ records captured per month
- [ ] Weekly consolidation automated
- [ ] Monthly consolidation running
- [ ] Learning patterns visible

### Org Wrapper Template
- [ ] OrgWrapper interface complete
- [ ] Connector configs for database, helpdesk, github, crm, custom
- [ ] Data access boundaries enforced
- [ ] Learning isolation ALWAYS false (share_with_other_orgs)
- [ ] Enforcement logic proven

---

## Ready for Phase 2 When:

✅ Analyzer working on 50 test problems with >80% confidence  
✅ Learning system capturing 100+ records/month  
✅ All frameworks linked to workflows  
✅ Org wrapper template approved  
✅ Business guardrails preventing drift  

→ **Phase 2:** Learning System + 4 Production Adapters (Weeks 1-16)

---

## Key Design Decisions

**No LLM Calls in Phase 1:** All intelligence is structured analysis (classification, matching, routing). LLMs added in Phase 2 for synthesis and adaptation.

**Business-First Guardrails:** Prevent drift to general knowledge using keyword validation + drift detection + learning metrics.

**Org Isolation from Day 1:** Org wrapper template designed for Phase 3 but enforced in Phase 1 learning (share_with_other_orgs ALWAYS false).

**Learning as Feedback Loop:** Every analyzer request creates a learning record. Monthly consolidation identifies patterns. Phase 2 uses these patterns to retrain adapters (+1-2% monthly improvement).

**File-Based, Git-Tracked:** All workflows, frameworks, templates in version control for reproducibility and change tracking.

---

## Integration with Phase 2

Phase 1 provides the foundation that Phase 2 builds on:

- **Framework intelligence** → used by all 4 adapters
- **5 priority workflows** → integrated into orchestrator
- **Learning records** → feed monthly retraining cycle
- **Business guardrails** → enforced at orchestrator entry point
- **Org wrapper template** → deployed in Phase 2 multi-tenancy

When Phase 1 is complete, Phase 2 can:
1. Deploy orchestrator with 4 specialized adapters
2. Retrain adapters monthly using Phase 1 learning records
3. Scale to multiple organizations using org wrapper template
4. Maintain business focus using guardrails

---

## References

- `PHASE_1_BUILD_PLAN.md` - Original 12-week implementation plan
- `PHASE_1_OPERATIONALIZATION.md` - Extended workstream specifications
- Phase 2 README - Learning system and adapter training details
