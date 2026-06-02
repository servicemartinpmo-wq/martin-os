# Phase 2: Learning System + 4 Production Adapters

## Overview

Phase 2 transforms Engine A from an advisory system into a hybrid intelligence platform:
- **Learning System**: Captures structured learning from all app work
- **4 Specialized Adapters**: Support Triage, Code Fix, Workflow Router, Business Intelligence
- **Intelligent Routing**: Use local adapters (82-88% accuracy), fallback to Claude
- **Monthly Improvement**: Automatic retraining based on production feedback

**Result by Week 16:**
- 95%+ of requests handled locally
- 99.8% cost reduction ($28k/month → $40/month)
- Automatic monthly improvements (+1-2% accuracy)

## Project Structure

```
engine-a/phase-2/
├── learning/
│   ├── schemas/
│   │   └── LearningRecord.ts          # Data structures for all record types
│   ├── migrations/
│   │   └── 001_learning_system.sql    # Database schema
│   ├── extractors/
│   │   └── domain-extractors.ts       # Support, Code, Automation, Business
│   └── consolidators/
│       └── consolidation.ts           # Weekly/monthly analysis
│
├── adapters/
│   └── training-datasets.ts           # Prepare datasets + synthetic variations
│
├── runtime/
│   └── orchestrator.ts                # Route requests to adapters/Claude
│
├── deployment/
│   └── monthly-retraining.ts          # Automatic monthly improvement
│
├── PHASE_2_BUILD_PLAN.md              # Complete 16-week implementation plan
└── README.md                           # This file
```

## Quick Start

### 1. Set Up Learning Infrastructure (Week 1-2)

**Database Schema:**
```bash
# Apply migration
psql -U postgres -d your_db -f learning/migrations/001_learning_system.sql
```

**Data Structures:**
```typescript
import { LearningRecord } from './learning/schemas/LearningRecord';
```

### 2. Extract Historical Data (Week 3-4)

```typescript
import {
  extractSupportCases,
  extractCodeSessions,
  extractAutomationRuns,
  extractBusinessRecords,
  scoreRecords,
} from './learning/extractors/domain-extractors';

// Load your app data
const supportCases = await loadSupportCases();
const codeSessions = await loadCodeSessions();
const automationRuns = await loadAutomationRuns();
const businessOKRs = await loadBusinessOKRs();

// Extract learning records
const allRecords = await extractAllDomains({
  support: supportCases,
  code: codeSessions,
  automation: automationRuns,
  business: businessOKRs,
});

// Score records (quality >= 60 = training-ready)
const { scored, passed } = scoreRecords(allRecords, 60);
console.log(`${passed.length} records ready for training`);
```

### 3. Analyze Learning Records (Week 4)

```typescript
import { consolidateWeek, formatWeeklyReport } from './learning/consolidators/consolidation';

const weeklyConsolidation = await consolidateWeek(1, allRecords);
console.log(formatWeeklyReport(weeklyConsolidation));
```

Output:
```
Week 1 Learning Consolidation
======================================================================
SUMMARY
  Total Records: 550
  Ready for Training: 450

BY DOMAIN
  Support:      200 records, avg quality 75.2
  Code:         150 records, avg quality 70.1
  Automation:   150 records, avg quality 72.3
  Business:     50 records, avg quality 68.5

TOP PATTERNS
  - permission errors (45x, quality 76.2)
  - async/await bugs (12x, quality 73.1)
  - Slack notifications (28x, quality 71.8)

INSIGHTS
  ✅ 450 records ready for adapter training
  • Framework X most used with 95% success
  • Workflow Y latency increased 20%

NEXT FOCUS
  Continue balanced collection across all domains
```

### 4. Prepare Training Datasets (Weeks 5-12)

```typescript
import { createDatasetPackage, exportDatasetAsJSONL } from './adapters/training-datasets';

// Support Triage adapter
const supportDataset = createDatasetPackage(allRecords, 'support_triage');
exportDatasetAsJSONL(supportDataset, 'support-training.jsonl');

// Code Fix adapter
const codeDataset = createDatasetPackage(allRecords, 'code_fix');
exportDatasetAsJSONL(codeDataset, 'code-training.jsonl');

// Workflow Router adapter
const workflowDataset = createDatasetPackage(allRecords, 'workflow_router');
exportDatasetAsJSONL(workflowDataset, 'workflow-training.jsonl');

// Business Intelligence adapter
const businessDataset = createDatasetPackage(allRecords, 'business_intelligence');
exportDatasetAsJSONL(businessDataset, 'business-training.jsonl');
```

**Next: Fine-tune each adapter (Llama 2 7B or Code Llama)**

### 5. Deploy Orchestrator (Weeks 13-14)

```typescript
import { EngineAOrchestrator, OrchestratorRequest } from './runtime/orchestrator';

const orchestrator = new EngineAOrchestrator();

// Request
const request: OrchestratorRequest = {
  domain: 'support',
  input: 'User cannot authenticate to system',
  context: { severity: 'high', category: 'authentication' },
  org_id: 'org-123',
};

// Response
const response = await orchestrator.routeRequest(request);
console.log(response);

// Output:
// {
//   source: 'local',           // Used Support Triage adapter
//   result: { category: 'auth', priority: 'high', ... },
//   confidence: 0.85,
//   latency_ms: 420,
//   cost_cents: 0.01,
//   audit_id: 'prod-1234567...'
// }
```

### 6. Monthly Retraining (Week 16 + ongoing)

```typescript
import { scheduleMonthlyRetraining } from './deployment/monthly-retraining';

// Call on 1st of each month
const retrainingReport = await scheduleMonthlyRetraining(allRecords);

console.log(retrainingReport);
// {
//   month: 'June 2026',
//   successful: 4,
//   failed: 0,
//   total_improvements: 3.7,
//   jobs: [ ... ]
// }
```

---

## Data Flow

### Learning Record Creation

```
App Task
(Support case resolved, code committed, automation run, business decision)
  ↓
Extract → LearningRecord(domain, input, context, action, output, quality)
  ↓
Save to DB + append to dataset.jsonl
  ↓
Tag for learning (reusable, accepted, quality >= 60)
```

### Weekly Consolidation

```
Learning Records (Week N)
  ↓
Group by domain → Calculate stats → Extract patterns
  ↓
Ready for training? (Quality >60 avg, diversity, volume)
  ↓
WeeklyConsolidation (insights, next focus, ready_for_training)
```

### Monthly Retraining

```
Production feedback (1000+ requests)
  ↓
Identify misses (user rejected suggestions)
  ↓
Add misses to training data
  ↓
Retrain adapters → Evaluate
  ↓
Accuracy improved? → Deploy new version
  ↓
Log improvement (+1-2% typical)
```

---

## Adapter Specifications

### Support Triage
- **Input**: Support case description + context (severity, category, tags)
- **Output**: Category, priority, suggested handler, next steps
- **Model**: Llama 2 7B
- **Goal**: 85%+ accuracy, <500ms latency, 95% local handling
- **Training data**: 200+ support cases (resolved, high quality)

### Code Fix
- **Input**: Error description + language + functions changed
- **Output**: Code fix, explanation, language, tested flag
- **Model**: Code Llama 7B
- **Goal**: 82%+ accuracy, <1s latency, 90% local handling
- **Training data**: 150+ code sessions (tests passing, quality >60)

### Workflow Router
- **Input**: Workflow description + integrations needed
- **Output**: Workflow type, action count, duration estimate, integrations
- **Model**: Llama 2 7B
- **Goal**: 88%+ accuracy, <300ms latency, 92% local handling
- **Training data**: 150+ automation runs (completed successfully)

### Business Intelligence
- **Input**: Business question + period
- **Output**: Insight type, key findings, recommendations
- **Model**: Llama 2 7B
- **Goal**: 80%+ accuracy, <2s latency, 85% local handling
- **Training data**: 50+ business decisions (completed, accepted)

---

## Implementation Timeline

| Week | Phase | Focus | Deliverable |
|------|-------|-------|------------|
| 1-2 | Setup | Learning infrastructure | Database + extractors |
| 3-4 | Capture | Extract 550+ records | Backfill + score |
| 5-6 | Support | Train & deploy | Support Triage (85%+) |
| 7-8 | Code | Train & deploy | Code Fix (82%+) |
| 9-10 | Workflow | Train & deploy | Workflow Router (88%+) |
| 11-12 | Business | Train & deploy | Business Intelligence (80%+) |
| 13-14 | Integration | Build orchestrator | Staging tests |
| 15 | Rollout | Staged production | 10% → 100% traffic |
| 16 | Monitor | Improve loop | Monthly retraining |

---

## Metrics & Monitoring

### Production Metrics

```typescript
orchestrator.getProductionStats();
// {
//   total_requests: 5000,
//   local_requests: 4750,         // 95% handled locally
//   fallback_requests: 250,       // 5% fell back to Claude
//   local_rate: "95.0%",
//   avg_latency_ms: "523",
//   total_cost_usd: "2.34",       // 1 day of inference
//   cost_per_request_usd: "0.000468"
// }
```

### Daily Savings Calculation

```
Before Phase 2:
  5000 requests/day × Claude cost (~$0.006) = $30/day
  $30/day × 30 days = $900/month

After Phase 2:
  5000 requests/day × local cost ($0.0001) = $0.50/day
  $0.50/day × 30 days = $15/month
  
Savings: $885/month (98.3% reduction)
```

---

## Budget Allocation

| Item | Cost | Use |
|------|------|-----|
| Claude API | $50 | Reviews, validation (Weeks 1-16) |
| Gemini API | $90 | Synthetic data generation (Weeks 5-12) |
| OpenAI | $40 | Alternative validation (Weeks 5-12) |
| GPU Training | $50 | Adapter fine-tuning (Weeks 5-12) |
| Storage/Backup | $15 | Dataset storage, backups |
| Reserve | $5 | Emergency contingency |
| **TOTAL** | **$250** | Full Phase 2 |

---

## Success Criteria

✅ **Adapters Deployed**
- Support Triage: 85%+ accuracy
- Code Fix: 82%+ accuracy
- Workflow Router: 88%+ accuracy
- Business Intelligence: 80%+ accuracy

✅ **Cost Reduction**
- 95%+ local handling rate
- 99.8% cost savings ($28k → $40/month)

✅ **Production Ready**
- <5% fallback rate
- 99%+ uptime
- No critical errors
- User satisfaction >4.2/5

✅ **Improvement Cycle**
- Monthly retraining automated
- +1-2% accuracy improvement per month
- Learning records flowing

---

## Next Phase

After Week 16, when Phase 2 is complete:
→ **Phase 3**: Enterprise scaling
  - Multi-tenant database
  - Secure organization wrappers
  - Enterprise connector framework
  - Billing and metering
  - Admin console and model lab

---

## Questions?

See `PHASE_2_BUILD_PLAN.md` for detailed week-by-week implementation
