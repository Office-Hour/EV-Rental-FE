# User Story 1 – Booking Fulfillment Entry Validation

## Manual QA Walkthrough

- [ ] Launch local app with `pnpm start` and authenticate as staff user
- [ ] From `Bookings` dashboard, select an approved booking and open fulfillment route
- [ ] Confirm document title updates to "Xử lý đặt xe" (or localized equivalent)
- [ ] Verify initial focus moves to fulfillment page heading after navigation
- [ ] Check booking summary shows renter profile, vehicle, and booking metadata
- [ ] Validate fulfillment checklist locks steps other than check-in before completion
- [ ] Trigger check-in action and observe optimistic progress indicator
- [ ] Confirm success toast/banner copy and timeline entry appear after check-in
- [ ] Refresh browser tab; verify fulfillment state, timeline, and checklist persist
- [ ] Exercise error path by forcing API failure (mock/network) and confirm retry affordance

## Accessibility Validation

- [ ] AXE scan executed on fulfillment entry route (desktop viewport)
- [ ] Keyboard traversal covers all actionable elements without trap
- [ ] Focus outline visible on CTA, toggle buttons, and timeline interactions
- [ ] Heading structure announces page context to screen readers
- [ ] Live region (if any) announces success/error states without duplication

## Analytics Verification

- [ ] Observe `staff_booking_fulfillment_step_completed` with `step="checkin"`
- [ ] Observe `staff_booking_fulfillment_step_failed` when forcing API failure
- [ ] Confirm payload includes `bookingId`, `step`, `status`, and optional `durationMs`
- [ ] Capture screenshot or console export of analytics payloads for quickstart.md

## Evidence Log

- AXE report: <!-- link or path -->
- Console/network capture: <!-- link or path -->
- Notes: <!-- tester notes -->
