# User Story 1 – Booking Fulfillment Entry Validation

## Manual QA Walkthrough

- [ ] Launch local app with `pnpm start` and authenticate as staff user
- [ ] From `Bookings` dashboard, select an approved booking and open fulfillment route
- [ ] Confirm document title updates to "Xử lý đặt xe" (or localized equivalent)
- [ ] Check booking summary shows renter profile, vehicle, and booking metadata
- [ ] Validate fulfillment checklist locks steps other than check-in before completion
- [ ] Trigger check-in action and observe optimistic progress indicator
- [ ] Confirm success toast/banner copy and timeline entry appear after check-in
- [ ] Refresh browser tab; verify fulfillment state, timeline, and checklist persist
- [ ] Exercise error path by forcing API failure (mock/network) and confirm retry affordance

## Evidence Log

- Notes: <!-- tester notes -->
