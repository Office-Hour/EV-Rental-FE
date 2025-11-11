# Staff Booking Fulfillment Feature

This feature hosts the zoneless staff workflow for converting an approved booking into an active rental. All UI elements live under this folder and consume signal-backed orchestration from `core-logic/rental-fulfillment`.

## Planned Structure

- `booking-fulfillment.routes.ts` — lazy route definition guarded by staff roles and preloading booking context.
- `pages/fulfillment-page/` — shell page that renders the booking summary, milestone checklist, and action panels.
- `components/inspection-form/` — reactive form for pre-handover inspection capture (battery, odometer, notes, attachments).
- `components/signature-step/` — dual signature capture for renter and staff confirmation.
- `styles/` — scoped stylesheets for UI primitives shared across the page (kept minimal; prefer Tailwind utility classes where possible).

## Dependencies

- Consumes `FulfillmentStateStore` and `FulfillmentOrchestrator` signals for state, actions, and optimistic updates.
- Emits analytics events via `rental-fulfillment/fulfillment.analytics` helper.
- Reuses shared layout and toolbar provided by `layout/layout.ts` and the staff dashboard navigation signals.

## Validation Notes

- Route must set document title and move focus to the page heading on activation.
- All interactive elements require focus outlines and AXE validation records in `specs/001-staff-booking-flow/checklists/*`.
- Analytics payloads follow the `staff_booking_fulfillment_*` namespace with step identifiers from `FulfillmentStepId`.
