# PHASE 2: ENGINE-A LEARNING SYSTEM + 4 PRODUCTION ADAPTERS

## Complete Implementation Plan (Weeks 1-16)

**Timeline:** 16 weeks  
**Effort:** 90 hours solo  
**Budget:** $250  
**Output:** Learning system operational + 4 adapters (Support Triage, Code Fix, Workflow Router, Business Intelligence) in production with monthly improvement cycle

---

## PHASE 2 OVERVIEW

Engine-A Phase 2 transforms the advisory chat into a hybrid system:
- Extracts training data from all your apps (Support, Code Workspace, PMO-Ops, Creator Panel)
- Trains 4 specialized adapters on that data
- Deploys them alongside Claude with intelligent fallback
- Establishes monthly retraining cycle

**Result by Week 16:**
- 4 adapters at 82-88% accuracy
- 95%+ of requests handled locally
- $28k/month Claude cost → $40/month inference cost
- Automatic monthly improvement (+1-2% accuracy/month)

---

## ARCHITECTURE

```
Request
  ↓
Orchestrator
  ├─ High confidence? → Local Adapter (fast, cheap)
  │   ├─ Support Triage (85%+ accuracy, 420ms)
  │   ├─ Code Fix (82%+ accuracy, 750ms)
  │   ├─ Workflow Router (88%+ accuracy, 280ms)
  │   └─ Business Intelligence (80%+ accuracy, 1.8s)
  │
  └─ Low confidence/error? → Claude Fallback (accurate, expensive)

Learning Record Created → Weekly Review → Monthly Retraining → Improved Adapter
```

---

## FILES CREATED (READY TO IMPLEMENT)

### Learning System
- `learning/schemas/LearningRecord.ts` - Data structures for all record types
- `learning/migrations/001_learning_system.sql` - Database schema
- `learning/extractors/domain-extractors.ts` - Support, Code, Automation, Business extractors
- `learning/consolidators/consolidation.ts` - Weekly/monthly analysis

### Adapters
- `adapters/training-datasets.ts` - Prepare datasets, synthetic variations, eval sets

### Runtime
- `runtime/orchestrator.ts` - Route requests to adapters with Claude fallback

### Deployment
- `deployment/monthly-retraining.ts` - Automatic monthly adapter improvement

---

## WEEK-BY-WEEK IMPLEMENTATION

### WEEKS 1-4: LEARNING SYSTEM SETUP ($0, 12 HOURS)

**Week 1: Learning Infrastructure (3 hours)**

1. Create database tables (from `001_learning_system.sql`)
   - `learning_records` - Capture all app work
   - `weekly_consolidations` - Weekly analysis
   - `training_datasets` - Training data prep
   - `adapter_evaluations` - Model metrics
   - `production_metrics` - Production monitoring
   - `request_feedback` - User feedback on adapter outputs

2. Create TypeScript interfaces (from `LearningRecord.ts`)
   - `LearningRecord` structure
   - `WeeklyConsolidation` structure
   - `TrainingDataset` structure

**Week 2: Domain Extractors (3 hours)**

1. Implement extractors (from `domain-extractors.ts`)
   - Support cases → LearningRecord[]
   - Code sessions → LearningRecord[]
   - Automation runs → LearningRecord[]
   - Business OKRs → LearningRecord[]

2. Extract ~600 historical records
   ```bash
   npx ts-node extractors/support-extractor.ts --limit 200
   npx ts-node extractors/code-extractor.ts --limit 150
   npx ts-node extractors/automation-extractor.ts --limit 200
   npx ts-node extractors/business-extractor.ts --limit 50
   ```

3. Auto-score records (~4 hours)
   - Quality threshold: score >= 60
   - Expected: 550+ records qualify

**Week 3: Backfill Data + Scoring (4 hours)**

1. Run all extractors (2 hours)
   - Pull historical data from each domain
   - Score each record (manual or auto)

2. Verify quality (2 hours)
   - Check data diversity
   - Ensure patterns make sense
   - Confirm ~550+ records >= 60 quality

**Week 4: Consolidation + Claude Review (2 hours)**

1. Weekly consolidation (1 hour)
   - Analyze Week 1-4 records
   - Extract patterns
   - Identify ready-for-training records

2. Send to Claude for validation (1 hour)
   - "Are these patterns coherent?"
   - "Is quality good enough for training?"
   - **GO/NO-GO decision:** Proceed if quality >60 avg, patterns coherent

**Deliverable:** 550+ learning records, ready for training

---

### WEEKS 5-12: TRAIN 4 ADAPTERS (58 HOURS, $150 BUDGET)

#### Adapter 1: Support Triage (Weeks 5-6)

**Week 5: Data Prep (4 hours) + Training (4 hours)**

1. Create training dataset (2 hours)
   - Filter support records: reusable + accepted + quality >= 60
   - Format as `{input, output}` JSONL
   - Target: 200 training examples

2. Generate synthetic variations (2 hours)
   - Use Gemini API ($20) to create 3x variations
   - Different wording, different severity, same root cause
   - Total dataset: 200 original + 300 variations = 500 examples

3. Fine-tune model (4 hours)
   - Use Llama 2 7B (local or Replicate)
   - Train on 500 examples
   - Epochs: 3, batch size: 8, lr: 2e-5
   - Estimated cost: $10-15

**Week 6: Evaluation (4 hours) + Deployment (4 hours)**

1. Evaluate (2 hours)
   - Test on 50 hold-out cases
   - Goal: 85%+ accuracy
   - If <85%: add more data, retrain

2. Deploy to staging (2 hours)
   - Add to orchestrator
   - Test with 100+ support tickets
   - Verify latency <500ms

**Deliverable:** Support Triage, 85%+ accuracy, in staging

#### Adapter 2: Code Fix (Weeks 7-8)

Same process, but:
- Training data: code sessions with tests passing
- Model: Code Llama 7B (better for code)
- Goal: 82%+ accuracy, <1s latency
- Synthetic examples: code variations with same fix

**Deliverable:** Code Fix, 82%+ accuracy, in staging

#### Adapter 3: Workflow Router (Weeks 9-10)

Train on automation runs:
- Input: workflow description + integrations
- Output: workflow type, action count, duration estimate
- Goal: 88%+ accuracy, <300ms latency

**Deliverable:** Workflow Router, 88%+ accuracy

#### Adapter 4: Business Intelligence (Weeks 11-12)

Train on business OKRs + decisions:
- Input: business question + period
- Output: insights, recommendations
- Goal: 80%+ accuracy, <2s latency

**Deliverable:** Business Intelligence, 80%+ accuracy

**Total cost (Weeks 5-12):** ~$150 (Gemini $90 + Claude $40 + GPU $20)

---

### WEEK 13-16: PRODUCTION DEPLOYMENT (20 HOURS)

#### Weeks 13-14: Integration & Testing (8 hours)

1. Build orchestrator (4 hours, from `runtime/orchestrator.ts`)
   ```typescript
   - Route request by domain
   - Try adapter if confidence >= 0.80
   - Fallback to Claude otherwise
   - Create learning record for all requests
   ```

2. Staging tests (4 hours)
   - 500+ support cases through Support Triage
   - 200+ code problems through Code Fix
   - 300+ automation requests through Workflow Router
   - 100+ business questions through BI
   - Check: accuracy, latency, error rates

**Deliverable:** All adapters tested, ready for production

#### Week 15: Production Rollout (8 hours)

1. Staged rollout (2 hours)
   ```
   Day 1: 10% traffic → adapters
   Day 2: 25% traffic → adapters  
   Day 3: 50% traffic → adapters
   Day 4: 75% traffic → adapters
   Day 5: 100% traffic → adapters
   ```

2. Monitor & collect feedback (4 hours)
   - Every request creates learning record
   - Users can approve/reject suggestions
   - Rejected items flagged for retraining

3. Production metrics (2 hours)
   ```
   Support Triage:     85% accuracy, 95% local rate
   Code Fix:           82% accuracy, 90% local rate
   Workflow Router:    88% accuracy, 92% local rate
   Business Intel:     80% accuracy, 85% local rate
   
   Cost: $28k/month → $40/month (99.8% reduction!)
   ```

#### Week 16: Monthly Improvement Cycle (4 hours)

1. Implement monthly retraining (from `deployment/monthly-retraining.ts`)
   - Collect feedback from past month (~1000 records)
   - Identify misses (user rejected suggestions)
   - Add misses to training data
   - Retrain each adapter
   - Evaluate: if accuracy improves, deploy

2. Expected improvement: +1-2% accuracy per month

**Deliverable:** Full production system with monthly improvement

---

## SUCCESS CRITERIA (WEEK 16)

✅ **Learning Infrastructure**
- [ ] 550+ learning records collected
- [ ] Weekly consolidation working
- [ ] Monthly retraining script automated

✅ **Adapters Trained**
- [ ] Support Triage: 85%+ accuracy, <500ms, 95% local rate
- [ ] Code Fix: 82%+ accuracy, <1s, 90% local rate
- [ ] Workflow Router: 88%+ accuracy, <300ms, 92% local rate
- [ ] Business Intelligence: 80%+ accuracy, <2s, 85% local rate

✅ **Production Deployed**
- [ ] All adapters with Claude fallback
- [ ] 95%+ requests handled locally
- [ ] 99.8% cost reduction confirmed
- [ ] Staging tests passed
- [ ] Production rollout complete

✅ **Monitoring**
- [ ] Production metrics dashboard
- [ ] Error alerts configured
- [ ] Cost tracking working
- [ ] Monthly improvement cycle operational

---

## COST BREAKDOWN ($250)

| Item | Cost | Week |
|------|------|------|
| Claude API (reviews, validation) | $50 | 1-16 |
| Gemini API (synthetic data generation) | $90 | 5-12 |
| OpenAI (validation) | $40 | 5-12 |
| Cloud GPU (training) | $50 | 5-12 |
| Storage + backup | $15 | 1-16 |
| Reserve | $5 | - |
| **TOTAL** | **$250** | - |

---

## RISK MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Adapter training too slow | Delays weeks 9-12 | Use Replicate cloud GPU |
| Accuracy <80% | Can't deploy | More training data, longer epochs, synthetic examples |
| Production issues | User disruption | Extensive staging (Week 13-14), slow rollout (10→100%) |
| Learning loop breaks | No monthly improvement | Manual consolidation as fallback |

---

## GO LIVE CHECKLIST

Before moving to Phase 3 (enterprise):

- [ ] All 4 adapters >80% accuracy in production
- [ ] <5% fallback rate (95%+ local)
- [ ] 99%+ uptime in first week
- [ ] No critical errors
- [ ] Cost savings confirmed ($28k → $40/month)
- [ ] User satisfaction >4.2/5
- [ ] Monthly retraining script tested and scheduled
- [ ] Learning records flowing correctly
- [ ] Feedback mechanism working

**If all checks pass:** READY FOR PHASE 3

---

## NEXT STEPS

1. **Week 1:** Set up database and create learning record structures
2. **Week 2:** Implement extractors for all 4 domains
3. **Week 3-4:** Backfill 550+ records and score
4. **Week 5-12:** Train 4 adapters (details above)
5. **Week 13-14:** Build orchestrator and test in staging
6. **Week 15:** Staged rollout to production
7. **Week 16:** Verify metrics and activate monthly retraining

---

## PHASE 2 COMPLETE

After Week 16:
- ✅ Learning system operational (captures all app work)
- ✅ 4 adapters in production (82-88% accuracy, 95%+ local)
- ✅ 99.8% cost savings ($28k → $40/month)
- ✅ Monthly improvement cycle (automated retraining)
- ✅ Ready for Phase 3 enterprise scaling
