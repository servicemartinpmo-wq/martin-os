# Engine A Phase 2 Plan

## Overview
Phase 2 is the low-cost standalone extraction and learning phase. With a $250 budget cap, Engine A should harvest learning from current app work, convert it into structured records, promote records into reusable assets (knowledge/workflows/functions/formulas/evals), and build a basic standalone analyzer. Phase 2 stays cheap but uses Phase 3-ready structure.

## Phase 2 Goals
1. Extract Engine A from the existing app ecosystem
2. Prepare structured learning system
3. Convert Phase 1 assets into operational intelligence
4. Build basic standalone analyzer
5. Create organization wrapper and connector patterns
6. Establish Phase 3 readiness path

## Phase 2 Key Principle
**Do not invent.** Extract only what happened. Make lessons reusable. Build Phase 3-ready structure now.

## Phase 2A: Framework Intelligence Layer Cleanup (Weeks 1-2)

### Goal
Turn the existing SQL framework library into Engine A's first structured reasoning layer.

### Work Items
1. **Audit schema and inserts**
   - Identify all inconsistencies in framework database
   - Map all module references
   - Validate foreign key relationships

2. **Fix naming inconsistencies**
   - Standardize module references (primary_module_id vs primary_module)
   - Resolve duplicate framework names
   - Create canonical framework names

3. **Normalize duplicate frameworks**
   - ADKAR, FMEA, Monte Carlo, Emotional Intelligence, Self-Determination Theory
   - Decide: merge, archive, or preserve with clear distinction

4. **Add domain tags and use-case fields**
   - Tag frameworks by primary domain (strategy, operations, finance, etc.)
   - Add specific use cases for each framework
   - Define when framework should be recommended

5. **Add evidence requirements**
   - Document what data/information is needed for each framework
   - Create required_evidence field

6. **Add recommended_when / avoid_when**
   - Define conditions where framework applies
   - Define conditions where it should not be used

7. **Link frameworks to workflows/functions/formulas**
   - Identify supporting operational flows
   - Map to quantitative models

8. **Create framework selection logic**
   - Problem classification → applicable frameworks
   - Evidence availability → framework eligibility
   - Confidence scoring → framework suitability

9. **Connect learning records to framework matches**
   - When learning record is created, identify applicable frameworks
   - Create bidirectional framework ↔ record links

10. **Create eval cases for framework selection**
    - Test framework matching logic
    - Validate recommendation accuracy

### Deliverable: Engine A Framework Intelligence Layer v0.1
- Cleaned and normalized framework database
- Framework operationalization fields
- Framework selection logic
- 20+ eval cases for framework matching
- Documented framework→problem mappings

## Phase 2B: Learning System Capture (Weeks 3-4)

### Goal
Establish the habit of creating learning records from all meaningful app work.

### Weekly Process
For each meaningful app task:
1. Create an Engine A learning record
2. Use Phase 2 learning record template
3. Extract only what happened (no invention)
4. Identify reusable lesson
5. Mark engine_a_asset_candidates
6. Return JSON only

Save to: `engine-a/learning/records/YYYY-MM/record-name.json`
Append to: `engine-a/learning/dataset.jsonl`

### Weekly Review (Every Friday)
Review this week's learning records. Create:
1. Top reusable lessons (2-3)
2. Structured knowledge candidates (3-5)
3. Framework candidates/matches (5+)
4. Workflow/trigger candidates (2-4)
5. Function/formula candidates (2-4)
6. Eval cases (5-10)
7. Wrapper/connector implications (1-3)
8. Phase 3 readiness implications (1-2)
9. Weak records to archive

### Target Metrics
- 20-60 learning records by end of Weeks 3-4
- 2-4 weekly review documents
- First monthly consolidation started

## Phase 2C: Intelligence Library Creation (Weeks 5-8)

### Goal
Convert strong learning records into Engine A's structured asset library.

### Knowledge Entry Creation
From approved records:
- Extract reusable principle
- Create domain tag
- Add related frameworks
- Document evidence requirements
- Add risk/confidence scores
- Save to: `engine-a/intelligence/knowledge/`

### Workflow Candidate Creation
From workflow-type records:
- Map workflow steps
- Identify decision points
- Add trigger conditions
- Document preconditions/postconditions
- Save to: `engine-a/intelligence/workflows/`

### Function/Formula Candidate Creation
From quantitative records:
- Define input parameters
- Document calculation logic
- Add validation rules
- Add example applications
- Save to: `engine-a/intelligence/functions/`

### Eval Case Creation
From test/validation records:
- Define test scenario
- Document expected output
- Add pass/fail criteria
- Tag by framework/workflow/domain
- Save to: `engine-a/intelligence/evals/`

### Target Metrics
- 25-75 knowledge entries
- 10-25 workflow/trigger candidates
- 10-25 function/formula candidates
- 50+ eval cases
- Clear asset categorization

## Phase 2D: Standalone Analyzer Build (Weeks 9-12)

### Goal
Create a basic runtime that can classify problems, retrieve knowledge, select frameworks, score confidence, and produce recommendations.

### Components

**1. Classify Module** (`runtime/classify.ts`)
- Input: problem description
- Output: classification (technical, operational, business, diagnostic, strategic)
- Process: pattern matching + keyword analysis

**2. Retrieve Module** (`runtime/retrieve.ts`)
- Input: problem classification + keywords
- Output: matching knowledge entries + applicable frameworks
- Process: semantic search + tag matching

**3. Decide Module** (`runtime/decide.ts`)
- Input: matched frameworks + available evidence
- Output: selected workflow + recommended framework + scoring function
- Process: evidence-based selection + confidence scoring

**4. Score Module** (`runtime/score.ts`)
- Input: problem context + frameworks + evidence
- Output: confidence, risk, business_impact, technical_severity, execution_readiness
- Process: evidence quality evaluation + scoring rules

**5. Respond Module** (`runtime/respond.ts`)
- Input: scored analysis + selected frameworks
- Output: structured recommendation report
- Process: template-based generation + evidence citation

**6. Audit Module** (`runtime/audit.ts`)
- Input: all outputs + governance rules
- Output: audit trail + approval gates
- Process: compliance checking + evidence validation

### API Endpoint
```
POST /engine-a/analyze
{
  "input": "problem description",
  "org_context": { org_id, tenant_id, department },
  "available_evidence": [],
  "governance_required": true
}
→
{
  "classification": "...",
  "matched_frameworks": [],
  "selected_workflow": "...",
  "confidence_score": 0.8,
  "risk_score": 0.3,
  "recommendation": "...",
  "evidence_citations": [],
  "approval_gates": [],
  "learning_record": {...}
}
```

### Target Metrics
- Functional classify/retrieve/decide/score/respond flow
- Working audit trail
- Automatic learning record generation
- 90%+ framework match accuracy on eval cases

## Phase 2E: Learning Harvester + Connector/Wrapper Pattern (Weeks 13-16)

### Goal
Create stubs for ingesting learning records from existing systems and establish organization wrapper pattern.

### Learning Harvester
Create scripts for:
- Git commit harvesting (bug fixes, features)
- PR/build summary harvesting
- Support case harvesting (from ticketing system)
- Test failure harvesting
- Accepted/rejected AI output harvesting

### Connector Stubs
Create stub patterns for:
- Database connector (query systems, track schema changes)
- Helpdesk connector (ingest support cases)
- Email connector (track conversations)
- GitHub connector (track commits, PRs, issues)
- Custom API connector (generic template)

### Organization Wrapper Pattern
Define standard template for:
- Org context definition (org_id, tenant_id, department, workflows)
- Permission map (roles, approval authority)
- Data boundaries (what data each wrapper can access)
- Business rules (org-specific constraints)
- Workflow configuration (org-specific workflows)
- Audit requirements (evidence standards for org)

### Target Metrics
- 3-5 working connectors
- 1 learning harvester
- Organization wrapper template
- 10+ connector/org-specific eval cases

## Phase 2F: Evaluation System (Weeks 17-20)

### Goal
Build comprehensive evals that validate Engine A's reasoning and prevent false successes.

### Eval Categories

**1. Classification Accuracy**
- Test: problem classification correctness
- Target: 95%+ accuracy

**2. Root-Cause Quality**
- Test: diagnostic recommendations accuracy
- Target: 85%+ quality rating

**3. Workflow Routing**
- Test: correct workflow selection
- Target: 90%+ correct routing

**4. Evidence Compliance**
- Test: evidence requirements met before proceeding
- Target: 100% compliance

**5. Business Impact Mapping**
- Test: impact assessment accuracy
- Target: 80%+ correlation with actual impact

**6. Technical Correctness**
- Test: technical recommendations are sound
- Target: 90%+ technical correctness

**7. Fake-Success Prevention**
- Test: engine identifies scenarios where it lacks confidence
- Target: 95%+ confidence calibration

**8. Permission Safety**
- Test: recommendations respect org permissions
- Target: 100% permission compliance

**9. Speed**
- Test: response latency under load
- Target: <500ms average response

**10. Cost Per Run**
- Test: API cost efficiency
- Target: <$0.01 per analysis

### Target Metrics
- 150+ golden test cases
- Failure pattern library
- Scorecard with go/no-go gates
- Regression test suite

## Phase 2G: Phase 3 Readiness + Optional Adapter Experiments (Weeks 21-26)

### Goal
Prepare for enterprise scale-up and optionally validate advanced capabilities.

### Required Deliverables

**1. Phase 3 Readiness Map**
- Architecture diagram: Phase 2 → Phase 3 transition
- Scaling requirements (database, API, infrastructure)
- Security/compliance readiness checklist
- Missing components list
- Effort/cost estimates for Phase 3

**2. Adapter-Ready Datasets**
- Organize learning records by domain
- Create training datasets for potential adapters
- Document adapter training requirements
- Identify gaps in dataset coverage

**3. Pilot Offer**
- Business positioning
- Customer intake process
- Success metrics
- Pricing model
- Support model

**4. Wrapper/Connector Backlog**
- List of systems to integrate
- Integration complexity estimates
- Org-specific customization patterns
- Data mapping requirements

**5. Enterprise Security Backlog**
- Multi-tenancy isolation requirements
- Data encryption standards
- Audit logging requirements
- Compliance frameworks
- Security certifications needed

### Optional Experiments (If Dataset is Strong)

1. **Support Classifier Experiment**
   - Train on tech-ops support cases
   - Validate classification accuracy
   - Measure improvement over heuristics

2. **Workflow Router Experiment**
   - Train on app workflow data
   - Validate workflow selection
   - Compare to rule-based system

3. **Root-Cause Detector Experiment**
   - Train on incident records
   - Validate root cause accuracy
   - Measure false positive rate

### Target Metrics
- Complete Phase 3 readiness map
- Documented adapter strategy
- Pilot offer live
- 90%+ dataset quality rating
- Enterprise security backlog defined

## Phase 2 Success Criteria

### Minimum Success
- 100-300 learning records
- 25-75 structured knowledge entries/candidates
- 10-25 workflows/triggers
- 10-25 functions/formulas
- 50-100 eval cases
- Basic standalone Engine A analyzer (API working)
- Connector/stub pattern documented
- Organization wrapper template
- Phase 3 readiness map exists
- Updated positioning docs

### Strong Success
- 500+ learning records
- 100+ knowledge entries
- 30+ workflows/triggers
- 50+ functions/formulas
- 150+ eval cases
- Adapter-ready datasets prepared
- Basic pilot demo working
- Framework intelligence layer fully operational
- All evaluation suites passing
- Enterprise architecture validated

## Phase 2 Budget ($250 max)

- **$0-$50**: File-based system, scripts, git tracking
- **$50-$75**: Limited Gemini or low-cost API usage for scenario variation
- **$50-$75**: Limited Claude/OpenAI validation for important evals and architecture checks
- **$25-$50**: Storage, backup, or testing support if needed
- **$50**: Reserve

### Avoid Spending On
- GPU training
- Enterprise hosting
- Custom production connectors
- Model serving infrastructure
- Paid vector DB
- Large API pipelines
- Compliance tooling (SOC 2, etc)

## Phase 2 Roadmap Summary

| Week | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| 1-2 | 2A | Framework cleanup | Cleaned framework DB, eval cases |
| 3-4 | 2B | Learning capture | 20-60 records, weekly reviews |
| 5-8 | 2C | Library creation | Knowledge, workflows, functions, evals |
| 9-12 | 2D | Standalone analyzer | Working API, classify→score→respond flow |
| 13-16 | 2E | Harvester & wrappers | Connectors, harvesters, org templates |
| 17-20 | 2F | Evaluation system | 150+ evals, scorecard, go/no-go gates |
| 21-26 | 2G | Phase 3 prep | Readiness map, pilot offer, positioning |

## Integration with Existing Apps

### Tech-Ops → Engine A
- Technical troubleshooting patterns
- Incident diagnosis workflows
- Support routing logic
- Evidence requirements
- Auth/CORS/API failure patterns

### PMO-Ops → Engine A
- Business operations workflows
- Decision frameworks
- Financial operations patterns
- Project status assessment
- Organizational intelligence

### Miidle → Engine A
- Signal quality assessment
- Credibility scoring logic
- Community pattern recognition
- Content quality evaluation
- Recommendation patterns

### Workspace → Engine A
- Task coordination workflows
- Productivity optimization
- File organization patterns
- Action prioritization logic

### Creator/Admin → Engine A
- Model evaluation logic
- Prompt versioning patterns
- Admin governance workflows
- System configuration patterns

## Key Learning Process

**Every app task** → **Learning record** → **Weekly review** → **Monthly consolidation** → **Engine A assets**

This creates a continuous feedback loop where operational experience becomes proprietary intelligence.

## Next Steps (Immediate)

1. ✅ Create engine-a directory structure
2. ✅ Create learning record template
3. ⏭️ Clean up existing framework database
4. ⏭️ Capture first 10-20 learning records from recent work
5. ⏭️ Run first weekly review
6. ⏭️ Create knowledge entry templates
7. ⏭️ Build framework intelligence layer v0.1
