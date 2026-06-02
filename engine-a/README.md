# Engine A - Business Intelligence Operating Brain

## Overview

Engine A is a specialized business and adjacent-fields intelligence model designed to become the operating brain behind an organization. It connects with company systems, understands workflows, diagnoses problems, and helps organizations operate with less friction and better visibility.

**What Engine A Is:**
- Specialized business intelligence model
- Operating brain for organizations
- Execution intelligence layer
- Workflow intelligence system
- Diagnostic intelligence engine
- Technical/business reasoning model
- Organization-level coordination layer

**What Engine A Is NOT:**
- A general chatbot
- A general AI assistant
- A dashboard only
- A simple workflow app
- A generic automation tool
- A permanent OpenAI/Gemini/Claude wrapper

## Quick Start

### Phase 2 (Current) - Low-Cost Extraction & Learning
This is the foundational phase where we extract Engine A from existing apps, build a learning system, and prepare for enterprise scale.

**Key Deliverables:**
- Learning system for capturing operational intelligence
- Framework intelligence layer (cleaned & operationalized)
- Basic standalone analyzer
- Connector patterns
- Organization wrapper template

**Budget:** $250 max
**Timeline:** 26 weeks
**Team:** You + LLMs building proprietary intelligence

### Directory Structure

```
engine-a/
├── learning/              # Learning records & dataset
├── intelligence/          # Frameworks, knowledge, workflows, functions
├── runtime/               # Analyzer engine (classify, retrieve, decide, score, respond, audit)
├── connectors/            # System integration stubs
├── wrappers/              # Organization context & governance
├── lab/                   # Teacher prompts, evaluator prompts, scenarios
├── product/               # Positioning, pricing, pilot offer
└── docs/                  # Architecture, plans, decisions
```

### Key Files

1. **[Phase 1 Inventory](docs/phase-1-inventory.md)**
   - What exists from current apps
   - Existing framework database (150+ frameworks)
   - Operational patterns ready for extraction

2. **[Phase 2 Plan](docs/phase-2-plan.md)**
   - Detailed 26-week roadmap
   - Specific deliverables each phase
   - Budget allocation
   - Success criteria

3. **[Architecture](docs/architecture.md)**
   - System design and data flow
   - Runtime process and components
   - Phase 3 enterprise architecture vision

4. **[Frameworks Library](intelligence/frameworks/frameworks.json)**
   - 150+ business frameworks organized by domain
   - Framework metadata (use cases, requirements, output types)
   - Ready for Phase 2A cleanup and operationalization

5. **[Learning Record Template](learning/record-template.json)**
   - JSON template for capturing learning
   - Phase 3-ready structure from Phase 2
   - All fields needed for both learning and enterprise use

## The Three-Phase Strategy

### Phase 1: Existing Hybrid Foundation ✅
Already built through:
- Tech-Ops (technical support, troubleshooting, diagnostics)
- PMO-Ops (business operations, workflow, decisions)
- Miidle (credibility scoring, signal quality)
- Workspace (task coordination, productivity)
- Creator/Admin (governance, testing, evaluation)
- Existing framework database (150+ frameworks)

**Outcome:** Foundation assets and operational patterns

### Phase 2: Low-Cost Standalone Extraction (IN PROGRESS)
Extract Engine A from apps and prepare for enterprise.

**Subphases:**
- **2A:** Framework intelligence layer cleanup
- **2B:** Learning record capture system
- **2C:** Intelligence library creation (knowledge, workflows, functions, evals)
- **2D:** Standalone analyzer build
- **2E:** Learning harvester & connector patterns
- **2F:** Evaluation system
- **2G:** Phase 3 readiness planning

**Target:** 100-300 learning records, 25+ knowledge entries, working analyzer

### Phase 3: Enterprise Scale 🎯
Production-ready operating brain for organizations.

**Includes:**
- Multi-tenant database & API
- Secure organization wrappers
- Enterprise connector framework
- Billing & usage tracking
- Admin console & model lab
- Audit logs & compliance
- Private deployment options

**Outcome:** Commercial product serving organizations

## Key Concepts

### Core Model + Organization Wrapper

Each organization gets:
- **Shared:** Engine A Core (intelligence, frameworks, logic)
- **Private:** Organization Wrapper (systems, data, workflows, permissions)

This allows Engine A to serve many organizations without mixing private company data.

```
┌─────────────────────────────────────────┐
│ Organization A Wrapper                  │
│ (Systems, Data, Workflows, Permissions) │
└──────────────┬──────────────────────────┘
               ▼
      ┌─────────────────────┐
      │   Engine A Core     │
      │ Intelligence Layer  │
      └─────────────────────┘
               ▲
       ┌───────┴────────┐
       │                │
       ... (More orgs) ...
```

### Learning-Driven Intelligence

Every app task becomes a learning record:
```
App Work (bug, feature, decision)
    ↓
Learning Record (JSON)
    ↓
Weekly Review (extract patterns)
    ↓
Monthly Consolidation (deduplicate, promote)
    ↓
Engine A Assets (knowledge, workflows, functions, evals)
```

This creates a continuous feedback loop where operational experience becomes proprietary intelligence.

### Framework Intelligence

Engine A uses domain-specific frameworks to diagnose problems:

**Example:**
```
Problem: "Workflow bottleneck causing customer delays"
↓
Applicable Frameworks:
  - Lean Manufacturing (process optimization)
  - Theory of Constraints (identify bottleneck)
  - Value Stream Mapping (visualize flow)
  - Bottleneck Analysis (quantitative assessment)
↓
Recommendation:
  - Apply Theory of Constraints to identify exact bottleneck
  - Use Value Stream Mapping to plan improvement
  - Reference Lean principles for waste elimination
  - Implement with measurable KPIs
```

## Getting Started

### Immediate Actions (Week 1-2)

1. **Review Phase 1 Inventory**
   - Understand what exists in current apps
   - Review existing framework database
   - Identify operational patterns

2. **Clean Framework Database (Phase 2A)**
   - Normalize framework names
   - Fix schema inconsistencies
   - Add operationalization fields
   - Resolve duplicate frameworks

3. **Capture First Learning Records**
   - Document recent bug fixes, features, decisions
   - Use learning record template
   - Save to `engine-a/learning/records/YYYY-MM/`
   - Append to `engine-a/learning/dataset.jsonl`

### Ongoing Process

**After every meaningful app task:**
1. Create a learning record (5 min)
2. Tag with domain, lesson, asset candidates
3. Save as JSON

**Every week:**
1. Review this week's records (30 min)
2. Extract patterns and lessons
3. Create knowledge/workflow/function/eval candidates

**Every month:**
1. Consolidate learnings (1-2 hours)
2. Deduplicate and promote assets
3. Update success metrics

## Success Metrics

### Phase 2 Minimum (Week 26)
- ✅ 100-300 learning records
- ✅ 25-75 knowledge entries
- ✅ 10-25 workflows/triggers
- ✅ 10-25 functions/formulas
- ✅ 50-100 eval cases
- ✅ Working standalone analyzer
- ✅ Organization wrapper template
- ✅ Phase 3 readiness map

### Phase 2 Strong (Week 26)
- 500+ learning records
- 100+ knowledge entries
- 30+ workflows/triggers
- 50+ functions/formulas
- 150+ eval cases
- Working pilot demo
- Adapter-ready datasets

## Budget ($250)

- **$0-50:** File-based system, scripts, git tracking
- **$50-75:** Limited Gemini/OpenAI API for scenarios
- **$50-75:** Limited Claude API for validation/evals
- **$25-50:** Storage/backup if needed
- **$50:** Reserve

**Do NOT spend on:** GPU training, enterprise hosting, vector DB, compliance tooling, model serving

## Integration with Existing Apps

### Tech-Ops → Engine A
- Technical troubleshooting patterns
- Incident diagnosis
- Support routing logic
- Evidence requirements
- Auth/CORS/API patterns

### PMO-Ops → Engine A
- Business workflows
- Decision frameworks
- Financial patterns
- Project assessment
- Organizational intelligence

### Miidle → Engine A
- Signal quality assessment
- Credibility scoring
- Community patterns
- Content quality
- Recommendation logic

### Workspace → Engine A
- Task coordination
- Productivity optimization
- File organization
- Action prioritization

### Creator/Admin → Engine A
- Model evaluation
- Prompt versioning
- Admin governance
- System configuration

## Documentation

- **[Architecture](docs/architecture.md)** - System design & data flow
- **[Phase 1 Inventory](docs/phase-1-inventory.md)** - What exists
- **[Phase 2 Plan](docs/phase-2-plan.md)** - Detailed roadmap
- **[Phase 3 Readiness](docs/phase-3-readiness.md)** - Enterprise vision
- **[Decisions](docs/decisions.md)** - Design decisions & rationale

## The Operating Brain Concept

Engine A's role is to become the intelligence layer that helps organizations:

1. **Understand workflows** - What are people actually doing?
2. **Detect problems** - What's causing delays, errors, or inefficiency?
3. **Coordinate systems** - How do these systems relate to each other?
4. **Recommend action** - What should we do about this?
5. **Execute safely** - What approvals and evidence do we need?
6. **Learn continuously** - What did we learn from this?

It's not about automating away human judgment. It's about making human judgment better informed and more systematic.

## Next Steps

1. Read [Phase 1 Inventory](docs/phase-1-inventory.md) to understand foundation
2. Review [Phase 2 Plan](docs/phase-2-plan.md) for next steps
3. Start Phase 2A: Clean framework database
4. Begin capturing learning records from app work
5. Run first weekly review by end of Week 3

## Questions?

See the documentation files above or review the structure in `engine-a/`.

---

**Status:** Phase 2 - Foundation Building  
**Created:** 2026-06-02  
**Current Focus:** Framework cleanup & learning system establishment
