# Engine A Architecture

## Overview
Engine A is a specialized business and adjacent-fields intelligence model designed to become the operating brain behind an organization. It's built for business-critical work: operations, technical support, software engineering, workflow automation, diagnostics, project management, data analysis, support lifecycle, execution management, system optimization, AI systems, and product operations.

## Core Model + Organization Wrapper Pattern

The cleanest enterprise framing separates the core intelligence from organization-specific context:

```
┌─────────────────────────────────────────────┐
│   Organization A Wrapper                    │
│   - Systems, data, workflows, permissions   │
│   - Business rules, approval gates           │
│   - Audit requirements                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   Engine A Core     │
         │ Intelligence Layer  │
         └─────────────────────┘
                   ▲
                   │
┌──────────────────┴──────────────────────────┐
│   Organization B Wrapper                    │
│   - Systems, data, workflows, permissions   │
│   - Business rules, approval gates           │
│   - Audit requirements                       │
└─────────────────────────────────────────────┘
```

This architecture allows Engine A to serve multiple organizations without merging their private data into the base model.

## Phase 2 Architecture (Current)

```
┌─────────────────────────────────────────────────────────┐
│                    Current Apps                         │
│  Tech-Ops | PMO-Ops | Miidle | Workspace | Creator    │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────┐
         │  Learning Records       │
         │  (JSON + dataset.jsonl) │
         └────────┬────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────────┐
    │ Framework Intelligence Layer         │
    │ - Cleaned/normalized frameworks      │
    │ - Domain tags                        │
    │ - Use case mappings                  │
    │ - Evidence requirements              │
    │ - Recommended_when / Avoid_when      │
    └──────────┬───────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────┐
    │ Engine A Reasoning Layer             │
    │ ├─ Classify                          │
    │ ├─ Retrieve                          │
    │ ├─ Decide (framework selection)      │
    │ ├─ Score (confidence/risk/impact)    │
    │ ├─ Respond (generate recommendation) │
    │ └─ Audit (governance/approval)       │
    └──────────┬───────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────┐
    │ Learning Output                      │
    │ - New learning records created       │
    │ - Analysis audit trail               │
    │ - Recommendations                    │
    └──────────────────────────────────────┘
```

## Directory Structure

```
engine-a/
│
├── learning/
│   ├── record-template.json          # Template for all records
│   ├── dataset.jsonl                 # Append-only learning dataset
│   ├── records/
│   │   └── YYYY-MM/                  # Monthly folders for records
│   │       └── record-name.json      # Individual learning records
│   ├── weekly-reviews/
│   │   └── YYYY-WXX-review.md        # Weekly analysis summaries
│   ├── monthly-consolidations/
│   │   └── YYYY-MM-consolidation.md  # Monthly learning consolidation
│   └── archive/                       # Old/superseded records
│
├── intelligence/
│   ├── knowledge/
│   │   ├── knowledge-template.json
│   │   ├── domain-1/
│   │   │   ├── entry-1.json
│   │   │   └── entry-2.json
│   │   └── domain-2/
│   │       └── entry-3.json
│   │
│   ├── frameworks/
│   │   ├── frameworks.json            # Framework library
│   │   ├── framework-template.json
│   │   └── domain-mappings.json       # Framework→domain relationships
│   │
│   ├── workflows/
│   │   ├── workflow-template.json
│   │   ├── workflow-1.json
│   │   └── workflow-2.json
│   │
│   ├── triggers/
│   │   ├── trigger-template.json
│   │   ├── trigger-1.json
│   │   └── trigger-2.json
│   │
│   ├── functions/
│   │   ├── function-template.json
│   │   ├── scoring-functions.json
│   │   └── quantitative-models.json
│   │
│   ├── formulas/
│   │   ├── formula-template.json
│   │   ├── financial-formulas.json
│   │   └── operational-formulas.json
│   │
│   └── evals/
│       ├── eval-template.json
│       ├── golden-cases.json
│       └── by-domain/
│           ├── classification-evals.json
│           ├── framework-matching-evals.json
│           └── recommendation-evals.json
│
├── runtime/
│   ├── classify.ts          # Problem classification
│   ├── retrieve.ts          # Knowledge/framework retrieval
│   ├── decide.ts            # Workflow & framework selection
│   ├── score.ts             # Confidence/risk/impact scoring
│   ├── respond.ts           # Recommendation generation
│   ├── audit.ts             # Governance & compliance
│   ├── types.ts             # Shared TypeScript types
│   └── index.ts             # Main analyzer API
│
├── connectors/
│   ├── stubs/
│   │   ├── database-connector.ts
│   │   ├── helpdesk-connector.ts
│   │   ├── email-connector.ts
│   │   ├── github-connector.ts
│   │   └── custom-api-connector.ts
│   │
│   ├── schema-maps/
│   │   ├── crm-schema.json
│   │   ├── helpdesk-schema.json
│   │   └── custom-schema.json
│   │
│   ├── permission-maps/
│   │   ├── role-definitions.json
│   │   └── approval-matrix.json
│   │
│   └── event-maps/
│       ├── git-event-map.json
│       ├── support-event-map.json
│       └── workflow-event-map.json
│
├── wrappers/
│   ├── org-context/
│   │   ├── org-template.json
│   │   └── org-example.json
│   │
│   ├── permissions/
│   │   ├── permission-template.json
│   │   └── role-based-access.json
│   │
│   ├── data-boundaries/
│   │   ├── tenant-isolation.json
│   │   └── data-access-rules.json
│   │
│   ├── approval-rules/
│   │   ├── approval-template.json
│   │   └── governance-gates.json
│   │
│   └── audit-rules/
│       ├── audit-template.json
│       └── compliance-checklist.json
│
├── lab/
│   ├── teacher-prompts/
│   │   ├── framework-teacher.md
│   │   ├── scenario-teacher.md
│   │   └── eval-teacher.md
│   │
│   ├── scenario-generation/
│   │   ├── scenario-template.json
│   │   └── synthetic-cases.json
│   │
│   ├── evaluator-prompts/
│   │   ├── classification-evaluator.md
│   │   ├── recommendation-evaluator.md
│   │   └── business-impact-evaluator.md
│   │
│   ├── model-comparisons/
│   │   └── comparison-results.json
│   │
│   └── training-candidates/
│       └── candidate-datasets/
│
├── product/
│   ├── positioning.md                # Product positioning & messaging
│   ├── pricing-hypotheses.md          # Pricing models and assumptions
│   ├── pilot-offer.md                 # Pilot program details
│   └── enterprise-readiness.md        # Feature checklist for enterprise
│
└── docs/
    ├── architecture.md                # This file
    ├── phase-1-inventory.md           # What exists from Phase 1
    ├── phase-2-plan.md                # Detailed Phase 2 plan
    ├── phase-3-readiness.md           # Enterprise scale plan
    └── decisions.md                   # Decision logs and rationale
```

## Data Flow

### Learning Record Creation
```
App Task (bug fix, feature, decision, etc.)
  ↓
Create Learning Record (JSON)
  ↓
Save to: engine-a/learning/records/YYYY-MM/
  ↓
Append to: engine-a/learning/dataset.jsonl
  ↓
Tag with: source_app, task_type, domain, lesson
```

### Weekly Learning Review
```
All records from this week
  ↓
Extract patterns & lessons
  ↓
Create: knowledge candidates, framework matches, workflow candidates, evals
  ↓
Save to: engine-a/learning/weekly-reviews/
  ↓
Promote best to: engine-a/intelligence/
```

### Analysis Execution
```
Input: Problem description + org context
  ↓
Classify → [technical|operational|business|diagnostic]
  ↓
Retrieve → Matching knowledge + applicable frameworks
  ↓
Decide → Best framework + workflow to execute
  ↓
Score → Confidence, risk, business impact, etc.
  ↓
Respond → Generate structured recommendation
  ↓
Audit → Validate governance, evidence, permissions
  ↓
Output: Recommendation report + learning record
```

## Intelligence Components

### 1. Framework Intelligence Layer
Maps problems to applicable frameworks:
- Problem classification → framework matches
- Evidence availability → framework eligibility  
- Confidence scoring → framework suitability

Example: "Workflow bottleneck" → [Lean, Theory of Constraints, Value Stream Mapping]

### 2. Knowledge Base
Domain-specific entries with:
- Reusable principles
- Related frameworks
- Evidence requirements
- Risk/confidence metadata

### 3. Workflow Library
Operational procedures with:
- Decision trees
- Trigger conditions
- Approval gates
- Success criteria

### 4. Evaluation Suite
Automated tests for:
- Classification accuracy
- Framework matching
- Recommendation quality
- Business impact
- Permission compliance

## Runtime Process

### Phase 2 Basic Flow
```
POST /engine-a/analyze
{
  "input": "Problem or request",
  "org_context": {
    "org_id": "...",
    "department": "operations|technical|product"
  }
}
↓
Phase 1: Classify
  - Determine problem type
  - Confidence score: classify_confidence
  
Phase 2: Retrieve
  - Find relevant knowledge entries
  - Find applicable frameworks
  
Phase 3: Decide
  - Select best framework(s)
  - Choose workflow to execute
  - Determine evidence needed
  
Phase 4: Score
  - Calculate confidence: 0.0-1.0
  - Calculate risk: 0.0-1.0
  - Estimate business impact: 0.0-1.0
  - Assess execution readiness: 0.0-1.0
  
Phase 5: Respond
  - Generate recommendation
  - Include evidence citations
  - Identify approval gates
  
Phase 6: Audit
  - Check governance compliance
  - Validate permissions
  - Generate audit trail

Response:
{
  "classification": "...",
  "confidence": 0.85,
  "recommendation": {
    "primary_framework": "...",
    "supporting_frameworks": [],
    "workflow": "...",
    "action_steps": [],
    "evidence_citations": [],
    "expected_outcome": "..."
  },
  "governance": {
    "approval_gates": [],
    "required_evidence": [],
    "risk_level": "low|medium|high"
  },
  "learning_record": {
    "id": "...",
    "created": "2026-06-02T...",
    "engine_a_asset_candidates": {}
  }
}
```

## Phase 3 Enterprise Extension

When Engine A scales to enterprise:

```
Company Systems
├── CRM
├── Helpdesk
├── Email
├── Calendar
├── Database
├── Billing
├── GitHub
├── Project Tools
├── Internal Docs
└── Custom Apps
       ↓
Organization Wrapper (Multi-tenant)
├── Data boundaries
├── Org context
├── Workflows
├── Permissions
├── Business rules
├── Approval gates
├── Audit requirements
       ↓
Engine A Core (Shared Intelligence)
├── Framework intelligence
├── Knowledge base
├── Workflow engine
├── Evaluation suite
├── Scorer functions
       ↓
Business Output
├── Recommendations
├── Actions
├── Alerts
├── Reports
├── Workflow updates
└── Diagnostics
```

## Governance & Audit

### Evidence Requirements
All recommendations must cite:
- Which frameworks applied
- What evidence was used
- What was assumed
- What confidence level

### Approval Gates
High-risk recommendations require:
- Manual approval by authorized role
- Documented decision rationale
- Org-specific governance rules

### Audit Trail
Every recommendation is recorded:
- Input parameters
- Framework selections
- Scoring details
- Approvals/rejections
- Outcomes

## Key Design Principles

1. **Single Source of Truth**: One framework per problem pattern
2. **Evidence-Driven**: Recommendations backed by data
3. **Reusable Patterns**: Extract and standardize successful approaches
4. **Organization-Aware**: Respect org-specific rules and boundaries
5. **Explainable**: Every recommendation cites its reasoning
6. **Auditable**: Complete trail of all decisions
7. **Testable**: Eval suite prevents regressions
8. **Scalable**: Phase 2 structure supports Phase 3 enterprise needs

## Success Metrics

### Phase 2 Metrics
- 100-300 learning records captured
- 25+ frameworks operationalized
- 50+ eval cases passing
- <500ms average response time
- 90%+ framework match accuracy

### Phase 3 Metrics (Enterprise)
- Multi-tenant isolation validated
- Permission compliance: 100%
- Audit completeness: 100%
- Recommendation accuracy: 85%+
- Org adoption rate: 70%+

## Integration Points

### With Current Apps
- Tech-Ops → troubleshooting patterns
- PMO-Ops → business workflows
- Miidle → signal quality
- Workspace → task coordination
- Creator/Admin → model governance

### With Future Systems
- CRM connectors → customer context
- Helpdesk integration → case routing
- Email analysis → communication patterns
- Database monitoring → system health
- GitHub integration → code change impact

## Technology Stack (Phase 2)

- **Language**: TypeScript (runtime), JSON (data)
- **Storage**: Git + file system (Phase 2), SQL database (Phase 3)
- **API**: Express/Fastify (basic server)
- **Testing**: Jest (eval suite)
- **Version Control**: Git with detailed records

## Constraints & Considerations

### Phase 2 Constraints
- $250 budget max
- File-based storage
- Single-tenant
- Manual approval gates
- Limited automation

### Phase 3 Requirements
- Multi-tenant database
- Secure org wrappers
- Enterprise connectors
- Scalable API
- Compliance/audit tools
- Private deployment option

## Next Implementation Steps

1. **Immediate**: Clean framework database and create eval cases
2. **Week 1-2**: Build framework intelligence layer v0.1
3. **Week 3-4**: Capture 20-60 learning records, run first weekly review
4. **Week 5-8**: Convert records into knowledge/workflow/function/eval assets
5. **Week 9-12**: Build standalone analyzer API
6. **Week 13-16**: Create connectors and org wrapper template
7. **Week 17-20**: Build comprehensive eval suite
8. **Week 21-26**: Phase 3 readiness assessment

## References

- Phase 1 Inventory: `docs/phase-1-inventory.md`
- Phase 2 Plan: `docs/phase-2-plan.md`
- Phase 3 Readiness: `docs/phase-3-readiness.md`
- Learning Record Template: `learning/record-template.json`
- Framework Library: `intelligence/frameworks/frameworks.json`
