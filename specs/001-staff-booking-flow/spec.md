# Feature Specification: Staff Booking Fulfillment Workspace

**Feature Branch**: `001-staff-booking-flow`  
**Created**: 2025-11-12  
**Status**: Draft  
**Input**: User description: "ở http://localhost:4200/staff/bookings , sau khi bấm vào một details-panel xuất hiện một nút để routing qua một trang booking detail để tiếp tục cho luồng bên dưới. những luồng này phải ở một route khác chứ không phải staff-dashboard.ts. ĐÂY LÀ THỨ TỰ GỌI API BẠN BẮT BUỘC PHẢI GỌI THEO 1. /booking/POST/api/Booking/checkin 2. /rental/POST/api/Rental ---> return (rentalId) 3. /rental/POST/api/Rental/contract ---> (contractId) 4. /rental/POST/api/Rental/inspection 5. /rental/POST/api/Rental/contract/sign -- BẮT BUỘC PHẢI ĐỦ 2 LẦN KÍ TỪ 2 PHÍA RENTER VÀ STAFF - TỨC PHẢI GỌI API NÀY 2 LẦN 6. /rental/POST/api/Rental/vehicle/receive. lấy thêm context dựa vào #REQUIREMENT.md"

## User Scenarios & Validation _(mandatory)_

### User Story 1 - Booking Fulfillment Entry (Priority: P1)

A staff agent handling a fully paid booking opens the record in the bookings list, sees a "Tiếp tục xử lý" call-to-action inside the details panel, and follows it to a dedicated booking fulfillment route that summarises the booking, highlights pending steps, and enables the booking check-in.

**Why this priority**: Without a dedicated entry point and check-in capability, staff cannot progress bookings that are waiting for manual confirmation, blocking downstream rental creation and revenue recognition.

**Independent Validation**: Manual walkthrough on desktop breakpoints verifying navigation and confirmation messaging for the check-in request.

**Acceptance Scenarios**:

1. **Given** a booking that is deposit-paid and awaiting staff approval, **When** the agent opens the details panel and activates the fulfillment button, **Then** the UI navigates to `staff/bookings/{bookingId}/fulfillment`, spotlights the page heading, and displays booking summary information and a checklist of remaining steps with only "Check in booking" enabled.
2. **Given** the fulfillment page for an eligible booking, **When** the agent confirms the check-in step, **Then** the system sends `/booking/POST/api/Booking/checkin` with the booking identifier and status `Approved`, shows a success banner, records the completion timestamp, and unlocks the "Create rental" step.
3. **Given** the fulfillment page for a booking that is already marked as approved in the backend, **When** the page loads, **Then** the check-in step is marked complete with backend metadata and subsequent steps are available without requiring the agent to re-trigger the API.

---

### User Story 2 - Prepare Rental Package (Priority: P2)

After confirming the booking, the staff agent uses the fulfillment route to create the rental, generate the contract, and capture the pre-handover inspection so the renter has an official agreement tied to a specific vehicle.

**Why this priority**: Rental creation and documentation are the core deliverables of the hand-off process; without them, the renter cannot legally or operationally receive the vehicle.

**Independent Validation**: Manual QA script covering the sequential buttons, mock API responses verifying the returned `rentalId`, `contractId`, and inspection identifiers, and confirming all form interactions.

**Acceptance Scenarios**:

1. **Given** the check-in step is complete, **When** the agent triggers "Create rental", **Then** the UI sends `/rental/POST/api/Rental` with the booking identifier, captures the returned `rentalId`, reflects the rental status on the summary, and enables "Create contract" only after success.
2. **Given** a rental exists in the flow, **When** the agent initiates "Create contract", **Then** `/rental/POST/api/Rental/contract` is called with the `rentalId` and selected e-sign provider, the returned `contractId` is stored, and the UI confirms the association before enabling the inspection form.
3. **Given** a contract has been generated, **When** the agent completes the inspection form with battery level, timestamp, inspector identity, and media URL, **Then** `/rental/POST/api/Rental/inspection` is invoked, the resulting inspection reference is logged, and the booking timeline displays a confirmation that supports replay by QA and stakeholders.

---

### User Story 3 - Finalize Contract and Vehicle Handover (Priority: P3)

With the rental package in place, the staff agent secures both renter and staff signatures and confirms vehicle receipt so the rental transitions to "in progress" and downstream invoices can start.

**Why this priority**: Dual signatures and handover confirmation are regulatory and operational checkpoints; completing them ensures both parties acknowledge the contract and the fleet inventory updates in real time.

**Independent Validation**: Stakeholder ride-along verifying digital signature capture flows, QA evidence that two distinct signature records are created per booking, and confirmation UI review for vehicle handover timestamps.

**Acceptance Scenarios**:

1. **Given** a contract identifier exists, **When** the agent uploads or records the renter signature, **Then** `/rental/POST/api/Rental/contract/sign` is called with role `Renter`, `SignatureEvent.Pickup`, and the captured metadata, the UI marks the renter signature step complete, and the staff signature step remains pending.
2. **Given** the renter signature is recorded, **When** the agent records the staff signature, **Then** `/rental/POST/api/Rental/contract/sign` is called a second time with role `Staff`, the UI requires distinct files or acknowledgements, and both signature cards display signed timestamps before enabling the final confirmation.
3. **Given** both signatures are marked complete, **When** the agent confirms vehicle receipt, **Then** `/rental/POST/api/Rental/vehicle/receive` is sent with the rental identifier and staff handover details, the rental status updates to "In Progress" within the summary, and the fulfillment checklist shows all items completed with clear success messaging.

### Edge Cases

- Booking is opened in fulfillment view after another colleague already advanced certain steps; the UI must reconcile backend state and mark completed steps automatically without duplicating API calls.
- Any API call in the sequence fails (network, validation, or backend rejection); the UI must show an actionable error, keep previous steps intact, and allow a retry once the issue is resolved.
- Staff attempts to skip ahead (e.g., trying to upload a signature before a contract exists); the interface must provide clear guidance and keep later actions disabled until prerequisites are met.
- Inspection evidence or signature files exceed allowed size or fail security checks; the form must surface validation feedback without losing previously entered data.
- Session expires or staff identity cannot be confirmed mid-flow; the user is redirected to re-authenticate and sees a message explaining that no irreversible actions occurred.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Provide a dedicated fulfillment route (`/staff/fulfillment/{bookingId}`) available only from the staff bookings workspace for bookings that are deposit-paid and awaiting manual processing; the existing dashboard component must remain unchanged.
- **FR-002**: Display booking, renter, vehicle, and rental summaries on the fulfillment route using read-only data from existing staff booking sources so agents can confirm they are working on the correct record.
- **FR-003**: Present the six required milestones as a sequential checklist that enforces the order `check-in → create rental → create contract → upload inspection → capture renter signature → capture staff signature → confirm vehicle receipt`, unlocking each item only when its predecessors succeed.
- **FR-004**: When the agent confirms booking check-in, call `/booking/POST/api/Booking/checkin` with `bookingId` and `BookingStatus.Approved`, persist completion metadata, and prevent duplicate submissions while awaiting the response.
- **FR-005**: After check-in, invoke `/rental/POST/api/Rental` with the booking identifier, store the returned `rentalId`, surface confirmation messaging, and block subsequent steps if the call fails or returns an unexpected payload.
- **FR-006**: Require a contract before inspection by calling `/rental/POST/api/Rental/contract` with the new `rentalId` and the selected e-sign provider, capture the `contractId`, and display an audit trail entry.
- **FR-007**: Collect inspection inputs (battery capacity, inspection timestamp, inspector identifier, media URL) and submit them via `/rental/POST/api/Rental/inspection`, presenting the inspection reference and allowing edits until signatures begin.
- **FR-008**: Capture two distinct `/rental/POST/api/Rental/contract/sign` submissions—one with role `Renter`, one with role `Staff`—and require both to succeed before enabling `/rental/POST/api/Rental/vehicle/receive`.
- **FR-009**: Upon vehicle receipt confirmation, call `/rental/POST/api/Rental/vehicle/receive` with the rental identifier, received timestamp, and staff identifier, and update the booking overview to show the rental as "In Progress".
- **FR-010**: Provide persistent status indicators, error handling, and audit notes so staff, QA, and stakeholders can review which steps succeeded, failed, or were skipped due to backend state reconciliation.

### Key Entities _(include if feature involves data)_

- **Booking Fulfillment Summary**: Aggregates booking, renter, vehicle, and rental snapshots surfaced to staff so they can verify contextual details before each action.
- **Fulfillment Step State**: Tracks the current status, timestamps, and backend identifiers (e.g., `rentalId`, `contractId`, inspection reference) for each milestone, supporting resume-after-refresh.
- **Signature Record**: Represents each signing event with role, document details, evidence URL, and audit metadata, ensuring both renter and staff signatures are accounted for prior to vehicle handover.

## Assumptions

- Only bookings that are fully paid and not cancelled will expose the fulfillment entry point; others continue to use the existing dashboard experience.
- Staff identity, including `staffId`, is already available through the authenticated session and can be attached to inspection and vehicle receipt payloads without additional prompts.
- Signature capture leverages existing digital or uploaded ink signature assets that can be converted to a document URL before invoking the signing endpoint.
- Media for inspections (photos, videos) are hosted on an approved storage provider that returns a URL compatible with the backend contract.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: During user acceptance testing, 95% of eligible bookings are advanced from "Approved" to "In Progress" within 10 minutes of an agent opening the fulfillment route, demonstrating that the flow removes bottlenecks.
- **SC-003**: QA regression logs confirm that the checklist never issues API calls out of the mandated order across 100% of automated and manual test cases.
