# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

**Language/Version**: TypeScript 5.5+, Angular CLI 20.3.x  
**Primary Dependencies**: Angular 20 standalone components, RxJS 7, Angular Material 3, Tailwind CSS, OpenAPI-generated REST clients  
**Storage**: N/A (frontend SPA; consumes EV Rental REST APIs)  
**Testing**: Existing Karma + Jasmine suites via `pnpm test` when useful; otherwise manual/stakeholder validation per story  
**Target Platform**: Modern evergreen browsers (Chromium, Firefox, Safari) with responsive layouts for staff tablets and renter mobile  
**Project Type**: Angular standalone SPA with zoneless change detection  
**Performance Goals**: Largest Contentful Paint < 2.5s on mid-range mobile; interactive updates < 100ms after data arrival  
**Constraints**: Signals/computed only (no zone hacks), OnPush change detection, `NgOptimizedImage`, guard-protected lazy routes, `pnpm` workflows  
**Scale/Scope**: Renter, staff, and admin shells (~20+ feature routes) with shared `layout` navigation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- TypeScript Without Compromise: list newly introduced types/interfaces and confirm no `any` usage; describe runtime validation for incoming data.
- Signals-Driven Angular Architecture: explain signal/computed flows, lazy route boundaries, and OnPush change detection strategy.
- Accessibility Enables Adoption: define focus management, AXE verification, responsive behavior, and alt text updates per user story.
- Fit-for-Purpose Validation: describe validation evidence (manual QA scripts, analytics checks, optional automated suites) that will demonstrate acceptance criteria.
- Tooling Discipline & API Fidelity: document required `pnpm` commands, OpenAPI regeneration needs, and folder boundaries touched (`core-logic`, `features`, `lib`).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── app.config.ts
│   ├── app.routes.ts
│   ├── core-logic/
│   ├── features/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── customer/
│   │   ├── landing/
│   │   └── staff/
│   ├── layout/
│   └── lib/
│       ├── common-ui/
│       └── ngm-dev-blocks/
├── contract/
└── styles.scss
```

**Structure Decision**: Angular standalone SPA; place shared orchestrators in `src/app/core-logic/**`, feature UI under `src/app/features/**`, and reusable primitives in `src/app/lib/**` with lazy routes wired via `app.routes.ts`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
