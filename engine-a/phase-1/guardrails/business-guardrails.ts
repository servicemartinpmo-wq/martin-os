/**
 * Business Context Guardrails
 * Ensure Engine A stays focused on business problems (not general knowledge)
 */

// ============================================================================
// BUSINESS CONTEXT VALIDATION
// ============================================================================

export interface BusinessContextValidation {
  is_business_focused: boolean;
  is_valid: boolean;
  reason: string;
  allowed_domains: string[];
  confidence: number;
}

/**
 * Check if input is business-focused
 * Engine A should only handle business/operational/technical business problems
 * Not: poems, trivia, general knowledge, math homework, entertainment
 */
export function validateBusinessContext(input: string): BusinessContextValidation {
  const businessKeywords = [
    // Operations
    "operations",
    "workflow",
    "process",
    "bottleneck",
    "capacity",
    "throughput",
    "efficiency",

    // Business
    "revenue",
    "cost",
    "budget",
    "financial",
    "profit",
    "roi",
    "metrics",
    "performance",
    "goals",
    "strategy",

    // Team/Organization
    "team",
    "department",
    "organization",
    "management",
    "leadership",
    "staffing",
    "resource",

    // Projects
    "project",
    "timeline",
    "delivery",
    "deadline",
    "milestone",
    "priority",

    // Support/Technical Business
    "support",
    "customer",
    "issue",
    "problem",
    "error",
    "bug",
    "deployment",
    "integration",
    "system",
    "technical",

    // Diagnostics
    "diagnose",
    "diagnosis",
    "troubleshoot",
    "root cause",
    "analysis",
    "investigate",
    "risk",

    // Decision/Advisory
    "decision",
    "recommendation",
    "analysis",
    "evaluation",
    "assessment",
    "should we",
  ];

  const forbiddenKeywords = [
    // Entertainment
    "poem",
    "story",
    "joke",
    "game",
    "movie",
    "music",
    "song",
    "entertainment",

    // General Knowledge
    "capital of",
    "who is",
    "what is the",
    "history of",
    "definition of",
    "meaning of",
    "scientific",
    "how many",
    "when was",

    // Homework/Academic
    "math problem",
    "homework",
    "essay",
    "exam",
    "quiz",
    "answer key",

    // Non-business creative
    "creative writing",
    "fiction",
    "character",
    "plot",
    "general knowledge",
    "trivia",

    // Political/Personal
    "politics",
    "religion",
    "philosophy",
    "personal advice",
    "life coaching",
  ];

  const lowerInput = input.toLowerCase();

  // Check for forbidden content
  for (const keyword of forbiddenKeywords) {
    if (lowerInput.includes(keyword)) {
      return {
        is_business_focused: false,
        is_valid: false,
        reason: `This appears to be about "${keyword.replace(/_/g, " ")}", which is not business-focused. Engine A is designed for operational, technical, and business problems. Use Claude directly for general knowledge.`,
        allowed_domains: [],
        confidence: 0.95,
      };
    }
  }

  // Check for business content
  const businessMatches = businessKeywords.filter((kw) => lowerInput.includes(kw));

  if (businessMatches.length >= 2) {
    // Strong business focus
    const domains = inferDomains(lowerInput);
    return {
      is_business_focused: true,
      is_valid: true,
      reason: `Business-focused query detected. Inferred domains: ${domains.join(", ")}`,
      allowed_domains: domains,
      confidence: Math.min(0.95, 0.5 + businessMatches.length * 0.15),
    };
  } else if (businessMatches.length === 1) {
    // Possible business
    const domains = inferDomains(lowerInput);
    return {
      is_business_focused: true,
      is_valid: true,
      reason: `Possible business query. Single business keyword match.`,
      allowed_domains: domains,
      confidence: 0.65,
    };
  } else {
    // No business keywords
    return {
      is_business_focused: false,
      is_valid: false,
      reason: "This query doesn't appear to be about business operations, technical support, or organizational problems. Engine A is specialized for business-focused questions. Use Claude directly.",
      allowed_domains: [],
      confidence: 0.8,
    };
  }
}

function inferDomains(input: string): string[] {
  const lowerInput = input.toLowerCase();
  const domains: string[] = [];

  // Operations
  if (
    lowerInput.includes("workflow") ||
    lowerInput.includes("process") ||
    lowerInput.includes("bottleneck") ||
    lowerInput.includes("efficiency") ||
    lowerInput.includes("capacity")
  ) {
    domains.push("operations");
  }

  // Technical
  if (
    lowerInput.includes("bug") ||
    lowerInput.includes("error") ||
    lowerInput.includes("code") ||
    lowerInput.includes("deploy") ||
    lowerInput.includes("system") ||
    lowerInput.includes("integration") ||
    lowerInput.includes("technical")
  ) {
    domains.push("technical");
  }

  // Support
  if (
    lowerInput.includes("support") ||
    lowerInput.includes("customer") ||
    lowerInput.includes("issue") ||
    lowerInput.includes("troubleshoot")
  ) {
    domains.push("support");
  }

  // Business/Strategy
  if (
    lowerInput.includes("revenue") ||
    lowerInput.includes("cost") ||
    lowerInput.includes("budget") ||
    lowerInput.includes("strategy") ||
    lowerInput.includes("goals") ||
    lowerInput.includes("decision") ||
    lowerInput.includes("metric")
  ) {
    domains.push("business");
  }

  // Product
  if (
    lowerInput.includes("product") ||
    lowerInput.includes("feature") ||
    lowerInput.includes("user")
  ) {
    domains.push("product");
  }

  return domains.length > 0 ? domains : ["unknown"];
}

// ============================================================================
// DOMAIN-SPECIFIC VALIDATION
// ============================================================================

export interface DomainValidator {
  domain: string;
  validate(input: string): boolean;
  reason?: string;
}

export const domainValidators: Record<string, DomainValidator> = {
  operations: {
    domain: "operations",
    validate: (input: string) => {
      const keywords = [
        "workflow",
        "process",
        "bottleneck",
        "efficiency",
        "capacity",
        "throughput",
        "quality",
      ];
      return keywords.some((k) => input.toLowerCase().includes(k));
    },
  },

  technical: {
    domain: "technical",
    validate: (input: string) => {
      const keywords = [
        "bug",
        "error",
        "code",
        "deploy",
        "system",
        "integration",
        "api",
        "database",
      ];
      return keywords.some((k) => input.toLowerCase().includes(k));
    },
  },

  support: {
    domain: "support",
    validate: (input: string) => {
      const keywords = [
        "support",
        "customer",
        "issue",
        "troubleshoot",
        "help",
        "fix",
      ];
      return keywords.some((k) => input.toLowerCase().includes(k));
    },
  },

  business: {
    domain: "business",
    validate: (input: string) => {
      const keywords = [
        "revenue",
        "cost",
        "budget",
        "strategy",
        "goal",
        "decision",
        "metric",
      ];
      return keywords.some((k) => input.toLowerCase().includes(k));
    },
  },
};

// ============================================================================
// DRIFT DETECTION
// ============================================================================

export interface DriftSignal {
  category: "warning" | "error";
  reason: string;
  recovery_suggestion: string;
}

/**
 * Detect if Engine A is drifting toward general knowledge
 * Warning signs: increasing non-business questions, decreasing framework usage, etc.
 */
export function detectDrift(
  recent_requests: Array<{ input: string; domain: string; is_business: boolean }>,
  window_size: number = 100
): DriftSignal | null {
  // Look at recent requests
  const recent = recent_requests.slice(-window_size);

  if (recent.length === 0) return null;

  // Calculate business focus rate
  const businessFocusRate = recent.filter((r) => r.is_business).length / recent.length;

  if (businessFocusRate < 0.7) {
    return {
      category: "warning",
      reason: `Only ${(businessFocusRate * 100).toFixed(0)}% of recent requests are business-focused (target: 80%+)`,
      recovery_suggestion:
        "Review recent requests for patterns. Ensure guardrails are rejecting non-business queries early.",
    };
  }

  // Check for domain diversity
  const domains = new Set(recent.map((r) => r.domain));

  if (domains.size < 2) {
    return {
      category: "warning",
      reason: `Low domain diversity: only ${domains.size} domain(s) in recent requests`,
      recovery_suggestion:
        "Engine A may be specializing too narrowly. Verify this is intentional, or broaden input sources.",
    };
  }

  return null;
}

// ============================================================================
// ENFORCEMENT LAYER
// ============================================================================

export interface EnforcementResult {
  allowed: boolean;
  reason: string;
  route_to: "engine_a" | "claude_direct" | "rejected";
  severity: "info" | "warning" | "error";
}

/**
 * Enforce business context constraints
 * Main entry point for request routing
 */
export function enforceBusinessContextGate(input: string): EnforcementResult {
  const validation = validateBusinessContext(input);

  if (!validation.is_valid) {
    return {
      allowed: false,
      reason: validation.reason,
      route_to: "claude_direct",
      severity: "info",
    };
  }

  if (!validation.is_business_focused) {
    return {
      allowed: false,
      reason: validation.reason,
      route_to: "claude_direct",
      severity: "info",
    };
  }

  if (validation.confidence < 0.6) {
    // Low confidence - use Claude for safety
    return {
      allowed: false,
      reason:
        "Low confidence in business focus. Using Claude to be safe. If this is a business question, please add more context.",
      route_to: "claude_direct",
      severity: "warning",
    };
  }

  return {
    allowed: true,
    reason: `Business-focused query: ${validation.allowed_domains.join(", ")}`,
    route_to: "engine_a",
    severity: "info",
  };
}

// ============================================================================
// LOGGING & MONITORING
// ============================================================================

export interface GuardrailLog {
  timestamp: Date;
  input: string;
  validation: BusinessContextValidation;
  enforcement: EnforcementResult;
  user_id?: string;
  org_id?: string;
}

export function logGuardrailCheck(log: GuardrailLog): void {
  // In production, log to database for monitoring and drift detection
  if (!log.validation.is_business_focused) {
    console.warn(`Non-business query rejected:`, log.input.substring(0, 100));
  }
}

export function generateGuardrailReport(logs: GuardrailLog[]): {
  total_requests: number;
  business_focused: number;
  business_rate: number;
  non_business_rate: number;
  routed_to_engine_a: number;
  routed_to_claude: number;
  rejected: number;
} {
  return {
    total_requests: logs.length,
    business_focused: logs.filter((l) => l.validation.is_business_focused).length,
    business_rate: logs.filter((l) => l.validation.is_business_focused).length / logs.length,
    non_business_rate:
      logs.filter((l) => !l.validation.is_business_focused).length / logs.length,
    routed_to_engine_a: logs.filter((l) => l.enforcement.route_to === "engine_a").length,
    routed_to_claude: logs.filter((l) => l.enforcement.route_to === "claude_direct").length,
    rejected: logs.filter((l) => l.enforcement.route_to === "rejected").length,
  };
}
