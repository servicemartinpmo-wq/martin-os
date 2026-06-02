# Phase 2 Integration Guide
## Complete 16-Week Build Overview

This guide ties together all Phase 2 components and shows how they work during the 16-week timeline.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Engine A - Phase 2                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │          WEEKS 1-4: LEARNING INFRASTRUCTURE                │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                              │  │
│  │  Extractors              Consolidators        Store         │  │
│  │  ┌─────────────┐         ┌─────────────┐   ┌─────────────┐ │  │
│  │  │  Support    │         │   Weekly    │   │   Local     │ │  │
│  │  │  Extractor  │─────→   │ Consolidator│──→│ JSON Store  │ │  │
│  │  ├─────────────┤         ├─────────────┤   ├─────────────┤ │  │
│  │  │ Code        │         │   Reports   │   │ JSONL Files │ │  │
│  │  │ Extractor   │─────→   │   Patterns  │   │ Backup      │ │  │
│  │  ├─────────────┤         │   Alerts    │   └─────────────┘ │  │
│  │  │ Automation  │─────→   │             │                    │  │
│  │  │ Extractor   │         │   (Week 4:  │                    │  │
│  │  ├─────────────┤         │    Claude   │                    │  │
│  │  │ Business    │─────→   │   Review)   │                    │  │
│  │  │ Extractor   │         │             │                    │  │
│  │  └─────────────┘         └─────────────┘                    │  │
│  │                                                              │  │
│  │  Cron: Every Sunday 10am → Extract → Consolidate → Report  │  │
│  │  By Week 4: 550 learning records ready for training        │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │        WEEKS 5-12: ADAPTER TRAINING (4 Adapters)            │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                              │  │
│  │  Training Data              Synthetic Gen        Training   │  │
│  │  ┌──────────────┐          ┌──────────────┐    ┌──────────┐ │  │
│  │  │ 200 Support  │          │ Gemini API   │    │ Trainer: │ │  │
│  │  │ 150 Code     │  ────→   │ 1.5-2x       │───→│ Llama 2  │ │  │
│  │  │ 200 Auto     │  (quality │ expansion    │    │ 7B QLoRA │ │  │
│  │  │ 150 Business │  filter)  │ per adapter  │    │ + GPU    │ │  │
│  │  │              │          │              │    │          │ │  │
│  │  │ Real examples│          │ Weeks 5,7,   │    │ Weeks 5, │ │  │
│  │  │ (60+ score)  │          │ 9, 11        │    │ 7, 9, 11 │ │  │
│  │  └──────────────┘          │ Cost: $120   │    └──────────┘ │  │
│  │                           │ total       │                  │  │
│  │                           └──────────────┘                  │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │  Adapter 1   │  │  Adapter 2   │  │  Adapter 3 & 4   │  │  │
│  │  │  Support     │  │  Code        │  │  Automation,     │  │  │
│  │  │  Triage      │  │  Fix         │  │  Business        │  │  │
│  │  ├──────────────┤  ├──────────────┤  ├──────────────────┤  │  │
│  │  │ 85% accuracy │  │ 82% accuracy │  │ 88%, 80%         │  │  │
│  │  │ <500ms       │  │ <1s          │  │ accuracy         │  │  │
│  │  │ Eval: Week 6 │  │ Eval: Week 8 │  │ Eval: Weeks 10,12│  │  │
│  │  │ Stage: Week6 │  │ Stage: Week8 │  │ Stage: Weeks10,12│  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │   WEEKS 13-16: PRODUCTION DEPLOYMENT & ORCHESTRATION        │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                              │  │
│  │            ┌──────────────────────────────────┐             │  │
│  │            │   EngineAOrchestrator            │             │  │
│  │            ├──────────────────────────────────┤             │  │
│  │   User     │                                  │   Response  │  │
│  │  Request   │  Confidence Check (80%)          │   Result    │  │
│  │    ───→    │    ├─ Local Adapter Path         │     ←───    │  │
│  │            │    │  (95%+ success)             │             │  │
│  │            │    └─ Claude Fallback Path       │             │  │
│  │            │       (low confidence/error)     │             │  │
│  │            │                                  │             │  │
│  │            │  Metrics Tracking:               │             │  │
│  │            │    - Local rate: >95%            │             │  │
│  │            │    - Avg confidence: >85%        │             │  │
│  │            │    - Cost: $40/month local       │             │  │
│  │            │      vs $28k Claude              │             │  │
│  │            │    - Avg latency: <500ms         │             │  │
│  │            └──────────────────────────────────┘             │  │
│  │                                                              │  │
│  │   Week 15: Staged Rollout                                   │  │
│  │     Day 1: 10% traffic    Day 4: 75% traffic               │  │
│  │     Day 2: 25% traffic    Day 5: 100% traffic              │  │
│  │     Day 3: 50% traffic    (5-day gradual rollout)           │  │
│  │                                                              │  │
│  │   Week 16: Monthly Retraining Cycle                         │  │
│  │     ┌────────────────────────────────────────┐              │  │
│  │     │  MonthlyRetrainingPipeline              │              │  │
│  │     ├────────────────────────────────────────┤              │  │
│  │     │  1. Collect production feedback         │              │  │
│  │     │  2. Identify user corrections (misses)  │              │  │
│  │     │  3. Add to training data                │              │  │
│  │     │  4. Retrain all adapters                │              │  │
│  │     │  5. Evaluate improvements               │              │  │
│  │     │  6. Deploy if accuracy improved         │              │  │
│  │     │                                          │              │  │
│  │     │  Target: +1-2% accuracy/month           │              │  │
│  │     │  Runs: 1st of month (automated)         │              │  │
│  │     └────────────────────────────────────────┘              │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Reference

### Learning System (Weeks 1-4)

**Extractors** (`src/engine-a/learning/extractors/`)
- `SupportExtractor`: Scores help desk cases (usefulness, clarity, completeness, depth)
- `CodeExtractor`: Scores code sessions (bug fixes, features, refactors)
- `AutomationExtractor`: Scores workflow runs (integration count, execution status)
- `BusinessExtractor`: Scores business decisions (impact, stakeholders, outcomes)

**Schema** (`src/engine-a/learning/schemas/`)
- `LearningRecord`: Base interface for all domains
- `DomainSpecificRecord`: Typed extensions (Support, Code, Automation, Business)
- `DomainStatistics`: Aggregated stats per domain

**Consolidation** (`src/engine-a/learning/consolidators/`)
- `WeeklyConsolidator`: Runs every Sunday 10am
  - Organizes records by domain
  - Calculates statistics (quality, success_rate, latency, cost)
  - Identifies patterns from tag frequencies
  - Generates alerts (data gaps, quality issues, opportunities)
  - Week 4: Triggers Claude API review

**Storage** (`src/engine-a/learning/stores/`)
- `LocalJsonStore`: JSONL format persistence
  - Saves batches with metadata
  - Loads by domain or date range
  - Exports to CSV for review
  - Backup capability

**Scheduling** (`src/engine-a/learning/cron/`)
- `WeeklyConsolidationCron`: Automated Sunday extraction and consolidation
  - Extracts from all domains in parallel
  - Saves batches with quality metrics
  - Generates weekly reports
  - Week 4: Integrates Claude review

### Training System (Weeks 5-12)

**Base Adapter** (`src/engine-a/learning/training/base_adapter.ts`)
- `BaseAdapter`: Abstract base for all 4 adapters
- `AdapterVersion`: Complete training lifecycle
- `EvaluationResult`: Metrics from holdout test set
- Success criteria per domain (accuracy, latency, cost targets)

**Data Generation** (`src/engine-a/learning/training/synthetic_data_generator.ts`)
- `SyntheticDataGenerator`: Gemini API integration
  - Creates 1.5-2x data expansion
  - Strategies: rephrase, edge_case, language_variant, complexity
  - Cost tracking and estimation
  - Per-adapter templates

**Training** (`src/engine-a/learning/training/trainer.ts`)
- `AdapterTrainer`: Complete training pipeline
  - Data preparation: filters by quality (60+)
  - Synthetic generation: creates variations
  - Model training: Llama 2 7B with QLoRA
  - Evaluation: holdout test set validation
  - Deployment decision: metrics-based recommendation
  - Cost tracking and reporting

### Production System (Weeks 13-16)

**Orchestrator** (`src/engine-a/orchestrator.ts`)
- `EngineAOrchestrator`: Request routing and fallback
  - Registers adapters per domain
  - Routes to local adapter if confidence >= 80%
  - Falls back to Claude if confidence < 80% or error
  - Tracks metrics: local_rate, fallback_rate, confidence, latency, cost
  - Health check and status monitoring
  - Supports staged rollout (10% → 25% → 50% → 75% → 100%)

**Retraining** (`src/engine-a/learning/retraining_pipeline.ts`)
- `MonthlyRetrainingPipeline`: Automated improvement cycle
  - Collects production feedback
  - Identifies user corrections
  - Adds corrections to training data
  - Retrains adapters
  - Evaluates improvements
  - Makes deployment decision
  - Calculates monthly savings

---

## Week-by-Week Execution

### Weeks 1-4: Learning Infrastructure Setup (12h, $0)

**Week 1 (2h):**
- Create directory structure
- Implement `LearningRecord` schema
- Set up `LocalJsonStore`

**Week 2 (3h):**
- Build `SupportExtractor`
- Extract 200+ support cases (score 60+)
- Create JSONL training file

**Week 3 (3h):**
- Build `CodeExtractor` and `AutomationExtractor`
- Extract 150+ code sessions and 200+ automation runs
- Consolidate into 400+ additional records

**Week 4 (4h):**
- Implement `WeeklyConsolidator` and cron job
- Run consolidation on 550 records
- Claude API review ($25): validates patterns, suggests improvements, gives GO/NO-GO

**Deliverable:** 550 learning records ready for training

---

### Weeks 5-12: Adapter Training (60h, $150 LLM)

#### Adapter 1: Support Triage (Weeks 5-6, 16h)
- Extract training examples (Mon 4h)
- Generate 300 synthetic variations ($50 Gemini, Tue-Wed 2h)
- Train on 500 total examples (Thu-Fri 4h)
- Evaluate on 50 test cases (Mon Week 6, 4h)
- Deploy to staging (Tue-Wed Week 6, 4h)
- Success: 85% accuracy, <500ms latency

#### Adapter 2: Code Fix (Weeks 7-8, 14h)
- Extract training examples (Mon 3h)
- Generate synthetic variations ($40 Gemini, Tue-Wed 2h)
- Train on 450 total examples (Wed-Thu 4h)
- Evaluate on 30 test cases (Mon Week 8, 4h)
- Deploy to staging (Tue-Wed Week 8, 1h)
- Success: 82% accuracy, <1s latency

#### Adapter 3: Workflow Router (Weeks 9-10, 13h)
- Extract training examples (Mon 2h)
- Generate synthetic variations ($30 Gemini, Tue 1.5h)
- Train on 500 total examples (Wed-Thu 3h)
- Evaluate on 50 test cases (Fri Week 9, 3h)
- Deploy to staging (Mon-Tue Week 10, 3h)
- Success: 88% accuracy, <300ms latency

#### Adapter 4: Business Intelligence (Weeks 11-12, 13h)
- Extract training examples (Mon 2h)
- Generate synthetic variations ($30 Gemini, Tue 1.5h)
- Train on 300 total examples (Wed-Thu 3h)
- Evaluate on 30 test cases (Fri Week 11, 3h)
- Deploy to staging (Mon-Tue Week 12, 3h)
- Success: 80% accuracy, <2s latency

**Deliverable:** 4 adapters at 80%+ accuracy in staging

---

### Weeks 13-16: Production Deployment (20h, $100)

**Week 13-14 (8h): Orchestration & Testing**
- Set up `EngineAOrchestrator`
- Register all 4 adapters
- Implement fallback to Claude
- Staging testing with 500+ test cases per adapter
- Monitor: accuracy, latency, cost, fallback rate

**Week 15 (5h): Staged Production Rollout**
- Day 1: 10% traffic (monitor closely)
- Day 2: 25% traffic (review metrics)
- Day 3: 50% traffic (check error rates)
- Day 4: 75% traffic (verify latency)
- Day 5: 100% traffic (full deployment)

**Week 16 (4h): Monthly Retraining Setup**
- Implement `MonthlyRetrainingPipeline`
- Schedule for 1st of month, 2am
- Set up feedback collection
- Test dry-run on past month's data
- Configure automated reporting

**Deliverable:** 4 adapters in production, 95%+ local handling, monthly improvement cycle operational

---

## Budget Breakdown ($250 Phase 2)

| Item | Cost | Timeline |
|------|------|----------|
| Claude API (reviews, validation) | $50 | Week 4 + ongoing |
| Gemini (synthetic data) | $90 | Weeks 5-12 ($50+$40+$30+$30) |
| OpenAI (validation spot checks) | $40 | Weeks 5-12 |
| Cloud GPU (training) | $50 | Weeks 5-12 (~$6/week × 8) |
| Storage & backup | $15 | Ongoing |
| Reserve | $5 | Contingency |
| **TOTAL** | **$250** | 16 weeks |

---

## Success Criteria (Week 16)

### Adapters
- ✅ All 4 adapters >80% accuracy
- ✅ All 4 adapters <2s latency (p50)
- ✅ All 4 deployed in production with fallback
- ✅ 95%+ of requests handled locally

### Learning
- ✅ 550+ learning records collected
- ✅ Weekly consolidation automated
- ✅ Monthly retraining cycle operational
- ✅ Feedback loop integrated

### Cost
- ✅ $28,000/month Claude → $40/month inference
- ✅ 99.8% cost reduction
- ✅ Monthly improvement cycle in place

### Readiness
- ✅ Reliable local inference
- ✅ Proven learning loop
- ✅ Production stability
- ✅ Ready for Phase 3 (8 more adapters)

---

## Next Steps

1. **Immediate:** Review this guide and supporting code
2. **Week 1:** Create learning infrastructure (directory structure, schemas)
3. **Week 2:** Build support extractor and extract first batch
4. **Week 3:** Build code + automation extractors
5. **Week 4:** Run consolidation and Claude review
6. **Week 5:** Start training first adapter (Support Triage)
7. **Week 13:** Deploy orchestrator to production
8. **Week 16:** Launch monthly retraining cycle

You now have a complete, implemented Phase 2 build plan ready to execute.
