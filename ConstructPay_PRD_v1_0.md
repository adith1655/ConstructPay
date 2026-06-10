# ConstructPay — Product Requirements Document v1.0

*Data Management & Payroll Platform for Construction Businesses*

| | |
|---|---|
| **Prepared by** | Product Management |
| **Status** | Draft — For Review |
| **Last Updated** | June 2025 |
| **Classification** | Confidential |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Target Audience & User Personas](#2-target-audience--user-personas)
3. [User Stories](#3-user-stories)
4. [Functional Requirements](#4-functional-requirements)
   - 4.1 [Landing Page & Public Website](#41-landing-page--public-website)
   - 4.2 [Authentication & Access Control (RBAC)](#42-authentication--role-based-access-control-rbac)
   - 4.3 [Multi-Site Time Tracking](#43-multi-site-time-tracking)
   - 4.4 [Prevailing Wage & Certified Payroll](#44-prevailing-wage--certified-payroll)
   - 4.5 [Job Costing Integration](#45-job-costing-integration)
   - 4.6 [Mobile-First Field Access](#46-mobile-first-field-access)
   - 4.7 [Contractor vs. W-2 Management](#47-contractor-vs-w-2-management)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Future Iterations (V2 Roadmap)](#6-future-iterations--v2-roadmap)
7. [Appendix: Glossary](#7-appendix--glossary)

---

## 1. Executive Summary

### 1.1 Product Vision

ConstructPay is a cloud-native, SaaS payroll and data management platform purpose-built for the construction industry. The platform eliminates the fragmented, error-prone workflows that plague construction payroll — manual certified payroll reports, disconnected job-costing spreadsheets, and paper timesheets collected from remote job sites — and replaces them with a unified, role-aware, mobile-first solution.

Construction businesses operate under a unique set of regulatory, contractual, and operational constraints: prevailing wage laws, certified payroll mandates, multi-site workforce dispersal, mixed labor classifications (W-2 and 1099), and real-time budget tracking requirements. No general-purpose payroll tool adequately serves these needs. ConstructPay is designed from the ground up to address every one of them.

### 1.2 Strategic Goals

- Reduce certified payroll report preparation time by 80% through automated WH-347 generation.
- Provide real-time labor cost visibility at the job-site and project level to prevent budget overruns.
- Ensure full compliance with Davis-Bacon Act, state prevailing wage laws, and IRS 1099/W-2 requirements.
- Enable field teams to log time, equipment usage, and conditions directly from mobile devices — eliminating paper.
- Maintain enterprise-grade security with granular role-based access control appropriate for sensitive payroll data.

### 1.3 Success Metrics

| Metric | Target |
|--------|--------|
| **Adoption** | 80% of field workers using mobile clock-in within 90 days of go-live. |
| **Accuracy** | 99.5%+ payroll calculation accuracy validated against manual audit benchmarks. |
| **Compliance** | Zero WH-347 compliance violations in first 12 months of operation. |
| **Time Savings** | Payroll processing time reduced by ≥70% vs. baseline (measured at 6 months). |
| **Job Cost Delta** | Actual vs. budgeted labor cost variance visible in real-time with < 1% reporting lag. |
| **Retention** | Net Revenue Retention (NRR) > 110% at 12 months. |

---

## 2. Target Audience & User Personas

ConstructPay serves three primary personas. Each persona has distinct needs, permissions, and interaction patterns with the platform.

### Persona 1 — Super Admin (Owner / Payroll Director)

| | |
|---|---|
| **Name / Title** | Robert Chen — VP of Operations, multi-site GC firm |
| **Technical Level** | High — comfortable with SaaS dashboards, ERP exports, and compliance tools |
| **Primary Device** | Desktop (Chrome / Edge), occasional iPad |
| **Core Goals** | Full visibility into labor costs across all projects; zero compliance risk; fast month-end close |
| **Pain Points** | Reconciling payroll data across 6 job sites manually each week; staying current with prevailing wage tables by county; onboarding and offboarding subcontractors quickly |
| **Key Actions** | Provision accounts, set prevailing wage zones, export certified payroll, review global dashboards, manage 1099 vs W-2 classifications |

### Persona 2 — Site Manager / Foreman

| | |
|---|---|
| **Name / Title** | Maria Gutierrez — Site Foreman, 15-person commercial crew |
| **Technical Level** | Medium — uses smartphone daily, familiar with simple apps |
| **Primary Device** | Android smartphone, intermittent LTE on job site |
| **Core Goals** | Quickly log crew hours at the start and end of shifts; tag time to the right cost codes; avoid payroll disputes with crew |
| **Pain Points** | Paper timesheets get lost or smudged; no quick way to flag overtime or weather delays; has to call the office to check budget status |
| **Key Actions** | Clock in/out crew, tag hours to job sites and cost codes, log daily site report (weather, equipment), approve timesheets before payroll cutoff |

### Persona 3 — Standard Worker / Employee

| | |
|---|---|
| **Name / Title** | James Okafor — Electrician, W-2 Employee |
| **Technical Level** | Low-to-Medium — basic smartphone user |
| **Primary Device** | iPhone, personal data plan |
| **Core Goals** | See pay stubs quickly; verify hours logged match expectations; access W-2 at tax time |
| **Pain Points** | Has to contact HR to get pay stub copies; disputes about hours are slow to resolve; unsure which site his hours were billed to |
| **Key Actions** | View personal timesheets, download pay stubs as PDF, view W-2, check remaining PTO balance |

---

## 3. User Stories

### 3.1 Super Admin Stories

| ID | Persona | User Story | Acceptance Criteria |
|----|---------|-----------|---------------------|
| US-01 | Super Admin | As a Super Admin, I want to receive and review access requests from the intake form so that I control exactly who has platform access. | Intake form submission triggers an email notification; Admin dashboard shows pending requests with approve/deny actions; denied requests receive an automated rejection email. |
| US-02 | Super Admin | As a Super Admin, I want to assign roles and job site assignments to provisioned users so that RBAC rules are enforced automatically. | Role assignment UI supports Super Admin, Site Manager, Worker; job site multi-select per user; changes take effect on next login. |
| US-03 | Super Admin | As a Super Admin, I want to view a global payroll dashboard across all job sites so that I can identify cost overruns and schedule discrepancies. | Dashboard shows live labor cost by project, OT flags, and headcount by site with drill-down to individual employees. |
| US-04 | Super Admin | As a Super Admin, I want to generate and export a WH-347 certified payroll report for any project so that I can submit to the awarding authority on time. | Report pre-populates from logged hours, wage rates, and fringe benefits; supports PDF and CSV export; tracks submission history. |
| US-05 | Super Admin | As a Super Admin, I want to configure prevailing wage rates by county and trade classification so that payroll calculations are automatically compliant. | Admin UI for adding/editing wage rate tables by state, county, and craft classification; system uses active table on payroll run. |

### 3.2 Site Manager / Foreman Stories

| ID | Persona | User Story | Acceptance Criteria |
|----|---------|-----------|---------------------|
| US-06 | Site Manager | As a Site Manager, I want to clock my entire crew into a specific job site with one action so that I do not have to individually log each worker. | Bulk clock-in UI allows Foreman to select all on-site crew and a job site; individual confirmations can be adjusted; logged timestamps are accurate to the minute. |
| US-07 | Site Manager | As a Site Manager, I want to tag crew hours to specific cost codes so that labor costs roll up correctly to the project budget. | Cost code selector available during clock-in/out and on timesheet edit; cost codes are pre-populated from the project setup. |
| US-08 | Site Manager | As a Site Manager, I want to log a daily site report including weather and equipment usage directly from my phone so that delays and asset usage are documented. | Mobile daily log form includes weather condition dropdown, temperature, equipment checklist, and free-text notes; submitted reports are visible to Super Admin. |
| US-09 | Site Manager | As a Site Manager, I want to review and approve crew timesheets before the payroll cutoff so that I can catch errors before pay is processed. | Timesheet approval queue shows all crew entries for the current pay period; Foreman can approve, edit, or flag individual entries; unapproved entries block payroll run. |

### 3.3 Worker / Employee Stories

| ID | Persona | User Story | Acceptance Criteria |
|----|---------|-----------|---------------------|
| US-10 | Worker | As a Worker, I want to clock in and out from my phone so that my hours are recorded accurately without paper timesheets. | Mobile clock-in uses GPS to confirm proximity to assigned job site; clock-in is blocked if worker is more than 300 m from site (configurable). |
| US-11 | Worker | As a Worker, I want to view my current and historical pay stubs so that I can verify my compensation without contacting HR. | Pay stubs available as PDF download from the worker portal; shows gross, deductions, net, and YTD totals; history retained for 7 years. |
| US-12 | Worker | As a Worker, I want to download my W-2 at tax time so that I can file my taxes without waiting for a mailed copy. | W-2 generated and available for download by January 31 each year; worker notified by email when available. |
| US-13 | Worker | As a Worker, I want to dispute a timesheet entry that does not match my recollection so that I am paid accurately. | Worker can flag an entry with a comment; flag is escalated to Foreman and Super Admin; resolution status is visible to worker; audit trail preserved. |

---

## 4. Functional Requirements

### 4.1 Landing Page & Public Website

The public-facing marketing site serves as the primary top-of-funnel touchpoint and must reflect a professional, trustworthy brand appropriate for construction industry decision-makers.

#### 4.1.1 Navigation Structure

| Page | Description |
|------|-------------|
| **About Us** | Company mission, team overview, customer logos, and compliance credentials. |
| **Features We Offer** | Full feature breakdown with icons, short descriptions, and benefit callouts. |
| **Sign In** | Routes authenticated users to the platform login page (SSO and credential-based). |
| **Request Access** | Triggers the intake form modal — does NOT auto-create an account. |

#### 4.1.2 Request Access / Create Account — Intake Flow

> **Security Note:** Because ConstructPay handles sensitive payroll and I-9 data, self-service account registration is explicitly prohibited. All account creation must be approved and manually provisioned by a Super Admin. The "Request Access" button must never write a user record to the database.

- Clicking "Request Access" opens a modal form — no page navigation.
- Required fields: Full Name, Business Name, Role Requested, Business Email, Phone Number, Number of Employees, Brief Description of Use Case.
- On submission, the system:
  1. Stores the request in a `pending_requests` table
  2. Sends a confirmation email to the applicant
  3. Sends an alert email to all Super Admins
- Super Admin approves/denies from the Admin Console — approval triggers automated account provisioning email to the applicant with a temporary password and forced reset.
- Denied requests receive a polite rejection email with contact information for follow-up.

#### 4.1.3 Additional Page Requirements

- Responsive design: fully functional on mobile, tablet, and desktop breakpoints.
- WCAG 2.1 AA accessibility compliance.
- Cookie consent banner (GDPR/CCPA compliant).
- Live chat widget (third-party integration, e.g., Intercom) on all pages.
- Footer must include: Privacy Policy, Terms of Service, Security page, Contact Us.

---

### 4.2 Authentication & Role-Based Access Control (RBAC)

#### 4.2.1 Authentication

| Attribute | Specification |
|-----------|---------------|
| **Login Method** | Username (email) + password; optional SAML 2.0 SSO for Enterprise tier. |
| **MFA** | TOTP-based MFA required for Super Admin; optional but encouraged for all roles. |
| **Session Management** | JWT access tokens (15-min expiry); refresh token rotation with 7-day sliding window. |
| **Password Policy** | Minimum 12 characters; complexity rules enforced; bcrypt hashing (cost factor ≥ 12). |
| **Account Lockout** | Temporary lockout after 5 failed attempts; exponential back-off; Super Admin unlock capability. |
| **Audit Logging** | Every authentication event (success, failure, MFA trigger, logout) is logged with timestamp and IP. |

#### 4.2.2 Role Permissions Matrix

| Permission / Capability | Super Admin | Site Manager | Worker |
|------------------------|:-----------:|:------------:|:------:|
| Provision / delete users | ✓ | ✗ | ✗ |
| Assign roles | ✓ | ✗ | ✗ |
| View all sites & global reports | ✓ | ✗ | ✗ |
| Manage assigned site data | ✓ | ✓ | ✗ |
| Approve crew timesheets | ✓ | ✓ | ✗ |
| Clock in / out | ✓ | ✓ | ✓ |
| View own pay stubs & W-2s | ✓ | ✓ | ✓ |
| View own timesheets | ✓ | ✓ | ✓ |
| Export certified payroll reports | ✓ | ✓ | ✗ |
| Access mobile field view | ✓ | ✓ | ✓ |

---

### 4.3 Multi-Site Time Tracking

#### 4.3.1 Overview

Time tracking is the central data input of ConstructPay. Every hour logged must be attributable to a specific worker, job site, cost code, and date. The system supports both individual and bulk clock-in workflows.

#### 4.3.2 Functional Specifications

| Feature | Specification |
|---------|---------------|
| **Clock-In Methods** | GPS-verified mobile clock-in; QR code scan at site kiosk; manual entry by Foreman (with audit note). |
| **Site Tagging** | Worker selects or is auto-assigned their active job site on clock-in; Foreman can override. |
| **Cost Code Tagging** | Cost code selector (pre-populated from project setup) required on all entries; supports split-coding across a shift. |
| **Break Tracking** | Automatic break deduction rules configurable per state (e.g., California 30-min meal break after 5 hrs); manual break logging available. |
| **Overtime Rules** | Configurable by state/jurisdiction: daily OT (CA: >8 hrs/day), weekly OT (FLSA: >40 hrs/week), double-time thresholds. |
| **Timesheet Approval Flow** | Worker logs → Foreman reviews & approves → Super Admin can override → payroll run locked until all entries approved. |
| **Offline Mode** | Mobile app caches clock-in/out events locally when offline; syncs on next network connection; conflict resolution prioritizes server timestamp. |
| **Reporting** | Daily, weekly, and pay-period summaries by worker, site, and cost code; exportable as CSV and PDF. |

---

### 4.4 Prevailing Wage & Certified Payroll

#### 4.4.1 Overview

Public works contracts subject to the Davis-Bacon Act or state prevailing wage laws require contractors to pay predetermined minimum wages to workers and submit certified payroll records. ConstructPay automates both the rate application and the WH-347 report generation.

> **Compliance Scope:** ConstructPay shall maintain an internal prevailing wage database updated quarterly from the U.S. Department of Labor wage determinations and all active state prevailing wage schedules. Super Admins may import custom wage determinations for specific project contracts.

#### 4.4.2 Functional Specifications

| Feature | Specification |
|---------|---------------|
| **Wage Rate Engine** | Automatically applies the correct rate based on project location (county), trade classification (carpenter, electrician, etc.), and work classification (journeyman, apprentice). Rates cascade: project-specific → county → state → federal. |
| **Fringe Benefits** | Tracks and calculates fringe benefit credits (health & welfare, pension, vacation) that may be applied to offset the prevailing wage cash requirement. Supports employer-paid and hourly credit methods. |
| **WH-347 Generation** | System auto-populates all fields of the WH-347 from logged payroll data. Foreman or Super Admin reviews and electronically signs the Statement of Compliance. Output: PDF and XML formats. |
| **State Reports** | Supports state-specific certified payroll report formats where required (e.g., California DIR CPR, New York LS-300 equivalent). Report templates managed by engineering team. |
| **Submission Tracking** | Log of submitted certified payroll reports per project including submission date, period covered, and submitter. Alert system for upcoming submission deadlines. |
| **Audit Trail** | All wage rate lookups, changes, and manual overrides are immutably logged with user, timestamp, and reason. |

---

### 4.5 Job Costing Integration

#### 4.5.1 Overview

Job costing allows construction business owners to track actual labor expenditures against project budgets in real time, enabling proactive management of margin risk before a project is completed.

#### 4.5.2 Functional Specifications

| Feature | Specification |
|---------|---------------|
| **Project Setup** | Super Admin or Site Manager creates projects with: name, contract value, start/end dates, and a cost code breakdown with allocated budget per code. |
| **Real-Time Labor Cost** | Every approved timesheet entry is immediately posted to the relevant project cost code as an accrued labor cost (wage rate × hours + fringe benefits + payroll taxes at effective rate). |
| **Budget vs. Actual** | Dashboard card and drill-down view showing: budgeted hours, actual hours, budgeted labor cost, actual labor cost, percent complete, and projected final cost at current burn rate. |
| **Cost Code Roll-Up** | Labor costs roll up from individual entries → cost code → CSI division → project → portfolio. Any level is viewable and exportable. |
| **ERP / Accounting Export** | One-click export of job cost data in formats compatible with: QuickBooks Desktop/Online, Sage 300 CRE, Viewpoint Vista, and generic CSV for other systems. |
| **Variance Alerts** | Configurable threshold alerts (e.g., 80% budget consumed, 90% budget consumed) trigger email and in-app notifications to Super Admin. |
| **Change Order Tracking** | Budget adjustments via approved change orders are logged as new budget line items — original budget is preserved for variance analysis. |

---

### 4.6 Mobile-First Field Access

#### 4.6.1 Overview

The ConstructPay mobile application (iOS and Android, built as a React Native PWA for maintainability) is the primary interface for field personnel. It is designed for use in harsh environments: bright sunlight, work gloves, intermittent connectivity, and time pressure.

#### 4.6.2 Functional Specifications

| Feature | Specification |
|---------|---------------|
| **Platform** | Progressive Web App (PWA) optimized for iOS 15+ and Android 9+. Native device install via Add to Home Screen. Full offline capability via service worker caching. |
| **UI Design Principles** | Large tap targets (minimum 48×48 dp); high-contrast text; bottom navigation for thumb reach; minimal steps to complete core actions (clock-in ≤ 2 taps). |
| **Worker View** | Home screen shows clock-in/out button, today's hours, active job site, and quick link to latest pay stub. |
| **Foreman View** | Home screen shows crew list with real-time clock-in status, daily site report shortcut, timesheet approval queue, and site budget summary card. |
| **Daily Site Report** | Form includes: date (auto), weather condition (dropdown: Clear / Cloudy / Rain / Snow / High Wind), temperature, equipment checklist (drag to mark deployed), visitor log, safety incidents (Y/N with detail), and free-text notes. Photos attachable via camera. |
| **Push Notifications** | Foreman receives alerts for: overtime threshold approaching, timesheet approval deadline, clock-in anomalies (worker outside geofence). Workers receive: timesheet approved, pay stub available, W-2 available. |
| **Offline Mode** | All core time-tracking functions work without network. Data queued and synced automatically. Conflict indicator shown on reconnect. |
| **Geofencing** | Each job site has a configurable geofence radius (default 300 m). Clock-in outside geofence prompts a confirmation reason which is logged and flagged for Foreman review. |

---

### 4.7 Contractor vs. W-2 Management

#### 4.7.1 Overview

Construction projects routinely mix W-2 direct employees and 1099 independent subcontractors within the same crew and on the same job site. ConstructPay manages both labor classifications from a single worker record, ensuring correct tax treatment and compliance documentation for each type.

#### 4.7.2 Worker Classification

| Classification | Treatment |
|----------------|-----------|
| **W-2 Employee** | Subject to FICA withholding, federal/state income tax withholding, FUTA/SUTA employer contributions. Eligible for overtime, benefits tracking, and workers' comp integration. |
| **1099 Contractor** | No payroll tax withholding. System tracks total payments per contractor and triggers 1099-NEC generation at year-end for payments ≥ $600. Contractor must supply W-9 before first payment; system blocks payment release until W-9 is on file. |

#### 4.7.3 Functional Specifications

| Feature | Specification |
|---------|---------------|
| **Worker Profiles** | Each worker record includes: classification (W-2 / 1099), trade/craft, hire date, wage rate(s), tax withholding elections (W-4 for W-2), W-9 status (for 1099), certification expirations (OSHA cards, etc.). |
| **Mixed Crew Timesheets** | Time tracking, site tagging, and cost code tagging function identically for both worker types. Payroll processing diverges at payment calculation step. |
| **1099 Payments** | Payments to 1099 contractors are tracked as accounts payable entries (not payroll runs). Totals accumulate in the contractor's payment ledger for 1099-NEC generation. |
| **1099-NEC Generation** | Year-end process generates 1099-NEC PDFs for all qualifying contractors with a single click. Supports e-filing via IRS FIRE system integration. |
| **W-2 Generation** | Year-end process generates W-2s for all W-2 employees. Supports SSA e-filing and state W-2 e-filing where required. |
| **Compliance Blocking** | System hard-blocks any payment to a contractor without a W-9 on file. System generates a warning (not a block) if a contractor record exceeds FLSA criteria for re-classification (configurable rule engine). |
| **Certificate Tracking** | Store OSHA-10, OSHA-30, trade licenses, and insurance certificates with expiration dates. Dashboard alert 30/60/90 days before expiry. |

---

## 5. Non-Functional Requirements

| Category | Requirement | Specification |
|----------|-------------|---------------|
| **Security** | Data Encryption at Rest | All PII and payroll data encrypted using AES-256 in the database. Encryption keys managed via AWS KMS with automatic annual rotation. |
| **Security** | Data Encryption in Transit | TLS 1.3 minimum for all client-server communication. HSTS enforced. Certificate pinning on mobile PWA. |
| **Security** | RBAC Enforcement | All API endpoints enforce role checks server-side. Client-side role checks are UI-only and never trusted by the API layer. |
| **Security** | Penetration Testing | Annual third-party penetration test required. Critical and high findings remediated within 30 and 60 days respectively. Report summary shared with Enterprise customers on request. |
| **Security** | SOC 2 Type II | Platform must achieve SOC 2 Type II certification within 18 months of launch. Controls cover Security, Availability, and Confidentiality trust service criteria. |
| **Compliance** | IRS & DOL Compliance | Payroll calculations must comply with current IRS Publication 15 (Circular E), state withholding publications, and DOL wage and hour regulations. Compliance library updated within 30 days of regulatory changes. |
| **Compliance** | Davis-Bacon Act | WH-347 report format must comply with current DOL form version. Wage rate database updated quarterly from official DOL determinations. |
| **Compliance** | GDPR / CCPA | Data subject access requests processed within 30 days. Right to deletion honored for non-payroll-required data. Data processing addendum available for Enterprise customers. |
| **Compliance** | Data Retention | Payroll records retained for 7 years per IRS requirements. Certified payroll records retained for 3 years post-project completion per Davis-Bacon rules. |
| **Performance** | API Response Time | 95th percentile API response time ≤ 300 ms under normal load. 99th percentile ≤ 800 ms. |
| **Performance** | Mobile App Load | First Contentful Paint (FCP) ≤ 1.5 s on 4G LTE. Time to Interactive (TTI) ≤ 3 s. |
| **Performance** | Payroll Processing | A payroll run for up to 500 employees must complete within 60 seconds. Batch notifications delivered within 5 minutes of run completion. |
| **Availability** | SLA Uptime | 99.9% monthly uptime SLA (≤ 43.8 min downtime/month) for Professional tier; 99.95% for Enterprise tier. Payroll processing windows excluded from planned maintenance. |
| **Availability** | Disaster Recovery | RTO ≤ 4 hours; RPO ≤ 1 hour. Daily database snapshots with 30-day retention. Cross-region replication in AWS (us-east-1 primary, us-west-2 standby). |
| **Scalability** | Concurrent Users | Platform must support 10,000 concurrent active sessions without performance degradation. Auto-scaling configured to handle 3× baseline during peak periods (Monday morning clock-ins). |
| **Scalability** | Data Volume | Designed for up to 100,000 worker records and 10 years of payroll history per tenant without performance degradation. |
| **Usability** | Accessibility | WCAG 2.1 Level AA compliance across all web interfaces. Mobile app meets iOS and Android accessibility guidelines. |
| **Usability** | Browser Support | Chrome 110+, Firefox 110+, Safari 15+, Edge 110+. Mobile browsers: Safari on iOS 15+, Chrome on Android 9+. |

---

## 6. Future Iterations — V2 Roadmap

The following capabilities are explicitly out of scope for V1 but have been validated as high-demand through customer discovery interviews and should be prioritized in subsequent releases.

### 6.1 HR & Benefits Management

- Employee onboarding workflows with I-9 verification, benefits enrollment, and digital handbook acknowledgement.
- Benefits deduction management: health insurance, 401(k), HSA/FSA, union dues — integrated directly into payroll calculation.
- PTO / paid sick leave accrual engine with state-specific rules (California SB 616, etc.) and employee self-service request portal.
- Performance review module with Foreman-to-Worker feedback cycles and documentation.

### 6.2 Equipment & Asset Tracking

- Equipment register with per-asset cost rates; Foreman logs equipment deployment hours from the mobile daily log.
- Equipment cost automatically added to job cost roll-up alongside labor costs.
- Maintenance schedule tracking and alert system for inspection intervals.
- GPS telematics integration (Samsara, Verizon Connect) for real-time asset location and idle time reporting.

### 6.3 Materials & Subcontract Management

- Sub-contract commitment tracking with payment application workflow (AIA G702/G703 format).
- Lien waiver management: conditional and unconditional waivers attached to payment milestones.
- Purchase order module for materials tied to cost codes and project budgets.

### 6.4 Advanced Analytics & Reporting

- AI-powered labor productivity benchmarking (actual hours vs. estimated hours by trade and task type).
- Predictive budget overrun alerts using earned value management (EVM) calculations.
- Multi-project portfolio dashboard with cross-project crew utilization heat maps.
- Custom report builder with scheduled email delivery and Power BI / Tableau connector via REST API.

### 6.5 Platform & Integration Expansion

- Native integrations: Procore, Autodesk Construction Cloud, Buildertrend, CoConstruct for project data synchronization.
- Open REST API with full developer documentation and webhook support for custom integrations.
- Workers' Compensation insurance integration with automated NCCI payroll reporting to insurance carriers.
- Multi-currency and multi-country support for contractors operating in Canada and Mexico.

---

## 7. Appendix — Glossary

| Term | Definition |
|------|------------|
| **Davis-Bacon Act** | U.S. federal law requiring contractors on federal construction projects to pay locally prevailing wages and fringe benefits. |
| **WH-347** | U.S. Department of Labor form used by contractors to submit certified payroll records on federally funded construction projects. |
| **Certified Payroll** | A weekly payroll report submitted to a government agency confirming that workers were paid the prevailing wage rates for their classifications. |
| **Cost Code** | A numeric or alphanumeric identifier used to categorize labor, material, or equipment costs by work type within a project budget (often based on the CSI MasterFormat). |
| **Prevailing Wage** | A minimum wage rate set by law for construction workers on public works projects, determined by the U.S. DOL or state labor agencies. |
| **FUTA / SUTA** | Federal and State Unemployment Tax Acts — payroll taxes paid by employers to fund unemployment insurance programs. |
| **1099-NEC** | IRS form used to report non-employee compensation (payments to independent contractors of $600 or more in a tax year). |
| **W-9** | IRS form completed by contractors providing their Taxpayer Identification Number for use in 1099 reporting. |
| **RBAC** | Role-Based Access Control — a security model that restricts system access based on a user's defined role within an organization. |
| **PWA** | Progressive Web App — a web application that can be installed on a mobile device and provides offline functionality via service worker caching. |
| **EVM** | Earned Value Management — a project management technique for measuring project performance and progress against scope, schedule, and budget. |
| **CSI MasterFormat** | A standard filing system for construction specifications and cost codes maintained by the Construction Specifications Institute. |
| **SOC 2 Type II** | An auditing standard developed by the AICPA that evaluates a service organization's controls over security, availability, and confidentiality over a period of time. |
| **JWT** | JSON Web Token — a compact, URL-safe token format used to represent claims between two parties, used here for API authentication. |
| **RTO / RPO** | Recovery Time Objective / Recovery Point Objective — disaster recovery targets measuring maximum tolerable downtime and maximum acceptable data loss, respectively. |

---

*ConstructPay — Product Requirements Document v1.0*
*Confidential. For internal use only. Do not distribute without authorization.*

© 2025 ConstructPay. All rights reserved.
