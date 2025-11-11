---
description: 'Task list template for feature implementation'
---

# Tasks: Staff Booking Fulfillment Workspace

**Input**: Design documents from `/specs/001-staff-booking-flow/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story so each increment can deploy, validate, and roll back independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Angular SPA: code under `src/app/**`; shared orchestrators in `src/app/core-logic/**`, feature UI in `src/app/features/**`, reusable primitives in `src/app/lib/**`.
- Generated OpenAPI clients live in `src/contract/**`; modify only after running `pnpm generate-openapi`.
- Validation artifacts (manual scripts, docs, or optional specs) should live alongside the touched feature (`src/app/features/...`) or supporting `core-logic` service notes.
- Use `pnpm` scripts (`pnpm lint`, `pnpm lint:fix`, `pnpm lint-style`, optional `pnpm test`) for quality gates—never run `ng` or `npm` equivalents directly.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the workspace and shared documentation before adding fulfillment code paths.

- [x] T001 Run `pnpm install` in workspace root ./ to sync dependencies before feature work
- [x] T002 Run `pnpm lint` and `pnpm lint-style` in workspace root ./ to capture baseline diagnostics
- [x] T003 Create feature architecture README describing planned folders at `src/app/features/staff/booking-fulfillment/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish fulfillment domain types and signal stores required by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Define fulfillment domain types (steps, artifacts, timeline, errors) in `src/app/core-logic/rental-fulfillment/fulfillment.types.ts`
- [x] T005 Implement signal-backed `FulfillmentStateStore` managing ordered milestones in `src/app/core-logic/rental-fulfillment/fulfillment.state.ts`
- [x] T006 Implement `FulfillmentOrchestrator` coordinating generated API clients in `src/app/core-logic/rental-fulfillment/fulfillment.service.ts`
- [x] T007 Export rental-fulfillment APIs through `src/app/core-logic/rental-fulfillment/index.ts`
- [x] T008 Extend booking aggregation with a single-record loader and timeline merge in `src/app/core-logic/bookings/bookings.service.ts`
      **Checkpoint**: Foundation ready—user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Booking Fulfillment Entry (Priority: P1) 🎯 MVP

**Goal**: Give staff a dedicated fulfillment route that loads booking context and enables mandatory check-in.

**Independent Validation**: Manual walkthrough on desktop verifying navigation and check-in for the new route.

### Validation for User Story 1 ⚠️

- [x] T010 [P] [US1] Outline manual QA checkpoints for fulfillment entry at `specs/001-staff-booking-flow/checklists/us1-booking-entry.md`

### Implementation for User Story 1

- [x] T012 [US1] Add booking fulfillment lazy route with staff guard and bookingId param at `src/app/features/staff/booking-fulfillment/booking-fulfillment.routes.ts`
- [x] T013 [US1] Scaffold `FulfillmentPage` component (signals, OnPush, providers) at `src/app/features/staff/booking-fulfillment/pages/fulfillment-page/fulfillment-page.ts|.html|.scss`
- [x] T014 [US1] Render booking summary and sequential checklist UI using fulfillment state signals in `src/app/features/staff/booking-fulfillment/pages/fulfillment-page/fulfillment-page.html`
- [x] T015 [US1] Wire check-in CTA to `FulfillmentOrchestrator.checkInBooking` with optimistic updates in `src/app/features/staff/booking-fulfillment/pages/fulfillment-page/fulfillment-page.ts`
- [x] T016 [US1] Add "Tiếp tục xử lý" CTA in staff booking details overlay to navigate to fulfillment route in `src/app/features/staff/staff-dashboard/staff-dashboard.html` and `src/app/features/staff/staff-dashboard/staff-dashboard.ts`
- [x] T017 [US1] Set document title for fulfillment entry in `src/app/features/staff/booking-fulfillment/pages/fulfillment-page/fulfillment-page.ts`
      **Checkpoint**: User Story 1 is fully functional and independently testable

## Phase 4: User Story 2 - Prepare Rental Package (Priority: P2)

**Goal**: Allow staff to create the rental, generate the contract, and capture the inspection while enforcing sequential dependencies.

**Independent Validation**: Manual QA script covering rental/contract/inspection steps.

### Validation for User Story 2 ⚠️

- [ ] T019 [P] [US2] Document manual QA scenarios for rental package flow at `specs/001-staff-booking-flow/checklists/us2-rental-package.md`

### Implementation for User Story 2

- [ ] T021 [US2] Extend `FulfillmentOrchestrator` with rental and contract creation flows plus error handling in `src/app/core-logic/rental-fulfillment/fulfillment.service.ts`
- [ ] T022 [P] [US2] Build inspection reactive form component meeting research requirements at `src/app/features/staff/booking-fulfillment/components/inspection-form/inspection-form.ts|.html|.scss`
- [ ] T023 [US2] Integrate rental, contract, and inspection steps with gating logic in `src/app/features/staff/booking-fulfillment/pages/fulfillment-page/fulfillment-page.html`
- [ ] T024 [US2] Surface returned `rentalId`, `contractId`, and inspection reference in summary/timeline signals in `src/app/features/staff/booking-fulfillment/pages/fulfillment-page/fulfillment-page.ts`
      **Checkpoint**: User Stories 1 and 2 operate independently with validated evidence

---

## Phase 5: User Story 3 - Finalize Contract and Vehicle Handover (Priority: P3)

**Goal**: Capture renter/staff signatures and confirm vehicle receipt so rentals transition to In Progress with full audit trail.

**Independent Validation**: Stakeholder ride-along script, dual signature verification logs, and confirmation UI review.

### Validation for User Story 3 ⚠️

- [ ] T026 [P] [US3] Draft manual QA script for signature + vehicle receive flow at `specs/001-staff-booking-flow/checklists/us3-finalization.md`

### Implementation for User Story 3

- [ ] T028 [US3] Add renter/staff signature and vehicle receive orchestration with retry support in `src/app/core-logic/rental-fulfillment/fulfillment.service.ts`
- [ ] T029 [P] [US3] Create signature step component handling dual submissions at `src/app/features/staff/booking-fulfillment/components/signature-step/signature-step.ts|.html|.scss`
- [ ] T030 [US3] Integrate signature gating and completion feedback in `src/app/features/staff/booking-fulfillment/pages/fulfillment-page/fulfillment-page.html`
- [ ] T031 [US3] Render vehicle receipt confirmation with staff metadata in `src/app/features/staff/booking-fulfillment/pages/fulfillment-page/fulfillment-page.ts`
- [ ] T032 [US3] Reconcile backend-completed steps into the UI timeline and badges in `src/app/features/staff/booking-fulfillment/pages/fulfillment-page/fulfillment-page.ts`

**Checkpoint**: All fulfillment milestones complete with signatures and vehicle handover recorded

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Consolidate documentation, performance benchmarks, and release checks spanning all stories.

- [ ] T033 [P] Update `specs/001-staff-booking-flow/quickstart.md` with links to recorded QA evidence
- [ ] T034 [P] Document render timing/profiling results (<100 ms target) in `src/app/features/staff/booking-fulfillment/README.md`
- [ ] T035 Run `pnpm lint`, `pnpm lint-style`, and `pnpm build` in workspace root ./ before handoff

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies—must complete before foundational scaffolding.
- **Foundational (Phase 2)**: Depends on Setup; blocks every user story until fulfillment types, store, and orchestrator exist.
- **User Stories (Phases 3–5)**: Each depends on Foundational completion. Implement in priority order (P1 → P2 → P3) unless team members tackle separate stories after ensuring shared signals are stable.
- **Polish (Final Phase)**: Runs after desired user stories ship; wraps quality gates and documentation.

### User Story Dependencies

- **US1**: Requires Tasks T004–T009; unlocks fulfillment routing and booking check-in.
- **US2**: Requires US1 state structure plus Tasks T021/T022 contract; introduces rental + inspection steps while remaining independently deployable.
- **US3**: Builds atop artifacts from US2 but can start once orchestrator exposes rental identifiers; centers on signatures and vehicle handover.

### Within Each User Story

- Draft validation plan before implementation; execute evidence tasks once UI/services are wired.
- Update `FulfillmentOrchestrator` and signal store before layering UI components that consume them.
- Preserve sequential API enforcement—never enable a step before its prerequisites reach `fulfilled` state.
- Capture outcome notes so QA can confirm expected behavior.

---

## Parallel Execution Examples

### User Story 1

```bash
# Documentation vs. implementation can proceed independently:
Task T010 [P] prepares manual QA checkpoints
Task T012 scaffolds booking-fulfillment routing in `booking-fulfillment.routes.ts`
Task T016 updates `staff-dashboard.html` to expose the CTA
```

### User Story 2

```bash
# Split work across service and UI tracks:
Task T021 hardens `fulfillment.service.ts` for rental/contract APIs
Task T022 [P] builds the inspection reactive form component
Task T024 surfaces returned identifiers for timeline signals
```

### User Story 3

```bash
# Parallelize signature UX and orchestration:
Task T028 upgrades orchestration for signatures & vehicle receive
Task T029 [P] implements the signature-step component UI
Task T031 finalizes vehicle receipt confirmation messaging
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Finish Setup and Foundational phases (Tasks T001–T009).
2. Deliver US1 (Tasks T010–T018) to unlock the fulfillment route and booking check-in.
3. Execute US1 validation plan and share validation evidence before expanding scope.

### Incremental Delivery

1. Ship MVP (US1) with validated navigation and check-in.
2. Layer US2 to enable rental package creation while maintaining independent deployability and validation.
3. Complete US3 to collect signatures and confirm handover, ensuring telemetry stays green.
4. Close with Polish tasks (T033–T035) before release.

### Parallel Team Strategy

- After Foundational tasks land, assign separate developers to US1, US2, and US3 using [P] tasks (T010, T022, T029) to avoid file contention.
- Sync on shared orchestrator interfaces to keep service/UX workstreams aligned.
- Merge frequently and rerun lint/build gates to keep zoneless change detection stable.

---

## Notes

- [P] tasks touch isolated files or documentation and can run alongside other workstreams.
- Every user story logs manual QA evidence in `specs/001-staff-booking-flow/checklists/*`.
- Signals must update via `.set()`/`.update()` only; avoid mutation to respect zoneless change detection.
- Commit after each task or logical bundle so rollbacks stay targeted.
