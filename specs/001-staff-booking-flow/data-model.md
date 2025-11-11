# Data Model: Staff Booking Fulfillment Workspace

## Entities

### 1. BookingFulfillmentSummary

- **Purpose**: Present read-only context so staff verify they are working on the correct booking before progressing.
- **Fields**:
  - `bookingId: string` — primary identifier.
  - `status: BookingStatus` — current booking status (enum from OpenAPI contract).
  - `verificationStatus: BookingVerificationStatus` — verification state, used to gate check-in.
  - `renterProfile: RenterProfileDto` — renter identity, address, and risk information.
  - `vehicleDetails: VehicleDetailsDto` — make/model, deposit, pricing, station origin.
  - `rental: RentalDetailsDto | null` — existing rental record if backend already progressed the booking.
  - `timeline: ReadonlyArray<FulfillmentTimelineEvent>` — ordered history of completed steps with timestamps and actor metadata.
- **Relationships**: Aggregates DTOs sourced via `BookingsService` and `RentalsService`. Timeline entries derive from `FulfillmentStepState` history.

### 2. FulfillmentStepState

- **Purpose**: Track UI status for each mandated milestone, enabling resume-after-refresh and sequential enforcement.
- **Shape**:
  - `step: FulfillmentStepId` — discriminated union identifier (`checkin`, `create-rental`, `create-contract`, `inspection`, `sign-renter`, `sign-staff`, `vehicle-receive`).
  - `status: 'pending' | 'in-progress' | 'fulfilled' | 'error'` — UI state.
  - `startedAt?: string` — ISO timestamp when user initiated the action.
  - `completedAt?: string` — ISO timestamp saved on success.
  - `error?: FulfillmentError` — optional failure payload.
  - `artifact?: FulfillmentArtifact` — holds returned identifiers (`rentalId`, `contractId`, inspection reference, signature hash).
  - `requires?: FulfillmentStepId[]` — prerequisite steps; default is previous milestone.
- **Transitions**:
  1. `pending → in-progress` when user triggers the action.
  2. `in-progress → fulfilled` after successful API call.
  3. `in-progress → error` on failure; user may retry shifting back to `in-progress`.
- **Validation Rules**:
  - A step cannot enter `in-progress` unless all `requires` are `fulfilled`.
  - `artifact` must include the expected identifiers per step: e.g., `create-rental` requires `artifact.rentalId`.

### 3. FulfillmentArtifact

- **Purpose**: Persist backend identifiers per step for subsequent payloads.
- **Fields**:
  - `rentalId?: string` — produced by rental creation.
  - `contractId?: string` — produced by contract creation.
  - `inspectionId?: string` — produced by inspection upload.
  - `renterSignatureId?: string` — identifier/hash returned when renter signs.
  - `staffSignatureId?: string` — identifier/hash returned when staff signs.
  - `vehicleReceipt?: { receivedAt: string; receivedByStaffId: string }` — details of vehicle handover.

### 4. FulfillmentError

- **Purpose**: Capture retry details and display actionable messages.
- **Fields**:
  - `message: string` — human-readable summary for toast/banner.
  - `code?: string` — backend-specific code for diagnostics.
  - `detail?: unknown` — raw response/logging payload (not surfaced to end user).

### 5. FulfillmentTimelineEvent

- **Purpose**: Provide chronological audit record for staff and QA review.
- **Fields**:
  - `step: FulfillmentStepId`
  - `title: string` — localized label.
  - `description?: string`
  - `actor: 'staff' | 'renter' | 'system'`
  - `occurredAt: string`
  - `metadata?: Record<string, string>` — contextual values (IDs, battery level, URLs).

## Enumerations

- `FulfillmentStepId = 'checkin' | 'create-rental' | 'create-contract' | 'inspection' | 'sign-renter' | 'sign-staff' | 'vehicle-receive'`

## Derived/Computed State

- `isReadyFor(stepId)`: computed boolean verifying all prerequisites fulfilled.
- `nextStep`: first `FulfillmentStepState` with `status !== 'fulfilled'` to guide CTA state.
- `completionPercentage`: ratio of fulfilled steps over total, surfaced in progress indicator.

## External Dependencies

- DTOs imported from `src/contract/model/**` (BookingDetailsDto, CreateRentalRequest, etc.).
- `BookingsService` and `RentalsService` provide initial data and may update state when backend changes are detected.

## Notes

- All timestamps stored as ISO strings in UTC to simplify comparison.
- Arrays exposed via signals must return defensive copies to avoid downstream mutation.
