# PHASE 1: OPERATIONALIZATION & FRAMEWORK INTELLIGENCE LAYER

## Complete Implementation Plan (Weeks 1-12)

**Timeline:** 12 weeks  
**Effort:** 60 hours solo  
**Budget:** $0-50  
**Output:** Operational framework intelligence layer + 5 priority workflows + business guardrails + org wrapper template

---

## PHASE 1 OVERVIEW

Phase 1 transforms the Phase 0 inventory into executable Engine A:

- **Framework Intelligence Layer**: Clean, normalize, and operationalize 150+ frameworks
- **Workflow Operationalization**: Convert 100+ workflow descriptions into executable specifications
- **Standalone Analyzer**: Build classify → retrieve → route logic (no LLM calls)
- **Business Guardrails**: Ensure Engine A stays focused on business problems
- **Org Wrapper Template**: Define how Engine A adapts to each organization

**Result by Week 12:**
- Framework database cleaned and operationalized
- 5 priority workflows executable with input/output specs
- Analyzer working on 50 test problems (80%+ confidence)
- Business guardrails enforced and tested
- Org wrapper template ready for Phase 3

---

## WORKSTREAMS (6 Parallel Weeks 5-8)

### Workstream 1: Framework Intelligence Layer Cleanup (Weeks 1-4)

**Goal:** Transform Phase 0 SQL framework database into operational intelligence layer

**Database Schema Cleanup:**

```sql
-- Add operationalization fields
ALTER TABLE frameworks ADD COLUMN use_case TEXT;
ALTER TABLE frameworks ADD COLUMN recommended_when TEXT;
ALTER TABLE frameworks ADD COLUMN avoid_when TEXT;
ALTER TABLE frameworks ADD COLUMN required_evidence JSONB;
ALTER TABLE frameworks ADD COLUMN output_type VARCHAR(50);  -- diagnosis|advisory|score|alert|report|workflow
ALTER TABLE frameworks ADD COLUMN domain_tags TEXT[];
ALTER TABLE frameworks ADD COLUMN confidence_score INT;

-- Link frameworks to workflows
CREATE TABLE framework_workflow_link (
  framework_id INT,
  workflow_id VARCHAR(255),
  relevance_score INT,
  PRIMARY KEY (framework_id, workflow_id)
);

-- Framework selection logic
CREATE FUNCTION select_best_framework(
  problem_classification VARCHAR,
  evidence_available JSONB,
  domain VARCHAR
) RETURNS TABLE (
  framework_id INT,
  framework_name VARCHAR,
  matching_confidence FLOAT,
  required_evidence TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, 
    (0.4 * domain_match + 0.3 * evidence_match + 0.3 * use_case_match)::FLOAT,
    f.required_evidence
  FROM frameworks f
  WHERE f.domain_tags @> ARRAY[domain]
    AND f.recommended_when ILIKE '%' || problem_classification || '%'
  ORDER BY matching_confidence DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;
```

**Framework Operationalization (TypeScript):**

```typescript
// From framework/framework-operationalization.ts

interface OperationalFramework {
  id: number;
  name: string;
  domain: string;
  use_case: string;
  recommended_when: string;
  avoid_when?: string;
  required_evidence: string[];
  output_type: OutputType;
  related_frameworks: number[];
  related_workflows?: string[];
  phase_3_relevance?: string;
}

// Framework selection logic
function selectBestFrameworks(
  context: ProblemContext,
  allFrameworks: OperationalFramework[],
  limit: number = 3
): FrameworkMatch[] {
  // Rank frameworks by:
  // - Domain match (40%)
  // - Problem type match (30%)
  // - Confidence score (30%)
}
```

**Cleanup Tasks (Weeks 1-4):**

1. **Week 1: Audit & Normalization** (20 hours)
   - Review all 150+ frameworks in database
   - Identify naming inconsistencies (ADKAR duplicate, FMEA variations, etc.)
   - Normalize framework names
   - Fix module references (primary_module_id vs primary_module)
   - Validate all foreign keys

2. **Week 2: Operationalization Fields** (20 hours)
   - Add use_case to each framework
   - Add recommended_when conditions
   - Add required_evidence lists
   - Add domain tags
   - Set confidence_score based on source quality

3. **Week 3: Framework Relationships** (10 hours)
   - Link frameworks to related frameworks
   - Link frameworks to workflows (from Workstream 2)
   - Link frameworks to functions/formulas

4. **Week 4: Testing & Documentation** (10 hours)
   - Test framework selection logic on 50 test problems
   - Document high-value frameworks (Ansoff, Strategy Diamond, CRISP-DM, SCOR, etc.)
   - Generate framework reference guide

**Deliverable:** Framework Intelligence Layer v0.1
- All frameworks cleaned and normalized
- Framework selection logic working (test on 50 problems)
- 80%+ framework match accuracy
- Documented priority frameworks

---

### Workstream 2: Workflow Operationalization (Weeks 1-8)

**Goal:** Define 5+ priority workflows as executable specifications

**Priority Workflows:**

1. **Operational Health Assessment**
   - Input: scope (team/dept/org), time period
   - Output: health_score (0-100), risk_level, alerts, recommendations
   - Frameworks: Theory of Constraints, Balanced Scorecard, Process Capability
   - Functions: assess_capacity(), calculate_health_score()
   - Success Criteria: Score ±5% accurate vs manual

2. **Process Bottleneck Detection**
   - Input: process_name, baseline_throughput
   - Output: bottleneck_step, constraint_magnitude, improvement_potential
   - Frameworks: TOC, Value Stream Mapping
   - Functions: identify_bottleneck(), estimate_improvement()
   - Success Criteria: Identifies actual bottleneck

3. **Root Cause Analysis**
   - Input: problem_statement, impact_level
   - Output: root_cause, contributing_factors, recommended_fix, prevention_plan
   - Frameworks: 5-Why, Fishbone, Fault Tree
   - Functions: analyze_cause_chain()
   - Success Criteria: Fix addresses root cause, not symptom

4. **Project Prioritization**
   - Input: projects[], estimated_effort[], business_value[]
   - Output: prioritized_projects[], justification, timeline
   - Frameworks: RICE, Value vs Effort, Strategic Alignment
   - Functions: calculate_priority_score(), check_dependencies()
   - Success Criteria: Alignment with strategic goals, realistic timeline

5. **Risk Classification**
   - Input: risk_description, potential_impact, likelihood
   - Output: risk_score (0-100), risk_level, mitigation_plan, monitoring_plan
   - Frameworks: Risk Matrix, FMEA, Risk Heat Map
   - Functions: score_risk(), assess_mitigation_feasibility()
   - Success Criteria: Score consistent with org risk appetite

**Implementation (Weeks 1-8):**

1. Define workflow spec structure (TypeScript interfaces)
2. Implement each workflow as OperationalWorkflow with full spec
3. Add trigger conditions, input/output schemas, execution steps
4. Link to frameworks from Workstream 1
5. Define success criteria for each
6. Create workflow execution engine (stub)
7. Test workflows on sample inputs
8. Document each workflow

**Deliverable:** 5+ Priority Workflows
- Each with complete spec (trigger, input, output, execution, success criteria)
- Linked to frameworks
- Tested on sample inputs
- Ready to integrate into Phase 2 orchestrator

---

### Workstream 3: Business Guardrails (Weeks 3-8)

**Goal:** Prevent Engine A from drifting toward general knowledge

**Guardrail Logic:**

```typescript
// From guardrails/business-guardrails.ts

function validateBusinessContext(input: string): BusinessContextValidation {
  // Check for business keywords (operations, workflow, cost, team, etc.)
  // Check for forbidden keywords (poem, joke, math homework, trivia, etc.)
  // If 2+ business keywords → business-focused
  // If no business keywords → reject with suggestion to use Claude
}

// Enforcement
function enforceBusinessContextGate(input: string): EnforcementResult {
  const validation = validateBusinessContext(input);
  
  if (!validation.is_business_focused) {
    return {
      allowed: false,
      route_to: "claude_direct",
      reason: "This is not a business-focused question..."
    };
  }
  
  return {
    allowed: true,
    route_to: "engine_a",
    reason: "Business-focused query"
  };
}
```

**Testing (Weeks 6-8):**

Run through 200+ test cases:
- ✅ Business questions (should route to Engine A)
  - "Our workflow has a bottleneck"
  - "Help me prioritize these projects"
  - "What's causing customer churn?"
  
- ❌ Non-business questions (should reject and route to Claude)
  - "Tell me a poem"
  - "Who was Napoleon?"
  - "Solve this math problem"
  - "What's the capital of France?"

**Deliverable:** Business Context Guardrails
- 95%+ accuracy on test cases
- Zero drift to general knowledge
- Monitoring and logging in place

---

### Workstream 4: Standalone Analyzer (Weeks 5-12)

**Goal:** Build classify → retrieve → decide logic (no LLM calls)

```typescript
// Simplified flow:
async function analyzeRequest(request: {
  problem: string;
  context: Record<string, any>;
}) {
  // Step 1: Business context gate
  const gateResult = enforceBusinessContextGate(request.problem);
  if (!gateResult.allowed) {
    return { error: gateResult.reason, route_to: "claude_direct" };
  }
  
  // Step 2: Classify problem
  const classification = classify(request.problem);  // technical|operational|business|etc.
  
  // Step 3: Retrieve frameworks
  const frameworks = selectBestFrameworks({
    domain: classification.domain,
    problem_type: classification.type,
    available_evidence: request.context,
  }, allFrameworks, 3);
  
  // Step 4: Select workflow
  const workflows = getWorkflowsForFrameworks(frameworks);
  
  // Step 5: Score confidence
  const confidence = calculateConfidence(frameworks);
  
  // Step 6: Return result
  return {
    classification,
    frameworks: frameworks.map(f => ({ id: f.framework.id, name: f.framework.name, confidence: f.matching_confidence })),
    workflow: workflows[0]?.workflow_id,
    confidence,
    audit_id: createLearningRecord(...)
  };
}
```

**Testing (Weeks 9-12):**

Run analyzer on 50 test problems:
- Goal: 80%+ confidence on matches
- Verify frameworks make sense for problem
- Verify workflows are appropriate

**Deliverable:** Standalone Analyzer v0.1
- Works on 50 test problems with 80%+ confidence
- No LLM calls (pure logic)
- Produces audit trail

---

### Workstream 5: Multi-Source Learning Capture (Weeks 5-12)

**Goal:** Set up learning record capture from all apps

**Sources:**

- **Tech-Ops**: Support tickets, troubleshooting logs, fixes
- **PMO-Ops**: Workflow execution, decisions, plan accuracy
- **Miidle**: Proof-of-work evaluation, signals
- **Workspace**: Command patterns, navigation effectiveness

**Monthly Consolidation:**

```typescript
function monthlyConsolidation() {
  const records = getAllRecords(currentMonth);  // 100+ records
  
  const byFramework = groupBy(records, r => r.framework);
  const byWorkflow = groupBy(records, r => r.workflow);
  
  const consolidation = {
    month,
    total_records: records.length,
    frameworks: byFramework.map(([name, recs]) => ({
      framework: name,
      usage_count: recs.length,
      success_rate: recs.filter(r => r.accepted).length / recs.length,
      top_patterns: extractPatterns(recs)
    })),
    insights: ["Framework X most used with 95% success", ...],
    next_focus: "Continue collecting across all domains"
  };
}
```

**Deliverable:** Learning Capture System
- 100+ records captured per month
- Monthly consolidation working
- Patterns visible

---

### Workstream 6: Organization Wrapper Template (Weeks 9-12)

**Goal:** Define structure for Phase 3 multi-tenancy

```typescript
// From wrappers/org-wrapper-template.ts

interface OrgWrapper {
  org_id: string;
  tenant_id: string;
  org_name: string;
  
  // Systems
  connectors: {
    database?: ConnectorConfig;
    helpdesk?: ConnectorConfig;
    github?: ConnectorConfig;
    custom?: ConnectorConfig[];
  };
  
  // Data access
  data_access: {
    allowed_datasets: string[];
    forbidden_datasets: string[];
    pii_handling: "anonymize" | "encrypt" | "redact";
  };
  
  // Workflows
  workflows: {
    enabled_workflows: string[];
    disabled_workflows: string[];
    required_approval_workflows: string[];
  };
  
  // Approval
  approval_gates: {
    workflow_approval: boolean;
    action_approval: boolean;
    export_approval: boolean;
    approval_authority: string[];
  };
  
  // Audit
  audit_rules: {
    log_all_requests: boolean;
    retention_days: number;
    encryption_in_transit: boolean;
    encryption_at_rest: boolean;
  };
  
  // Learning (CRITICAL: always org-only)
  learning_rules: {
    capture_learning: boolean;
    share_with_other_orgs: false;  // ALWAYS false
    training_data_usage: "org_only";
  };
}
```

**Enforcement:**

```typescript
function enforceOrgContext(request, wrapper) {
  // Verify org_id matches
  // Check if action is enabled
  // Determine if approval needed
  // Apply data filters
  // Create audit trail
  
  return enforcedRequest;
}
```

**Deliverable:** Org Wrapper Template
- Default implementation
- Configuration utilities
- Enforcement logic
- Validation & documentation

---

## PHASE 1 SUCCESS CRITERIA

### ✅ Framework Intelligence

- [ ] Framework DB cleaned (all 150+ normalized)
- [ ] All frameworks have use_case, evidence requirements, output types
- [ ] Framework selection logic works (test on 50 problems)
- [ ] Framework accuracy >85%

### ✅ Workflows Operationalized

- [ ] 5+ priority workflows with complete specs
- [ ] Each workflow has trigger, input, output, execution, success criteria
- [ ] Workflow routing works (test on 50 problems)
- [ ] Workflow accuracy >80%

### ✅ Learning System Running

- [ ] 100+ records captured per month
- [ ] Monthly consolidation automated
- [ ] Learning patterns visible

### ✅ Standalone Analyzer

- [ ] POST /analyze endpoint (stub, no LLMs)
- [ ] Classifies problem → selects frameworks → routes to workflow
- [ ] Returns reasoning + audit trail
- [ ] Works on 50 test problems with 80%+ confidence

### ✅ Business Guardrails

- [ ] Business context gate working
- [ ] Non-business questions rejected cleanly
- [ ] 95%+ accuracy on 200+ test cases
- [ ] No drift to general knowledge

### ✅ Templates Ready for Phase 2

- [ ] Org wrapper template complete
- [ ] Connector stubs defined
- [ ] Isolation boundaries proven
- [ ] Can be deployed immediately in Phase 2

---

## PHASE 1 TIMELINE

| Week | Focus | Hours | Deliverable |
|------|-------|-------|-------------|
| 1-2 | Framework cleanup | 20 | Cleaned framework DB |
| 3-4 | Operationalization | 20 | All frameworks operational |
| 5-6 | Workflows 1-3 | 15 | Operational, Process, RCA workflows |
| 7-8 | Workflows 4-5 + Guardrails | 20 | All workflows + business gates |
| 9-10 | Analyzer + Learning | 20 | Working analyzer + learning capture |
| 11-12 | Testing + Templates | 15 | All tested, org wrapper template |

**Total: 60 hours over 12 weeks**

---

## BUDGET ($0-50)

- **$0**: Framework cleanup, workflow specs, analyzer, guardrails, templates
- **$0-50**: Optional: Claude review of critical design decisions (framework selection logic, analyzer accuracy)

---

## FILE STRUCTURE

```
engine-a/phase-1/
├── framework/
│   └── framework-operationalization.ts        # Selection logic, cleanup utilities
│
├── workflows/
│   ├── workflow-operationalization.ts         # 5 priority workflows
│   └── workflow-library.ts                    # Registration, lookup utilities
│
├── analyzer/
│   ├── classifier.ts                          # Problem classification
│   ├── retriever.ts                           # Framework/workflow retrieval
│   ├── router.ts                              # Decision logic
│   └── analyzer.ts                            # Main analyzer
│
├── guardrails/
│   ├── business-guardrails.ts                 # Business context validation
│   └── drift-detection.ts                     # Monitor for generalization drift
│
├── wrappers/
│   ├── org-wrapper-template.ts                # Org wrapper definition
│   ├── connector-stubs.ts                     # Database, helpdesk, API stubs
│   └── wrapper-enforcement.ts                 # Runtime enforcement
│
├── PHASE_1_BUILD_PLAN.md                      # This file
└── README.md                                  # Quick start guide
```

---

## INTEGRATION WITH PHASE 0

Phase 1 builds directly on Phase 0 inventory:
- Framework database (150+ frameworks already exist)
- Workflow library descriptions (100+ documented)
- Business context from app work (Tech-Ops, PMO-Ops, etc.)

Phase 1 transforms these into operational systems ready for Phase 2.

---

## NEXT STEPS (IMMEDIATE)

1. ✅ Create framework operationalization logic
2. ✅ Create workflow operationalization specs (5 priority)
3. ✅ Create business guardrails
4. ✅ Create org wrapper template
5. ⏭️ Week 1: Start framework cleanup
6. ⏭️ Week 5: Start standalone analyzer
7. ⏭️ Week 9: Build learning capture
8. ⏭️ Week 12: Verify all criteria met

---

## PHASE 1 READY FOR PHASE 2

When Phase 1 is complete:
- Framework intelligence layer operational
- 5+ workflows ready to integrate
- Analyzer working (will be enhanced with LLM adapters in Phase 2)
- Business guardrails protecting the system
- Org wrapper template ready for enterprise

→ **Proceed to Phase 2: Learning System + 4 Adapters (Weeks 1-16)**
