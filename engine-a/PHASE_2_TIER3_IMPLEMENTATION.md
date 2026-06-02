# Phase 2: Tier 3 Complete Implementation Guide
## 16-Week Standalone Build (Weeks 1-16)

**Timeline:** 16 weeks  
**Budget:** $250  
**Effort:** 4-5 hours/week average  
**Output:** 4 working adapters in production + sustainable monthly improvement cycle  

---

## PHASE 2 OVERVIEW

Transform Engine A from distributed intelligence into centralized hybrid brain with local inference.

**What you already have:**
- ✅ Code Workspace (training data: bugs fixed, code solutions)
- ✅ Support Desk (training data: issues triaged, cases resolved)  
- ✅ Automations (training data: workflows created, patterns executed)
- ✅ Business Ops (training data: decisions made, priorities set)

**What you're building:**
1. Extract that work into learning records (Weeks 1-4, $0)
2. Train 4 adapters on your data (Weeks 5-12, $150)
3. Deploy to production with fallback to Claude (Weeks 13-16, $100)
4. Establish monthly improvement cycle (Ongoing, $0 + time)

**Result by Week 16:**
- 500-700 learning records
- 4 adapters at 82-88% accuracy
- 95%+ of cases handled locally
- $28,000/month Claude cost → $40/month inference cost
- Monthly improvement built in

---

## WEEK 1-4: LEARNING SYSTEM SETUP ($0, ~12 hours)

### Week 1: Learning Infrastructure (2 hours)

**Create directory structure:**
```
src/engine-a/
├── learning/
│   ├── extractors/
│   │   ├── support_extractor.ts
│   │   ├── code_extractor.ts
│   │   ├── automation_extractor.ts
│   │   └── business_extractor.ts
│   ├── schemas/
│   │   ├── learning_record.ts
│   │   └── domain_schemas.ts
│   ├── consolidators/
│   │   ├── weekly_consolidator.ts
│   │   └── monthly_consolidator.ts
│   └── stores/
│       ├── local_json_store.ts
│       └── supabase_backup.ts
```

**Learning Record Schema:**
```typescript
interface LearningRecord {
  id: string;
  timestamp: Date;
  domain: "support" | "code" | "automation" | "business";
  
  // What happened
  input: string;           // User request/problem
  context: Record<string, any>;
  action: string;          // What system/human did
  output: string;          // Result
  
  // Quality signals
  accepted: boolean;       // Human approved
  feedback?: string;       // Correction if rejected
  latency_ms: number;
  cost_cents: number;
  
  // Learning signals
  tags: string[];
  quality_score: 0-100;
  reusable: boolean;
  notes: string;
}
```

**Weekly consolidation cron:**
- Runs every Sunday 10am
- Organizes records by domain
- Generates weekly summary
- Identifies patterns

### Week 2: Support Domain Extraction (3 hours)

**Build support case extractor:**
- Extract 200+ support cases from last 12 months
- Score each by usefulness (1-100)
- Keep only scores 60+
- Create JSONL training file

**Expected:** 140-180 high-quality support cases

### Week 3: Code & Automation Extraction (3 hours)

**Build code workspace extractor:**
- Extract 150+ code sessions
- Score by test coverage + complexity
- Keep scores 60+

**Build automation extractor:**
- Extract 200+ automation runs
- Score by integration count + reusability
- Keep scores 60+

**Expected:** 350-400 additional records

### Week 4: Weekly Consolidation + Claude Review (4 hours + $25)

**Create Week 1-4 consolidation:**
- 550 records across 4 domains
- Pattern analysis per domain
- Quality statistics
- Claude review ($25 API)

**Claude validates:**
- ✅ Patterns make sense
- ✅ Improvements to learning process
- ✅ 3-4 high-value patterns identified
- ✅ GO/NO-GO decision

---

## WEEK 5-12: ADAPTER TRAINING (8 weeks, ~60 hours, $150 LLM)

### Adapter 1: Support Triage (Weeks 5-6, 16 hours)

**Dataset:** 200+ support cases

**Training pipeline:**
1. Extract training examples (Mon, 4h)
   - Input: case summary + metadata
   - Output: category + priority + handler
   - Format: JSONL

2. Generate synthetic variations (Tue-Wed, $50 Gemini, 2h)
   - Create 300 variations of 200 cases
   - Different wording, edge cases, languages

3. Train on Llama 2 7B with QLoRA (Thu-Fri, 4h)
   - Fine-tune on 200 real + 300 synthetic
   - Use cloud GPU ($5-10)

4. Evaluate vs Claude (Mon Week 6, 4h)
   - Run both on 50 held-out test cases
   - Goal: 85%+ accuracy, <500ms latency

5. Deploy to staging (Tue-Wed Week 6, 4h)
   - Integrate into Support Desk
   - Monitor with Claude fallback

6. Production (Thu Week 6, 2h)
   - If >85%, move to production

**Success Criteria:**
- ✅ 85% accuracy vs Claude's 89%
- ✅ <500ms latency (vs Claude 3s+)
- ✅ $0.0001/request (vs Claude $0.03)
- ✅ Handles 95% of cases

### Adapter 2: Code Fix (Weeks 7-8, 14 hours)

**Dataset:** 150 code sessions

**Training timeline:**
- Week 7: Extract (3h) + Synthetic (2h, $40) + Train (4h)
- Week 8: Evaluate (4h) + Deploy (5h)

**Success Criteria:**
- ✅ 82% accuracy
- ✅ <1s latency
- ✅ $0.0002/request
- ✅ Handles 90% of code problems

### Adapter 3: Workflow Router (Weeks 9-10, 13 hours)

**Dataset:** 200 automation runs

**Training timeline:**
- Week 9: Extract (2h) + Synthetic (1.5h, $30) + Train (3h)
- Week 10: Evaluate (3h) + Deploy (3h)

**Success Criteria:**
- ✅ 88% accuracy
- ✅ <300ms latency
- ✅ Handles 92% of automation requests

### Adapter 4: Business Intelligence (Weeks 11-12, 13 hours)

**Dataset:** Business operations records

**Training timeline:**
- Week 11: Extract (2h) + Synthetic (1.5h, $30) + Train (3h)
- Week 12: Evaluate (3h) + Deploy (3h)

**Success Criteria:**
- ✅ 80% accuracy
- ✅ <2s latency
- ✅ Handles 85% of BI requests

---

## WEEK 13-16: PRODUCTION DEPLOYMENT ($100, ~20 hours)

### Week 13-14: Integration & Testing (8 hours)

**Set up orchestration layer:**
```typescript
async function routeRequest(request: {
  domain: 'support' | 'code' | 'automation' | 'business';
  input: string;
  context: Record<string, any>;
}) {
  // Try local adapter first
  const result = await adapters[request.domain].predict(...);
  
  // Check confidence
  if (result.confidence >= 0.80) {
    return { source: 'local', result, confidence: result.confidence };
  }
  
  // Fallback to Claude
  return { source: 'claude_fallback', result: await claude.complete(...) };
}
```

**Staging deployment:**
- Every request logged for learning
- 500+ test cases per adapter
- Monitor: accuracy, latency, cost, errors

### Week 15: Production Rollout (5 hours)

**Staged rollout:**
- Day 1: 10% of traffic
- Day 2: 25%
- Day 3: 50%
- Day 4: 75%
- Day 5: 100%

**Monitor:**
- Case resolution time
- User satisfaction
- Error rates
- Cost savings

### Week 16: Establish Monthly Improvement Cycle (4 hours)

**Create retraining script:**
```typescript
async function monthlyRetraining() {
  // 1. Collect feedback from past month
  const feedbackRecords = await getFeedbackSinceLastRetraining();
  
  // 2. Identify misses
  const misses = feedbackRecords.filter(r => !r.accepted);
  
  // 3. Update training data
  const newTrainingData = [
    ...existingTrainingData,
    ...misses.map(m => ({
      input: m.input,
      output: m.feedback,
      source: 'production_feedback',
    })),
  ];
  
  // 4. Retrain each adapter
  for (const adapter of adapters) {
    const model = await trainAdapter(adapter, newTrainingData);
    const eval = await evaluateAdapter(model);
    
    if (eval.accuracy > previousVersion.accuracy) {
      await deployAdapter(adapter, model);
    }
  }
  
  // 5. Report
  return {
    improvements: findAccuracyGains(),
    new_patterns: identifyPatterns(newTrainingData),
    cost_savings: calculateCostReduction(),
  };
}
```

**Schedule:** 1st of every month (Sunday automated)

---

## PHASE 2 SUCCESS CRITERIA (Week 16)

### Adapters
- ✅ All 4 adapters >80% accuracy
- ✅ All 4 adapters <2s latency
- ✅ All 4 deployed in production with fallback
- ✅ 95%+ of requests handled locally

### Learning
- ✅ 500-700 learning records collected
- ✅ Weekly consolidation automated
- ✅ Monthly retraining cycle operational
- ✅ Feedback loop integrated in all apps

### Cost
- ✅ $28,000/month Claude → $40/month inference
- ✅ 99.8% cost reduction
- ✅ Monthly improvement cycle in place

### Readiness for Phase 3
- ✅ Reliable local inference
- ✅ Proven learning loop
- ✅ Production stability
- ✅ Ready to expand to 8+ more adapters

---

## BUDGET BREAKDOWN ($250)

| Item | Cost | Notes |
|------|------|-------|
| Claude API (reviews, validation) | $50 | Week 4 + ongoing |
| Gemini (synthetic data) | $90 | Weeks 5-12 (~$12/week) |
| OpenAI (validation) | $40 | Spot checks |
| Cloud GPU (training) | $50 | 8 weeks × ~$6/week |
| Storage & backup | $15 | Supabase + local |
| Reserve | $5 | Contingency |
| **TOTAL** | **$250** | |

---

## WEEKLY TIME COMMITMENT

| Week | Phase | Hours | Notes |
|------|-------|-------|-------|
| 1-4 | Learning setup | 3-4/week | Light, mostly setup |
| 5-8 | Train adapters 1-2 | 6-8/week | Training ~4h, your work ~4h |
| 9-12 | Train adapters 3-4 | 5-7/week | Getting faster |
| 13-16 | Deploy & monitor | 4-6/week | Integration + testing |
| **Ongoing** | **Monthly retraining** | **4-6/month** | Mostly automated |

**Average: 4-5 hours/week during Phase 2**

---

## KEY FILES TO CREATE

- `src/engine-a/learning/extractors/*.ts` - Domain extractors
- `src/engine-a/learning/consolidators/*.ts` - Weekly/monthly consolidation
- `src/engine-a/adapters/*/trainer.ts` - Training orchestration
- `src/engine-a/adapters/*/evaluator.ts` - Model evaluation
- `src/engine-a/orchestrator.ts` - Request routing
- `src/engine-a/monitor.ts` - Metrics + logging
- `src/engine-a/feedback_handler.ts` - User feedback collection
- `src/engine-a/retraining_pipeline.ts` - Monthly improvement

---

## RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Training data too small | Adapters < 80% | Week 2-3: Backfill more data |
| Adapter accuracy low | Can't deploy | Week 6/8/10/12: Extend training if <75% |
| Production issues | User experience | Week 13-14: Extensive staging testing |
| Learning loop breaks | Can't improve | Week 16: Manual weekly consolidation (2h) |
| GPU unavailable | Training blocked | Use Replicate.com as fallback ($10/week) |

---

## NEXT STEPS

1. **This week:** Read this doc + Weeks 1-4 section
2. **Week 1:** Create `/src/engine-a/learning/` structure
3. **Week 2:** Build support extractor + backfill data
4. **Week 3:** Build code + automation extractors
5. **Week 4:** Weekly consolidation + Claude review
6. **Week 5:** Start training Adapter 1 (Support Triage)

---

## READY TO START?

You have:
- ✅ Phase 1 complete (framework intelligence, guardrails, analyzer)
- ✅ Phase 2 learning system foundation
- ✅ This detailed implementation guide
- ✅ Budget allocated ($250)
- ✅ Timeline clear (16 weeks)

**Begin Week 1 learning infrastructure setup immediately.**
