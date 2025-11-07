# Staff Dashboard Follow-up Improvements

This note captures quick enhancements identified during the review of commit f50a6f1b8ceb5b0b687557be13810605851a94a0.

## Issues Observed

- Modal overlay closes on any Enter/Space key press bubbling from descendants, making it impossible to activate buttons inside the detail drawer with the keyboard.
- When data refresh fails, the existing booking list is wiped, which creates unnecessary churn and hides potentially useful information from staff.
- The booking detail drawer does not manage focus (no focus is sent into the dialog and focus is not restored on close), creating accessibility gaps.

## Planned Fixes

1. Restrict the overlay key handling to the Escape key and keep click-to-close behaviour, preventing accidental closures while still supporting keyboard dismissal.
2. Preserve the previously loaded booking data if a refresh fails so staff can continue working with stale-but-usable data and still see the error message.
3. Add basic modal focus management: send focus to the drawer when it opens, trap the Escape key for dismissal, and return focus to the launch button after closing.
