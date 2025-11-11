# Implementation Plan: Staff Booking Fulfillment Workspace

**Branch**: `001-staff-booking-flow` | **Date**: 2025-11-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-staff-booking-flow/spec.md`

## Summary

Introduce a dedicated staff fulfillment route that guides agents through the mandated booking-to-rental workflow, orchestrates the ordered API sequence (`checkin → rental → contract → inspection → renter signature → staff signature → vehicle receive`), and surfaces progress, audit history, and retry handling without altering the existing dashboard surface.

## Technical Context

**Language/Version**: TypeScript 5.5+, Angular 20.3 zoneless standalone app  
**Primary Dependencies**: Angular router lazy routes, RxJS 7 signals interop, Angular Material 3 surface components, existing OpenAPI-generated `BookingService`/`RentalService`, internal `core-logic/bookings` orchestrators  
**Storage**: Client-only state via signals (no persistent storage)  
**Testing**: Manual QA flows per user story, analytics verification, optional targeted Karma specs if regression risk persists  
**Target Platform**: Chromium-based desktop and 10" class tablets used by staff; responsive views must support keyboard-only navigation  
**Performance Goals**: Fulfillment page renders actionable content within 100 ms after booking data arrives; API retries avoid blocking UI thread  
**Constraints**: Maintain strict typing (no `any`), rely on signals/computed plus OnPush components, guard new route with staff auth role, ensure sequential API enforcement, reuse OpenAPI clients  
**Scale/Scope**: Impacts staff bookings route, introduces new fulfillment feature module with nested components and stepper-like UI, touches `core-logic` for state synchronization  
**Risks/Unknowns**: Inspection media upload UI confirmed absent—new form required; analytics instrumentation will introduce a `staff_booking_fulfillment_*` namespace to satisfy SC-004; renter PII remains visible to staff, mirroring rental management precedent.

## Constitution Check

- **TypeScript Without Compromise**: Plan to define `FulfillmentStepState` and derived view models in `core-logic` with exhaustively typed discriminated unions; leverage generated DTOs for API payloads and add runtime guards for optional fields before rendering.
- **Signals-Driven Angular Architecture**: Introduce a fulfillment service exposing signals for booking snapshot, step progression, and optimistic updates; fulfillment page component consumes read-only signals, uses computed accessors, and is registered as a lazily loaded child route under `staff.routes.ts`.
- **Accessibility Enables Adoption**: Route will set document title, move focus to heading on navigation, expose each milestone via accessible checklist semantics, ensure buttons remain keyboard reachable, and run AXE scan across desktop and tablet breakpoints.
- **Fit-for-Purpose Validation**: Each user story maps to a manual QA script capturing screenshots, timestamps, and analytics evidence; signature double-call flow receives stakeholder walkthrough sign-off; lint suites run (`pnpm lint`, `pnpm lint-style`) prior to merge.
- **Tooling Discipline & API Fidelity**: Use `pnpm` commands exclusively, rely on existing OpenAPI services (`BookingService`, `RentalService`), extend `core-logic/bookings` or add `core-logic/rental-fulfillment` without bypassing code generation, and keep feature UI under `src/app/features/staff/booking-fulfillment`.

## Project Structure

### Documentation (this feature)

```text
specs/001-staff-booking-flow/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md               # Generated via /speckit.tasks later
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── core-logic/
│   │   ├── bookings/
│   │   └── rental-fulfillment/     # new orchestrator (proposed)
│   ├── features/
│   │   └── staff/
│   │       ├── staff-dashboard/
│   │       └── booking-fulfillment/ # new route + components
│   ├── layout/
│   └── lib/common-ui/
└── contract/
```

**Structure Decision**: Keep orchestration in `core-logic` (signal store, API coordination) while exposing dedicated UI components within `features/staff/booking-fulfillment`; augment `staff.routes.ts` with a child route pointing to the new fulfillment workspace guarded by staff role.

## Complexity Tracking

No constitution violations anticipated; table intentionally left empty.
