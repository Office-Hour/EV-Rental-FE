<!--
Sync Impact Report
Version change: 1.0.0 -> 2.0.0
Modified principles: Renamed IV. Test-Gated Delivery -> IV. Fit-for-Purpose Validation
Added sections: None
Removed sections: None
Templates requiring updates:
	✅ .specify/templates/plan-template.md
	✅ .specify/templates/spec-template.md
	✅ .specify/templates/tasks-template.md
Follow-up TODOs: None
-->

# EV-Rental FE Constitution

## Core Principles

### I. TypeScript Without Compromise

- All production and test code MUST compile under `strict` TypeScript with zero `any` or implicit `any`; use `unknown` only when bridging external APIs and narrow immediately.
- Prefer shared interfaces and generics to duplicate DTOs; expose domain contracts from `src/app/core-logic/**` or generated OpenAPI models so features never guess shapes.
- Surface runtime validation at API boundaries so templates render only typed, pre-sanitized data.

Maintaining a trustworthy type system keeps renter and staff flows reliable while enabling safe refactors in Angular 20.

### II. Signals-Driven Angular Architecture

- Every component MUST rely on signals/computed values or Observables bridged via `toSignal`; avoid zone-patching and mutation patterns.
- Components default to `ChangeDetectionStrategy.OnPush`; configure inputs and outputs with `input()`/`output()` helpers and host bindings through the `host` object.
- Feature state lives in dedicated services under `core-logic/**`; UI layers under `features/**` consume read-only signals and never mutate shared arrays in place.

Signals-first design keeps the zoneless runtime predictable and prevents UI regressions as the app scales.

### III. Accessibility Enables Adoption

- All interactive UI MUST pass AXE audits, retain focus management, and provide semantic labels; dialogs and drawers manage focus entry and restoration.
- Layouts MUST remain responsive across `DeviceService` breakpoints and degrade gracefully without pointer or high-precision input.
- Imagery uses `NgOptimizedImage` with explicit width, height, and meaningful alt text; never signal status by color alone.

Accessible experiences ensure renters and staff can complete critical tasks under varied conditions.

### IV. Fit-for-Purpose Validation

- Every user story MUST define demonstrable acceptance evidence (manual QA script, stakeholder walkthrough, analytics capture) that traces back to specification criteria.
- Automated tests MAY be added when they reduce regression risk, but they are optional. When omitted, document the rationale and relied-upon validation method.
- Pull requests MUST pass lint (`pnpm lint`/`pnpm lint:fix`) and style (`pnpm lint-style`) suites and include validation notes summarizing how acceptance evidence was exercised.

Iterating with deliberate validation keeps renter and staff flows dependable while avoiding unnecessary unit-test scaffolding.

### V. Tooling Discipline & API Fidelity

- Use `pnpm` for all scripts; never bypass project tooling with `npm` or `yarn` or ad-hoc build commands.
- Regenerate OpenAPI clients via `pnpm generate-openapi` before touching `src/contract/**`; wrap complex sequences in `core-logic` services and avoid bespoke HTTP calls.
- Preserve folder boundaries (`core-logic`, `features`, `layout`, `lib/common-ui`, `lib/ngm-dev-blocks`) and keep feature routes lazily loaded with role guards.

Guarding the toolchain ensures front-end behavior stays aligned with backend contracts and keeps releases reproducible.

## Engineering Constraints & Toolchain

- Framework: Angular 20 standalone application bootstrapped in `src/main.ts` with zoneless change detection configured through `app/app.config.ts`.
- Dependency management: `pnpm` only; run `pnpm install`, `pnpm start`, `pnpm build`, `pnpm lint`, `pnpm lint:fix`, and `pnpm lint-style` as the canonical workflows.
- Domain orchestration: place API coordination and caching logic in `src/app/core-logic/**` services; expose read-only signals and return defensive copies of arrays.
- Contract usage: consume generated clients under `src/contract/**`; regenerate with `pnpm generate-openapi` before editing and document any backend contract prerequisites.
- Assets and styling: reference static assets from `public/**` with root-relative URLs, load imagery through `NgOptimizedImage`, and scope feature styles locally.
- Authentication: extend `AuthService`, `TokenService`, `AuthGuard`, and `NoAuthGuard` patterns when adjusting renter or staff flows; let `AuthService.redirectUser()` enforce role routing.

## Delivery Workflow & Quality Gates

- Feature delivery begins with `/speckit.spec` and `/speckit.plan`; each generated plan MUST satisfy the Constitution Check by referencing every core principle explicitly.
- User stories are independent slices (renter, staff, admin) and include accessibility, performance, and validation acceptance criteria; reference `DeviceService` breakpoints when responsive behavior matters.
- Task breakdowns produced via `/speckit.tasks` map directly to user stories, flag parallelizable work, and account for the validation artifacts committed in the spec.
- Before merge, run `pnpm lint`, `pnpm lint-style`, and execute the documented validation script (manual or automated). Run `pnpm test` when suites exist, but adding new unit tests is optional.
- Releases or significant feature toggles MUST confirm that `core-logic` services keep compatibility with generated OpenAPI DTOs and that stored tokens retain expected lifecycles.

## Governance

- Precedence: This constitution supersedes prior front-end conventions for EV-Rental FE. All pull requests must include a checklist item confirming adherence to each core principle.
- Amendments: Propose changes through a pull request referencing this file. Approval from both the front-end technical lead and the product/stakeholder representative is required, alongside a migration or rollout note when behavior changes.
- Versioning: Use semantic versioning. Bump MAJOR for removals or redefinitions of principles, MINOR for new principles/sections or material expansion, and PATCH for clarifications or typo fixes.
- Compliance reviews: Reviewers verify Constitution Check items during planning and code review, ensure lint suites run clean, and confirm accessibility plus validation evidence. Conduct at least a quarterly governance review or after any production incident touching renter/staff-critical flows.

**Version**: 2.0.0 | **Ratified**: 2025-11-12 | **Last Amended**: 2025-11-12
