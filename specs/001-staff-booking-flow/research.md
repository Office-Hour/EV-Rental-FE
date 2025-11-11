# Research Notes: Staff Booking Fulfillment Workspace

## Decision 1: Inspection form implementation

- **Decision**: Build a dedicated inspection form component within the fulfillment route that leverages existing reactive-form utilities but does not attempt to reuse prior UI (none exists today).
- **Rationale**: Repository search across `features/**` found no prior inspection UI or reusable media upload pattern; implementing the form inline ensures requirements (battery capacity, timestamp, staff ID, media URL) are satisfied without blocking on missing shared assets.
- **Alternatives considered**:
  - _Reuse rental-management details view_: rejected because it only displays read-only inspection metadata and offers no form scaffolding.
  - _Introduce shared inspection library component up front_: deferred until a second consumer emerges to avoid premature abstraction.

## Decision 2: Analytics instrumentation approach

- **Decision**: Define new analytics events under a `staff_booking_fulfillment_*` namespace (e.g., `staff_booking_fulfillment_step_completed`, `staff_booking_fulfillment_error`) and emit them through the existing logging/telemetry mechanism selected during implementation (UX agreed to accept localized event names documented in quickstart).
- **Rationale**: The codebase currently lacks a unified analytics service; establishing a consistent naming convention for this feature enables later consolidation without conflicting legacy events.
- **Alternatives considered**:
  - _Adopt a global analytics helper_: unavailable in the repo; creating one now would exceed this feature's scope.
  - _Skip analytics events_: rejected because success criteria SC-004 requires measuring completion rates per fulfillment session.

## Decision 3: Display of renter PII during fulfillment

- **Decision**: Surface renter profile details (name, address, license number) consistent with the existing staff rental management view while ensuring the UI clearly indicates sensitive data and respects authenticated staff-only access.
- **Rationale**: `features/staff/rental-management` already exposes this information to staff, demonstrating that current policy allows full visibility when processing rentals; matching this precedent avoids inconsistent staff experiences.
- **Alternatives considered**:
  - _Mask PII by default_: dismissed because staff rely on these fields to verify identity before vehicle handover.
  - _Require additional consent gating_: unnecessary given existing staff workflows and would introduce friction absent in other screens.
