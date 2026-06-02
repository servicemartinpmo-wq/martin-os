# Engine A Phase 1 Inventory

## Overview
Phase 1 represents the existing hybrid foundation already built through current apps and product work. This inventory documents what exists and is ready to be extracted, structured, and prepared for Phase 2.

## Phase 1 Completed Assets

### Applications & Systems
- **Tech-Ops**: Technical support, troubleshooting, incident diagnosis, API failures, auth failures, CORS/preflight issues, support routing, evidence-required fixes, system diagnostics
- **PMO-Ops**: Business operations, workflow oversight, project management, decision logs, financial operations, marketing operations, strategy, client success, organizational intelligence
- **Miidle**: Proof-of-work logic, credibility scoring, community behavior, content quality, professional identity, signal quality, recommendation logic
- **Workspace**: Task coordination, file organization, productivity flows, document/action relationships, workspace management
- **Creator/Admin**: System governance, model/provider testing, prompt/version tracking, evaluation review, usage patterns, admin controls, operational oversight

### Existing Framework & Knowledge Database
The system includes a robust SQL foundation for Engine A's reasoning layer:
- **modules classification table** - Early categorization by signal, diagnosis, advisory, contextual guidance, scoring, structural relevance, dependency
- **knowledge_bases table** - Domain-specific knowledge organization
- **frameworks table** - Hundreds of business, operational, risk, project, finance, leadership, innovation, and decision frameworks
- **framework_knowledge_link junction table** - Relationships between frameworks and knowledge domains
- **Categorization schema**:
  - Signal detection frameworks
  - Diagnosis frameworks
  - Advisory frameworks
  - Contextual guidance frameworks
  - Scoring frameworks
  - Structural relevance frameworks
  - Dependency frameworks
- **Historical/contextual notes field** - Early annotations for framework application
- **Dependency/linking field** - Framework relationships and prerequisites

#### Framework Categories Represented
1. **Strategic Analysis** - Porter's Five Forces, SWOT, Strategic Group Mapping, Strategy Diamond, Core Competency Model
2. **Growth Strategy** - Ansoff Matrix, Business Model Canvas, Lean Canvas, Product-Led Growth, North Star Metric
3. **Innovation & Product** - Design Thinking, Lean Startup, Jobs to Be Done, Technology Readiness Levels, Innovation Ambition Matrix
4. **Operations & Process** - Lean Manufacturing, Six Sigma, Theory of Constraints, Value Stream Mapping, PDCA
5. **Project Management** - WBS, Critical Path, PERT, RACI, DACI, Agile/Scrum/Kanban
6. **Marketing & Growth** - STP Model, Customer Personas, 4Ps/7Ps, AARRR Funnel, Customer Journey, Flywheel Model
7. **Financial Performance** - ROI, ROIC, NPV, IRR, Payback Period, WACC, Economic Value Added, Risk-Adjusted Return
8. **HR & Organization** - McKinsey 7S, Galbraith Star Model, 9 Box Grid, Competency Frameworks, Span of Control
9. **Leadership & Decision Science** - OODA Loop, Cynefin Framework, Decision Trees, Bayesian Analysis, Red Teaming
10. **Data & Analytics** - KPI Trees, Cohort Analysis, Data Maturity Model, CRISP-DM, Data Governance Framework

### Business & Operational Patterns
- Bug fix workflows with evidence requirements
- Feature build processes with validation gates
- Support case diagnostics and routing
- Test failure analysis and root cause resolution
- Workflow decision documentation
- UI/UX correction patterns
- Technical decision rationale
- Business decision logs
- Architecture decision records
- Pricing and product rules
- Approval and governance processes

### Organizational Intelligence Capabilities
- Operations oversight logic
- Workflow bottleneck detection
- Risk identification patterns
- Project status diagnostic
- Technical issue classification
- Business impact assessment
- Interdependency mapping
- Resource utilization analysis
- Performance metric tracking

## What Engine A Gets From Phase 1

### Intelligence Reasoning Layer
The existing framework database enables Engine A to answer critical questions:
- **What kind of problem is this?** (classification via module types)
- **Is this a signal, diagnosis, advisory, scoring, dependency, or structural issue?** (module categorization)
- **Which framework applies?** (framework matching logic)
- **What historical/contextual information matters?** (historical notes field)
- **What dependencies should be checked?** (dependency/linking field)
- **What kind of recommendation should be generated?** (framework output types)

### Example Application
A workflow bottleneck → Lean, Theory of Constraints, Value Stream Mapping, Bottleneck Analysis
A project delay → Critical Chain, PERT, RAID, WBS, RACI
A strategy decision → SWOT, Porter, OKR, Balanced Scorecard, Scenario Planning
A risk issue → FMEA, Risk Heat Map, ERM, ISO 31000
A decision quality issue → Decision Matrix, Bayesian Updating, Bias Checklist

## Phase 1 Assets Needing Operationalization

### 1. Framework Database Cleanup
- **Schema normalization**: Fix naming inconsistencies (primary_module_id vs primary_module)
- **Module reference validation**: Ensure all module references exist
- **Duplicate frameworks**: Identify and resolve intentional vs accidental duplicates (ADKAR, FMEA, Monte Carlo, Emotional Intelligence, Self-Determination Theory, etc.)
- **Foreign key validation**: Ensure all references are consistent
- **Name-based linking**: Convert hardcoded ID-based links to name-based references
- **Source/category confidence**: Add metadata about framework source quality

### 2. Framework Operationalization
Each framework needs enrichment with:
- **domain**: Primary business domain (strategy, operations, finance, etc.)
- **use_case**: Specific problem this framework solves
- **input_signals**: What indicators suggest this framework applies
- **recommended_when**: Conditions favoring this framework
- **avoid_when**: Conditions where this framework shouldn't apply
- **required_evidence**: What data/information is needed
- **output_type**: What kind of recommendation it produces (diagnosis, advisory, scoring, etc.)
- **related_functions**: Quantitative functions that support this framework
- **related_workflows**: Operational workflows that use this framework
- **phase_3_enterprise_relevance**: How this scales to enterprise

### 3. Missing Critical Frameworks (To Add)
**Strategy**:
- Ansoff Matrix, Strategy Diamond, Core Competency Model, Value Chain Analysis, Three Horizons

**Growth/Product**:
- Business Model Canvas, Lean Canvas, North Star Metric, Product-Led Growth, Hooked Model

**Sales**:
- MEDDICC, BANT, SPICED, Command of the Message

**Finance**:
- DuPont Analysis, Economic Profit Model, Weighted Average Cost of Capital

**Data/Analytics**:
- CRISP-DM, Data Maturity Model, Data Governance Framework

**Supply Chain**:
- SCOR Model

### 4. Quantitative Models (To Add)
**Financial Performance**: NPV, IRR, Payback Period, WACC, Economic Value Added, Risk-Adjusted Return

**Customer Economics**: CAC, LTV, LTV/CAC Ratio, Churn Rate, NRR, SaaS Magic Number

**Operational Efficiency**: OEE, Takt Time, Cycle Time, Throughput, Capacity Utilization

**Marketing Performance**: Conversion Rate, ROAS, Cost Per Acquisition, Engagement Metrics

### 5. Custom Engine A-Native Frameworks (To Add)
- Tenant-Scoped Debugging Framework
- Evidence Before Success Framework
- Signal vs Noise Operations Framework
- Business-to-Technical Impact Mapping
- Workflow Friction Diagnosis
- Support-to-Product Feedback Loop
- Execution Readiness Framework
- App-to-Engine Learning Framework
- Organization Wrapper Readiness Framework

## Phase 1 to Phase 2 Transition
Phase 2 will:
1. **Clean and validate** the existing framework database
2. **Normalize** framework records and schema
3. **Enrich** each framework with operationalization fields
4. **Connect** learning records to applicable frameworks
5. **Add** missing critical frameworks and quantitative models
6. **Create** Engine A-native proprietary frameworks
7. **Build** framework selection logic and evals

## Summary
Engine A does not start from scratch. A sophisticated, business-focused framework and knowledge foundation already exists. Phase 2's primary task is to operationalize, clean, and connect this asset to the learning and execution layers that will make Engine A function as a specialized operating brain.
