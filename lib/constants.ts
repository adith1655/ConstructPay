export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SITE_MANAGER: "SITE_MANAGER",
  WORKER: "WORKER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Platform Owner",
  ADMIN: "Company Admin",
  SITE_MANAGER: "Site Manager",
  WORKER: "Worker",
};

// Roles that manage a company tenant (sites, crews, payroll, job costing).
export const COMPANY_ROLES = [ROLES.ADMIN, ROLES.SITE_MANAGER, ROLES.WORKER];
// Roles allowed to approve/reject timesheets & view job costing.
export const MANAGER_ROLES = [ROLES.ADMIN, ROLES.SITE_MANAGER];

export const CLASSIFICATIONS = {
  PAYROLL: "PAYROLL",
  CONTRACTOR: "CONTRACTOR",
} as const;

export const CLASSIFICATION_LABELS: Record<string, string> = {
  PAYROLL: "On-Roll (PF / ESI)",
  CONTRACTOR: "Contract Labour (TDS)",
};

export const TIME_ENTRY_STATUS = {
  OPEN: "OPEN",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  FLAGGED: "FLAGGED",
  REJECTED: "REJECTED",
} as const;

export const REQUEST_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  DENIED: "DENIED",
} as const;

// Employer statutory burden applied when accruing job cost on approved time.
// Approximates employer PF (12%) + ESI (3.25%) + other on-costs.
export const LABOR_BURDEN_MULTIPLIER = 1.2;

// Statutory deduction rates used for indicative pay-stub calculations (India).
export const STATUTORY = {
  EMPLOYEE_PF_RATE: 0.12, // Provident Fund (employee share)
  EMPLOYEE_ESI_RATE: 0.0075, // ESI employee share (if eligible)
  ESI_MONTHLY_WAGE_CEILING: 21000, // ESI applies below this gross/month
  PROFESSIONAL_TAX_MONTHLY: 200, // Maharashtra/Delhi indicative PT
  CONTRACTOR_TDS_RATE: 0.01, // Sec 194C TDS for contractors
} as const;

export const WEATHER_OPTIONS = [
  "Clear",
  "Cloudy",
  "Monsoon Rain",
  "Heat Wave",
  "High Wind",
] as const;

export const INDENT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ORDERED: "ORDERED",
} as const;

export const INDENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ORDERED: "Ordered",
};

export const BUDGET_AUDIT_ACTION = {
  ADD: "ADD",
  UPDATE: "UPDATE",
  REMOVE: "REMOVE",
} as const;

export const BUDGET_AUDIT_ACTION_LABELS: Record<string, string> = {
  ADD: "Added",
  UPDATE: "Updated",
  REMOVE: "Removed",
};
