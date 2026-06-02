/**
 * Organization Wrapper Template
 * Defines how Engine A adapts to each organization's systems, data, and rules
 */

import { UUID } from "crypto";

// ============================================================================
// ORG WRAPPER SCHEMA
// ============================================================================

export interface ConnectorConfig {
  type: "database" | "helpdesk" | "email" | "calendar" | "github" | "crm" | "pm" | "custom";
  enabled: boolean;
  connection_string?: string;
  api_key?: string;
  permissions: {
    read: string[]; // Tables/endpoints allowed to read
    write: string[]; // Tables/endpoints allowed to write
  };
  schema_mapping: Record<
    string,
    {
      external_field: string;
      engine_a_field: string;
      transform?: string;
    }
  >;
  requirements: {
    approval_required_for: string[]; // Actions requiring approval
    audit_required: boolean;
    data_freshness: "real_time" | "hourly" | "daily";
    failure_behavior: "fail_open" | "fail_closed" | "retry";
  };
}

export interface OrgWrapper {
  // Identification
  org_id: string;
  tenant_id: string;
  org_name: string;
  environment: "development" | "staging" | "production";

  // Connected Systems
  connectors: {
    database?: ConnectorConfig;
    helpdesk?: ConnectorConfig;
    github?: ConnectorConfig;
    crm?: ConnectorConfig;
    email?: ConnectorConfig;
    custom?: ConnectorConfig[];
  };

  // Data Boundaries
  data_access: {
    allowed_datasets: string[]; // Datasets org can access
    forbidden_datasets: string[]; // Datasets org cannot access
    per_user_filters: Record<string, string>; // User-specific data filters
    data_retention_days: number;
    pii_handling: "anonymize" | "encrypt" | "redact" | "allow";
  };

  // Business Rules & Workflows
  workflows: {
    enabled_workflows: string[]; // Which workflows can run
    disabled_workflows: string[];
    custom_triggers: Record<string, string>; // Org-specific triggers
    required_approval_workflows: string[];
    workflow_customization_rules?: Record<string, any>;
  };

  // Approval & Governance
  approval_gates: {
    workflow_approval: boolean; // Require approval before workflow execution
    action_approval: boolean; // Require approval for high-risk actions
    export_approval: boolean; // Require approval for data exports
    high_risk_approval: boolean; // Any action flagged as high-risk
    approval_authority: string[]; // User IDs who can approve
  };

  // Audit & Compliance
  audit_rules: {
    log_all_requests: boolean;
    log_failures_only: boolean;
    retention_days: number;
    encryption_in_transit: boolean;
    encryption_at_rest: boolean;
  };

  // Learning & Feedback
  learning_rules: {
    capture_learning_records: boolean;
    share_learning_with_other_orgs: boolean; // Always false (data isolation)
    training_data_usage: "org_only" | "aggregated_anonymized"; // Where org data used
    monthly_retraining_participation: boolean; // Include in monthly improvement cycle
  };

  // Custom Configuration
  custom_settings: Record<string, any>;

  // Metadata
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

// ============================================================================
// ORG WRAPPER TEMPLATE (Default)
// ============================================================================

export function createDefaultOrgWrapper(org_id: string, org_name: string): OrgWrapper {
  return {
    org_id,
    tenant_id: org_id, // 1:1 mapping in Phase 2, could be many:1 in Phase 3
    org_name,
    environment: "production",

    connectors: {
      database: {
        type: "database",
        enabled: false,
        permissions: {
          read: [],
          write: [],
        },
        schema_mapping: {},
        requirements: {
          approval_required_for: [],
          audit_required: true,
          data_freshness: "daily",
          failure_behavior: "fail_closed",
        },
      },
    },

    data_access: {
      allowed_datasets: ["public"], // Start minimal
      forbidden_datasets: ["admin", "system"],
      per_user_filters: {},
      data_retention_days: 90,
      pii_handling: "redact",
    },

    workflows: {
      enabled_workflows: [
        "operational-health-assessment",
        "process-bottleneck-detection",
        "root-cause-analysis",
        "project-prioritization",
        "risk-classification",
      ],
      disabled_workflows: [],
      custom_triggers: {},
      required_approval_workflows: ["root-cause-analysis", "project-prioritization"],
    },

    approval_gates: {
      workflow_approval: false,
      action_approval: false,
      export_approval: true,
      high_risk_approval: true,
      approval_authority: [], // Will be set by org admin
    },

    audit_rules: {
      log_all_requests: true,
      log_failures_only: false,
      retention_days: 365,
      encryption_in_transit: true,
      encryption_at_rest: true,
    },

    learning_rules: {
      capture_learning_records: true,
      share_learning_with_other_orgs: false, // ALWAYS false
      training_data_usage: "org_only",
      monthly_retraining_participation: true,
    },

    custom_settings: {},
    created_at: new Date(),
    updated_at: new Date(),
    created_by: "system",
  };
}

// ============================================================================
// ORG WRAPPER RUNTIME ENFORCEMENT
// ============================================================================

export interface EnforcedRequest {
  org_id: string;
  user_id: string;
  action: string;
  data: Record<string, any>;
  requires_approval: boolean;
  allowed_datasets: string[];
  audit_required: boolean;
}

/**
 * Enforce org wrapper constraints on a request
 */
export function enforceOrgContext(
  request: {
    org_id: string;
    user_id: string;
    action: string;
    data: Record<string, any>;
  },
  wrapper: OrgWrapper
): EnforcedRequest {
  // Verify org matches
  if (request.org_id !== wrapper.org_id) {
    throw new Error(`Org mismatch: request org_id does not match wrapper`);
  }

  // Check if action is allowed
  const actionType = request.action.split(".")[0]; // e.g., "workflow.execute" → "workflow"

  if (actionType === "workflow") {
    const workflowId = request.action.split(".")[1];
    if (!wrapper.workflows.enabled_workflows.includes(workflowId)) {
      throw new Error(
        `Workflow ${workflowId} is not enabled for this organization`
      );
    }
  }

  // Determine if approval is required
  let requires_approval = false;
  if (wrapper.approval_gates.action_approval) {
    requires_approval = true;
  }
  if (
    wrapper.workflows.required_approval_workflows.includes(request.action)
  ) {
    requires_approval = true;
  }

  // Apply data filters
  const allowed_datasets = wrapper.data_access.allowed_datasets;

  // Audit required
  const audit_required = wrapper.audit_rules.log_all_requests;

  return {
    org_id: request.org_id,
    user_id: request.user_id,
    action: request.action,
    data: request.data,
    requires_approval,
    allowed_datasets,
    audit_required,
  };
}

// ============================================================================
// ORG WRAPPER CONFIGURATION
// ============================================================================

/**
 * Configure a specific connector for an org
 */
export function configureConnector(
  wrapper: OrgWrapper,
  connectorType: string,
  config: Partial<ConnectorConfig>
): OrgWrapper {
  const updated = { ...wrapper };

  if (connectorType === "database") {
    updated.connectors.database = { ...updated.connectors.database, ...config };
  } else if (connectorType === "helpdesk") {
    updated.connectors.helpdesk = { ...updated.connectors.helpdesk, ...config };
  } else if (connectorType === "github") {
    updated.connectors.github = { ...updated.connectors.github, ...config };
  } else {
    // Custom connector
    if (!updated.connectors.custom) {
      updated.connectors.custom = [];
    }
    const existing = updated.connectors.custom.find(
      (c) => c.type === connectorType
    );
    if (existing) {
      Object.assign(existing, config);
    } else {
      updated.connectors.custom.push({
        type: "custom",
        enabled: true,
        permissions: { read: [], write: [] },
        schema_mapping: {},
        requirements: {
          approval_required_for: [],
          audit_required: true,
          data_freshness: "daily",
          failure_behavior: "fail_closed",
        },
        ...config,
      } as ConnectorConfig);
    }
  }

  updated.updated_at = new Date();
  return updated;
}

/**
 * Enable a workflow for an org
 */
export function enableWorkflow(
  wrapper: OrgWrapper,
  workflowId: string
): OrgWrapper {
  const updated = { ...wrapper };
  if (!updated.workflows.enabled_workflows.includes(workflowId)) {
    updated.workflows.enabled_workflows.push(workflowId);
  }
  updated.workflows.disabled_workflows = updated.workflows.disabled_workflows.filter(
    (w) => w !== workflowId
  );
  updated.updated_at = new Date();
  return updated;
}

/**
 * Disable a workflow for an org
 */
export function disableWorkflow(
  wrapper: OrgWrapper,
  workflowId: string
): OrgWrapper {
  const updated = { ...wrapper };
  if (!updated.workflows.disabled_workflows.includes(workflowId)) {
    updated.workflows.disabled_workflows.push(workflowId);
  }
  updated.workflows.enabled_workflows = updated.workflows.enabled_workflows.filter(
    (w) => w !== workflowId
  );
  updated.updated_at = new Date();
  return updated;
}

/**
 * Set approval authority for an org
 */
export function setApprovalAuthority(
  wrapper: OrgWrapper,
  userIds: string[]
): OrgWrapper {
  const updated = { ...wrapper };
  updated.approval_gates.approval_authority = userIds;
  updated.updated_at = new Date();
  return updated;
}

// ============================================================================
// ORG WRAPPER VALIDATION & DOCUMENTATION
// ============================================================================

export function validateOrgWrapper(wrapper: OrgWrapper): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!wrapper.org_id) errors.push("Missing org_id");
  if (!wrapper.tenant_id) errors.push("Missing tenant_id");
  if (!wrapper.org_name) errors.push("Missing org_name");

  // Learning rules validation (CRITICAL)
  if (wrapper.learning_rules.share_learning_with_other_orgs) {
    errors.push(
      "CRITICAL: share_learning_with_other_orgs must be false (data isolation)"
    );
  }

  // Connector validation
  if (wrapper.connectors.database?.enabled && !wrapper.connectors.database.connection_string) {
    warnings.push("Database connector enabled but no connection string provided");
  }

  // Approval authority
  if (wrapper.approval_gates.approval_authority.length === 0) {
    warnings.push("No approval authority set - approvals will fail");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function generateOrgWrapperDocumentation(wrapper: OrgWrapper): string {
  return `
# Organization Wrapper: ${wrapper.org_name}

**Org ID:** ${wrapper.org_id}
**Tenant ID:** ${wrapper.tenant_id}
**Environment:** ${wrapper.environment}

## Connected Systems
${Object.entries(wrapper.connectors)
  .filter(([, config]) => config?.enabled)
  .map(([type, config]) => `- **${type}**: enabled`)
  .join("\n")}

## Enabled Workflows
${wrapper.workflows.enabled_workflows.map((w) => `- \`${w}\``).join("\n")}

## Data Access
- **Allowed Datasets:** ${wrapper.data_access.allowed_datasets.join(", ")}
- **Forbidden Datasets:** ${wrapper.data_access.forbidden_datasets.join(", ")}
- **PII Handling:** ${wrapper.data_access.pii_handling}
- **Retention:** ${wrapper.data_access.data_retention_days} days

## Approval Requirements
- **Workflow Approval:** ${wrapper.approval_gates.workflow_approval}
- **Action Approval:** ${wrapper.approval_gates.action_approval}
- **Export Approval:** ${wrapper.approval_gates.export_approval}
- **High-Risk Approval:** ${wrapper.approval_gates.high_risk_approval}

## Audit & Compliance
- **Log All Requests:** ${wrapper.audit_rules.log_all_requests}
- **Encryption in Transit:** ${wrapper.audit_rules.encryption_in_transit}
- **Encryption at Rest:** ${wrapper.audit_rules.encryption_at_rest}
- **Retention:** ${wrapper.audit_rules.retention_days} days

## Learning
- **Capture Records:** ${wrapper.learning_rules.capture_learning_records}
- **Data Usage:** ${wrapper.learning_rules.training_data_usage}
- **Retraining Participation:** ${wrapper.learning_rules.monthly_retraining_participation}
- **Share with Other Orgs:** ${wrapper.learning_rules.share_learning_with_other_orgs} (ALWAYS FALSE)

## Metadata
- **Created:** ${wrapper.created_at}
- **Updated:** ${wrapper.updated_at}
- **Created By:** ${wrapper.created_by}
`;
}
