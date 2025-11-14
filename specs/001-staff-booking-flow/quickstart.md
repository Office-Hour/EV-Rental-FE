# Quickstart: Staff Booking Fulfillment Workspace

## Bootstrapping the Flow

1. Ensure dependencies are installed with `pnpm install`.
2. Start the application locally via `pnpm start` and navigate to `http://localhost:4200/staff/bookings` using a staff account.
3. Open a booking that is deposit-paid and pending approval, then click **Tiếp tục xử lý** to reach `/staff/fulfillment/:bookingId`.

## Required API Sequence

Actions must execute in order; the UI blocks progression until each call succeeds.

1. `POST /api/Booking/checkin` — approve the booking (`BookingStatus.Approved`).
2. `POST /api/Rental` — create rental; capture returned `rentalId`.
3. `POST /api/Rental/contract` — generate contract; capture `contractId`.
4. `POST /api/Rental/inspection` — upload inspection details.
5. `POST /api/Rental/contract/sign` — call twice, first with role `renter`, then `staff`.
6. `POST /api/Rental/vehicle/receive` — mark vehicle handover complete.

All requests must use generated OpenAPI clients (`BookingService`, `RentalService`) and propagate identifiers stored in fulfillment step state.

## Validation Checklist

- Run `pnpm lint` and `pnpm lint-style` before submitting changes.
- Execute the manual QA script for each user story:
  - Confirm the checklist never enables a step prematurely.
- Document validation evidence in the pull request description.

## Troubleshooting

- If a step fails, retry logic should call the same endpoint once the error is resolved; inspect console logs for detailed `FulfillmentError` codes.
- Ensure staff identity (`staffId`) is available from the existing auth context; if missing, refresh tokens via `AuthService` utilities.
- When backend state changes outside the UI, reload the fulfillment route to resync signals.
