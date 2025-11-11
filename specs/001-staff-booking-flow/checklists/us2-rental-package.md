# User Story 2 – Rental Package Preparation

## Manual QA Walkthrough

- [ ] From the fulfillment page, verify only the rental creation step is actionable after check-in
- [ ] Trigger rental creation and confirm success toast or timeline entry exposes the new `rentalId`
- [ ] Proceed to contract issuance, choose an e-sign provider, and confirm the `contractId` appears in the summary metadata
- [ ] Attempt to re-run contract issuance and ensure the UI prevents duplicate submissions while busy
- [ ] Complete the inspection form with battery level, timestamp, and evidence URL; verify optimistic status change and persisted inspection reference
- [ ] Refresh the page and validate rental, contract, and inspection artifacts remain visible with fulfilled badges
- [ ] Force an API failure on inspection submission and confirm error messaging plus retry affordance
- [ ] Confirm the next actionable step advances to renter signing after inspection success

## Evidence Log

- Notes: <!-- tester notes -->
