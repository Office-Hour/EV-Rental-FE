---
description: 'Task list template for feature implementation'
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Validation**: Every story MUST include tasks for acceptance validation (manual QA scripts, stakeholder walkthroughs, analytics capture) plus accessibility checks (AXE, focus management). Automated tests are optional and should be added only when they reduce risk.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Angular SPA: code under `src/app/**`; shared orchestrators in `src/app/core-logic/**`, feature UI in `src/app/features/**`, reusable primitives in `src/app/lib/**`.
- Generated OpenAPI clients live in `src/contract/**`; modify only after running `pnpm generate-openapi`.
- Validation artifacts (manual scripts, docs, or optional specs) should live alongside the touched feature (`src/app/features/...`) or supporting `core-logic` service notes.
- Use `pnpm` scripts (`pnpm lint`, `pnpm lint:fix`, `pnpm lint-style`, optional `pnpm test`) for quality gates—never run `ng` or `npm` equivalents directly.

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align feature scaffolding with EV-Rental FE architecture

- [ ] T001 Document feature entry route in `src/app/app.routes.ts` (lazy + guards) and verify folder placement under `src/app/features`
- [ ] T002 Update plan/spec to include Constitution Check sign-off and gather OpenAPI prerequisites (if contracts change)
- [ ] T003 [P] Run baseline `pnpm lint`, `pnpm lint-style`, and any existing `pnpm test` suites (if applicable) to capture current state before development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ensure supporting services, signals, and contracts exist before feature stories begin

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Provision or extend `core-logic` services with required signals/computed state and defensive copies
- [ ] T005 [P] Regenerate OpenAPI clients (`pnpm generate-openapi`) if backend models change; document DTO deltas
- [ ] T006 [P] Configure focus management utilities, accessibility helpers, or shared UI primitives in `src/app/lib/common-ui`
- [ ] T007 Validate authentication/authorization dependencies and update guards or `AuthService.redirectUser()` logic if new roles impact routing
- [ ] T008 Ensure feature-specific environment toggles or configuration signals exist (avoid global mutable state)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Validation**: [Document acceptance evidence (manual QA script, stakeholder walkthrough, analytics snapshot, optional automated suite) and AXE/focus checks proving this story ships independently]

### Validation for User Story 1 ⚠️

> **NOTE: Define validation steps BEFORE implementation and capture results after development**

- [ ] T010 [P] [US1] Draft manual QA script or stakeholder walkthrough documenting expected behavior and data states
- [ ] T011 [P] [US1] Execute accessibility validation (AXE scan, keyboard navigation, focus management notes)
- [ ] T012 [P] [US1] (Optional) Add or update automated suite (`*.spec.ts`, integration) if regression risk warrants; document rationale if skipped

### Implementation for User Story 1

- [ ] T013 [P] [US1] Define or extend signal-backed state in `src/app/core-logic/...`
- [ ] T014 [P] [US1] Implement feature component/template in `src/app/features/...`
- [ ] T015 [US1] Wire lazy route and guards; update navigation/layout if needed
- [ ] T016 [US1] Implement focus management and accessibility semantics
- [ ] T017 [US1] Validate against design tokens and responsive breakpoints using DeviceService signals
- [ ] T018 [US1] Ensure logging/telemetry aligns with existing observability conventions (if applicable)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Validation**: [Document acceptance evidence verifying this story can deploy independently, including accessibility checks]

### Validation for User Story 2 ⚠️

- [ ] T019 [P] [US2] Draft manual QA/analytics validation for new behavior (data states, edge cases)
- [ ] T020 [P] [US2] Perform accessibility verification (AXE, keyboard, screen reader notes)
- [ ] T021 [P] [US2] (Optional) Update automated checks if scope justifies; note reasoning when omitted

### Implementation for User Story 2

- [ ] T022 [P] [US2] Update `core-logic` signals or services for shared state
- [ ] T023 [US2] Implement feature components/templates with OnPush + `@for`/`@if`
- [ ] T024 [US2] Add responsive tweaks, focus handling, and voiceover testing if new navigation introduced
- [ ] T025 [US2] Verify cross-story integration while preserving independent deployability

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Validation**: [Outline validation activities and accessibility audits ensuring this story stands alone]

### Validation for User Story 3 ⚠️

- [ ] T026 [P] [US3] Capture manual/stakeholder validation steps for new behavior
- [ ] T027 [P] [US3] Review analytics or logs (if relevant) to confirm outcomes; update documentation accordingly
- [ ] T028 [P] [US3] Perform accessibility validation (AXE + keyboard/reader walkthrough)
- [ ] T029 [P] [US3] (Optional) Extend automated suites; justify if omitted

### Implementation for User Story 3

- [ ] T030 [P] [US3] Update shared signals/services in `core-logic`
- [ ] T031 [US3] Implement UI changes following signal-driven architecture
- [ ] T032 [US3] Confirm responsive/layout adjustments and guard alignment
- [ ] T033 [US3] Document telemetry/logging implications if scope warrants

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Update feature docs/specs with final behavior and Constitution Check evidence
- [ ] TXXX Tighten accessibility audit evidence (screenshots, tooling output)
- [ ] TXXX Performance verification (profiling signals/render timings)
- [ ] TXXX [P] Optional automated test additions if regression risk remains
- [ ] TXXX Security review of auth flows/tokens touched
- [ ] TXXX Run quickstart.md validation and ensure `pnpm build` succeeds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Validation plans MUST be defined before implementation; capture evidence after development
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Manual validation prep can occur in parallel with implementation, but execution happens after feature readiness
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Execute validation plan for User Story 1:
Task: "Manual QA script walkthrough for [scenario]"
Task: "Accessibility sweep (AXE + keyboard navigation)"
Task: "(Optional) Run existing automated suite via pnpm test --filter ..."

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/app/core-logic/[entity1].ts"
Task: "Create [Entity2] model in src/app/core-logic/[entity2].ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Execute User Story 1 validation plan independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Validate independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Validate independently → Deploy/Demo
4. Add User Story 3 → Validate independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and validated
- Confirm validation plan before implementing
- Document AXE/accessibility verification alongside validation evidence (manual and optional automated)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
