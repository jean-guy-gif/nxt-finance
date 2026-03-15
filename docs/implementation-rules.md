# Implementation rules - NXT Finance

## Objective
Build NXT Finance as a real SaaS MVP for real estate agency managers, focused on financial steering and collaborative pre-accounting.

The implementation must strictly follow:
- `PRD.md`
- `docs/design-direction.md`

This file defines the build rules, architecture rules, and implementation priorities.

---

## Core product rules

- NXT Finance must not be built as a full accounting software.
- NXT Finance must not try to replace the accountant or expert-comptable.
- NXT Finance must help the manager:
  - monitor activity
  - track revenue, expenses, and cash
  - centralize supporting documents
  - prepare accounting periods
  - collaborate with the accountant
- The product must stay understandable for a non-accountant user.
- The product must feel operational, premium, modern, and reliable.

---

## MVP implementation priority

Build the MVP around these modules only:

1. dashboard
2. revenue
3. expenses and supporting documents
4. VAT and accounting periods
5. accountant workspace
6. settings
7. demo mode

Do not build advanced features outside the MVP unless required by the PRD.

---

## Build philosophy

- Prefer a clean and credible MVP over a broad but shallow product.
- Prefer explicit and understandable workflows over “smart” but opaque automations.
- Prefer deterministic logic for finance and alerts.
- Use AI or OCR only as assistance layers, never as unquestionable truth.
- Any extracted or inferred value must remain editable by the user.
- If an assumption is needed, choose the simplest scalable approach and document it briefly.

---

## Architecture rules

- Build the project with a modular architecture.
- Separate clearly:
  - UI components
  - page containers
  - business/domain logic
  - data models/types
  - mock/demo data
  - services
  - permissions and roles
- Do not put important business logic directly inside page JSX.
- Use reusable UI primitives and reusable business components.
- Keep the codebase ready for:
  - single-agency usage
  - multi-agency compatibility later
  - richer integrations later

Recommended layers:
- `app` or `pages` for route-level pages
- `components` for UI blocks
- `features` for domain modules
- `lib` or `utils` for helpers
- `types` for shared models
- `mocks` for demo data
- `services` for OCR, exports, and future integrations

---

## Data modeling rules

- Every business object must be designed with agency compatibility in mind.
- Every important object should include:
  - `id`
  - `agencyId` when relevant
  - `createdAt`
  - `updatedAt`
  - `createdBy` when relevant
  - `status` when relevant
- Distinguish clearly between:
  - raw extracted data
  - user-edited data
  - validated data
- Never present estimated financial data as certified accounting truth.
- Any value produced by OCR must be traceable as extracted and user-correctable.

---

## UX rules

- The product must stay readable for non-experts.
- Use simple, direct labels.
- Avoid unnecessary accounting jargon.
- Keep cognitive load low.
- Prioritize quick understanding over dense dashboards.
- Default view must be monthly.
- Trimestrial and annual views must extend the same logic, not create new complexity.
- Critical actions must be visible without hunting through the UI.

UX priorities by device:
- mobile: upload, capture, alert review, quick validation
- tablet: consultation and light actions
- desktop: dashboard, period review, exports, detailed workflows

---

## Design execution rules

- Use `docs/design-direction.md` as the design authority.
- The Figma dashboard kit is inspiration only.
- The final UI must feel like a native NXT product.
- Do not clone the Figma source literally.
- Respect the spirit of NXT Profiling:
  - premium
  - clean
  - business-oriented
  - reassuring
  - modern
- Prioritize:
  - readability
  - hierarchy
  - spacing
  - consistency
  - calm visual rhythm
- Avoid:
  - template-like look
  - overdecorated cards
  - excessive gradients
  - flashy generic admin-dashboard aesthetics
  - cramped layouts

---

## Functional implementation rules by module

### Dashboard
- Build a real operational overview, not a generic analytics page.
- Display the main business and administrative signals clearly.
- Highlight:
  - period revenue
  - period collections
  - expenses
  - treasury
  - VAT estimate
  - missing documents
  - accountant requests
  - top alerts
- Use obvious calls to action.

### Revenue
- Build a dedicated revenue module.
- Distinguish at least:
  - revenue
  - collections
  - items to verify
- Make the data period-aware.
- Make demo mode realistic.

### Expenses and supporting documents
- Make expense creation fast.
- Support both manual creation and document-first workflows.
- Support mobile-first ticket capture.
- OCR must assist, never lock the workflow.
- Support document status and anomaly states.

### VAT and accounting periods
- Present VAT as preparation and estimation.
- Keep period states simple and understandable.
- Show which documents are included or excluded.
- Make readiness visible.

### Accountant workspace
- Make the accountant workflow clean and narrow.
- Respect fine-grained permissions.
- Surface requests, comments, validations, and exports clearly.
- Keep traceability visible.

### Settings
- Support:
  - agency info
  - thresholds
  - user roles
  - categories
  - notifications
  - accountant permissions

---

## Alert system rules

- Alerts must be deterministic and understandable.
- Use only three levels:
  - info
  - vigilance
  - critical
- Do not over-alert.
- Each alert must have:
  - a clear message
  - a level
  - a related object or period
  - an expected action when relevant
- Alerts should be visible:
  - in dashboard summaries
  - in dedicated contextual modules
- Alerts must never imply expert accounting certainty.

---

## Permissions rules

- Permissions must be explicit, not implicit.
- Roles must be manageable per agency.
- The accountant must only access what the manager has shared or authorized.
- Keep a clear audit trail for:
  - comments
  - validations
  - exports
  - status changes
- Avoid hidden permission logic.

---

## Demo mode rules

- Demo mode is mandatory in the MVP.
- Demo mode must simulate:
  - agencies
  - revenues
  - expenses
  - supporting documents
  - VAT status
  - accounting periods
  - accountant interactions
  - alerts
- Demo mode must feel realistic and product-grade.
- Demo mode must be visually identified as demo data.
- Demo mode must not break the real workflows structure.

---

## Technical quality rules

- Use a clean, production-minded project structure.
- Use strict typing.
- Minimize duplication.
- Keep components composable.
- Prefer small reusable functions over large monolithic blocks.
- Handle empty states, loading states, and error states.
- Keep mock data organized and reusable.
- Avoid hardcoding business logic directly in UI markup.
- Do not create oversized files without reason.

---

## Product wording rules

- Use plain business language.
- Prefer:
  - “à vérifier”
  - “pièce manquante”
  - “prête à transmettre”
  - “TVA estimée”
  - “demande comptable”
- Avoid wording that suggests:
  - official accounting certification
  - tax authority-grade calculation
  - accountant replacement
- Always distinguish between:
  - estimated
  - extracted
  - validated
  - transmitted

---

## Expected implementation sequence

Build in this order:

1. app shell and navigation
2. design system foundations
3. demo data models
4. dashboard page
5. revenue module
6. expense and document module
7. VAT and period module
8. accountant workspace
9. settings
10. alerts and cross-module states
11. responsive refinements
12. cleanup and consistency pass

Do not jump randomly between modules unless necessary.

---

## Non-functional requirements

- Fast initial load for dashboard experience
- Smooth upload interactions
- Responsive layouts across desktop, tablet, mobile
- Secure role-aware access patterns
- Traceability of important actions
- Stable handling of demo data and future real data
- Simple future extension path for integrations

---

## Anti-patterns to avoid

- Do not build a clone of the Figma kit
- Do not build a generic admin dashboard with finance labels
- Do not build a fake accounting software
- Do not hide business rules inside UI components
- Do not build a dense interface that only a comptable can understand
- Do not let OCR values silently become truth
- Do not mix demo shortcuts with production architecture decisions
- Do not overbuild V1 with speculative V2/V3 features

---

## Definition of success for implementation

The implementation is successful if:
- a manager can understand the month quickly
- revenue, expenses, and documents are easy to manage
- VAT preparation feels understandable
- the accountant collaboration flow is credible
- the app feels premium and coherent with NXT Profiling
- the structure is clean enough to evolve without rework